// AI-powered transaction extractor.
//
// Sends a PDF or image straight to Anthropic's Messages API from the browser
// (using the user's own key + the official direct-browser-access header) and
// asks Claude to return the transactions it can read, as clean structured JSON.
//
// We force structured output with "tool use": Claude must fill in a
// `record_transactions` form, so we never have to guess-parse free text.
//
// This file has NO React and NO app-state dependencies on purpose — it's a
// pure helper so it can be tested and reused without dragging in the UI.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Max upload size. Anthropic accepts larger, but a personal receipt/statement
// is tiny — capping keeps a fat-finger upload from burning tokens or timing out.
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

// What we let the user pick. We send the file as an image block for pictures
// and a document block for PDFs.
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const PDF_TYPE = 'application/pdf';
export const ACCEPTED_TYPES = [...IMAGE_TYPES, PDF_TYPE];
export const ACCEPTED_EXTENSIONS = '.pdf,.png,.jpg,.jpeg,.webp,.gif';

// Model choices surfaced in the UI dropdown. Default is the most accurate.
export const MODEL_OPTIONS = [
  { id: 'claude-opus-4-8', label: 'Opus 4.8 · most accurate' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6 · balanced' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5 · cheapest' },
];
export const DEFAULT_MODEL = 'claude-opus-4-8';

// A small typed error so the UI can show a friendly, specific message.
export class ExtractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ExtractError';
    this.code = code; // 'format' | 'too_large' | 'no_key' | 'auth' | 'rate' | 'network' | 'no_data' | 'api'
  }
}

// Turn a File into a base64 string (no data: prefix) + its media type.
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new ExtractError('network', 'Could not read the file.'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve({ base64: comma >= 0 ? result.slice(comma + 1) : result, mediaType: file.type });
    };
    reader.readAsDataURL(file);
  });

// Reformat any date-ish value to YYYY-MM-DD, or '' if we can't.
const toYMD = (value) => {
  if (!value) return '';
  const s = String(value).trim();
  // Already YYYY-MM-DD?
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Make a positive number out of whatever the model returned. We ask for a plain
// number, but models sometimes hand back a formatted string — so we fall back
// to currency-aware parsing:
//   BRL "R$ 1.234,56"  → dot = thousands, comma = decimal
//   USD "$1,234.56"    → comma = thousands, dot = decimal
export const coerceAmount = (value, currency) => {
  if (typeof value === 'number' && isFinite(value)) return Math.abs(value);
  let s = String(value == null ? '' : value).trim();
  if (!s) return NaN;
  s = s.replace(/[^0-9.,-]/g, ''); // strip R$, $, spaces, letters
  if (String(currency).toUpperCase() === 'BRL') {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }
  const n = Number(s);
  return isFinite(n) ? Math.abs(n) : NaN;
};

// Clean one raw item from the model into a predictable shape.
const normalizeItem = (raw) => {
  const currency = String(raw?.currency || '').toUpperCase() === 'USD' ? 'USD' : 'BRL';
  const type = String(raw?.type || '').toLowerCase() === 'income' ? 'income' : 'expense';
  let confidence = Number(raw?.confidence);
  if (!isFinite(confidence)) confidence = 0.5;
  confidence = Math.max(0, Math.min(1, confidence));
  return {
    date: toYMD(raw?.date),
    description: String(raw?.description || '').trim(),
    amount: coerceAmount(raw?.amount, currency),
    currency,
    type,
    category: String(raw?.category || '').trim(),
    paymentMethod: String(raw?.paymentMethod || '').trim(),
    bank: String(raw?.bank || '').trim(),
    confidence,
  };
};

// The "form" we force Claude to fill in. tool_choice pins it to this tool, so
// the reply is always a structured tool_use block — never loose prose.
const buildTool = (categories) => ({
  name: 'record_transactions',
  description: 'Record every financial transaction you can read from the document or image.',
  input_schema: {
    type: 'object',
    properties: {
      transactions: {
        type: 'array',
        description: 'One entry per transaction found. Empty array if none.',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Transaction date as YYYY-MM-DD. Best guess if partially shown; omit if absent.' },
            description: { type: 'string', description: 'Merchant name or description.' },
            amount: { type: 'number', description: 'Positive amount as a number with a dot decimal (e.g. 1234.56).' },
            currency: { type: 'string', enum: ['BRL', 'USD'], description: 'BRL for R$, USD for $.' },
            type: { type: 'string', enum: ['income', 'expense'], description: 'income for money received/refunds/credits, expense otherwise.' },
            category: { type: 'string', description: `Best-fit category. Prefer one of: ${categories.join(', ')}.` },
            paymentMethod: { type: 'string', description: 'Card/account/method if visible (e.g. Visa, Nubank, Debit).' },
            bank: { type: 'string', description: 'Bank or account name if visible.' },
            confidence: { type: 'number', description: 'Your confidence 0..1 that this row is correct.' },
          },
          required: ['description', 'amount', 'currency', 'type'],
        },
      },
    },
    required: ['transactions'],
  },
});

const SYSTEM_PROMPT =
  'You read bank statements, receipts, invoices, and screenshots and extract the ' +
  'individual transactions. Infer the currency from symbols (R$ = BRL, $ = USD). ' +
  'Treat money leaving the account as "expense" and money received, refunds, or ' +
  'credits as "income". Do not invent transactions that are not clearly present. ' +
  'Always answer by calling the record_transactions tool.';

// Map an HTTP error response to a friendly ExtractError.
const errorFromStatus = (status, bodyText) => {
  if (status === 401) return new ExtractError('auth', 'Invalid API key. Check the key and try again.');
  if (status === 403) return new ExtractError('auth', 'This key is not allowed to use the selected model.');
  if (status === 413) return new ExtractError('too_large', 'The file is too large for the API. Try a smaller image or fewer pages.');
  if (status === 429) return new ExtractError('rate', 'Rate limit hit. Wait a moment and try again.');
  if (status >= 500) return new ExtractError('api', 'Anthropic had a temporary error. Try again shortly.');
  let detail = '';
  try { detail = JSON.parse(bodyText)?.error?.message || ''; } catch { /* ignore */ }
  return new ExtractError('api', detail || `Extraction failed (HTTP ${status}).`);
};

/**
 * Extract transactions from a single file.
 * @returns {Promise<{ rows: object[] }>}
 * @throws {ExtractError}
 */
export const extractTransactions = async ({ file, apiKey, model, categories = [] }) => {
  if (!apiKey || !apiKey.trim()) throw new ExtractError('no_key', 'Add your Anthropic API key first.');
  if (!file) throw new ExtractError('format', 'No file selected.');
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new ExtractError('format', 'Unsupported file. Use a PDF, PNG, JPG, WEBP, or GIF.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new ExtractError('too_large', 'File is over 5 MB. Use a smaller file.');
  }

  const { base64, mediaType } = await fileToBase64(file);

  // PDFs go in a "document" block; pictures go in an "image" block.
  const fileBlock = mediaType === PDF_TYPE
    ? { type: 'document', source: { type: 'base64', media_type: PDF_TYPE, data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };

  const body = {
    model: model || DEFAULT_MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    tools: [buildTool(categories)],
    tool_choice: { type: 'tool', name: 'record_transactions' },
    messages: [
      {
        role: 'user',
        content: [
          fileBlock,
          { type: 'text', text: 'Extract every transaction you can read and record them with the tool.' },
        ],
      },
    ],
  };

  let res;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': ANTHROPIC_VERSION,
        // Required to call the API straight from a browser.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ExtractError('network', 'Could not reach Anthropic. Check your internet connection.');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw errorFromStatus(res.status, text);
  }

  const data = await res.json().catch(() => null);
  const toolBlock = Array.isArray(data?.content)
    ? data.content.find((b) => b.type === 'tool_use' && b.name === 'record_transactions')
    : null;
  const list = toolBlock?.input?.transactions;

  if (!Array.isArray(list) || list.length === 0) {
    throw new ExtractError('no_data', 'No transactions were found in that file.');
  }

  // Keep only rows with a usable amount; everything else is normalized.
  const rows = list.map(normalizeItem).filter((r) => isFinite(r.amount) && r.amount > 0 && r.description);
  if (rows.length === 0) {
    throw new ExtractError('no_data', 'No clear transactions could be read from that file.');
  }
  return { rows };
};
