// Local, no-API-key file -> text extractor for the transaction importer.
//
// PDFs:   pdf.js reads the embedded text layer (instant, accurate). Pages with
//         little/no text (scanned statements, photos saved as PDF) are rendered
//         to a canvas and run through OCR.
// Images: Tesseract.js OCR (fully offline — the engine + English language data
//         are bundled under /public/tesseract, nothing is fetched or uploaded).
//
// The extracted text is handed to the pure parseTransactionsFromText() to become
// editable review rows. Nothing here talks to any server.

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker } from 'tesseract.js';
import { parseTransactionsFromText } from './2026-06-18-utils-statement-parser.js';

// Point pdf.js at its bundled worker (Vite turns the ?url import into a local asset).
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const PDF_TYPE = 'application/pdf';
export const ACCEPTED_TYPES = [...IMAGE_TYPES, PDF_TYPE];
export const ACCEPTED_EXTENSIONS = '.pdf,.png,.jpg,.jpeg,.webp';
export const MAX_FILE_BYTES = 12 * 1024 * 1024; // 12 MB

// A page with fewer than this many letters/digits is treated as "scanned" and
// sent to OCR instead of trusting its (empty) text layer.
const MIN_TEXT_CHARS = 16;

export class LocalExtractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LocalExtractError';
    // 'format' | 'too_large' | 'empty_pdf' | 'unreadable' | 'ocr_failed' | 'no_data'
    this.code = code;
  }
}

const fileExtOk = (file) => {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  // Some browsers leave file.type blank — fall back to the extension.
  return /\.(pdf|png|jpe?g|webp)$/i.test(file.name || '');
};
const isPdf = (file) => file.type === PDF_TYPE || /\.pdf$/i.test(file.name || '');

// ---------------------------------------------------------------------------
// Tesseract OCR worker (created once, reused for the whole session).
// SIMD is detected so we load the fastest core the browser supports.
// ---------------------------------------------------------------------------
const SIMD_TEST = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);
const simdSupported = () => { try { return WebAssembly.validate(SIMD_TEST); } catch { return false; } };

let _workerPromise = null;
const getWorker = (onProgress) => {
  if (_workerPromise) return _workerPromise;
  const corePath = simdSupported()
    ? '/tesseract/core/tesseract-core-simd-lstm.wasm.js'
    : '/tesseract/core/tesseract-core-lstm.wasm.js';
  _workerPromise = createWorker('eng', 1, {
    workerPath: '/tesseract/worker.min.js',
    langPath: '/tesseract/lang',
    corePath,
    logger: (m) => {
      if (onProgress && m && m.status === 'recognizing text') {
        onProgress({ stage: 'ocr', progress: m.progress });
      }
    },
  }).catch((err) => {
    _workerPromise = null; // allow a retry on next import
    throw new LocalExtractError('ocr_failed', 'Could not start the offline OCR engine. Reload and try again.');
  });
  return _workerPromise;
};

const ocrImageLike = async (imageLike, onProgress) => {
  const worker = await getWorker(onProgress);
  try {
    const { data } = await worker.recognize(imageLike);
    return String(data?.text || '');
  } catch {
    throw new LocalExtractError('ocr_failed', 'OCR could not read that image. Try a clearer or higher-contrast picture.');
  }
};

// ---------------------------------------------------------------------------
// PDF -> text (text layer first, OCR fallback per scanned page)
// ---------------------------------------------------------------------------
const renderPdfPageToCanvas = async (page, scale = 2) => {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
};

const extractPdf = async (file, onProgress) => {
  let pdf;
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    pdf = await pdfjsLib.getDocument({ data }).promise;
  } catch {
    throw new LocalExtractError('unreadable', 'That PDF could not be opened. It may be corrupted or password-protected.');
  }
  if (!pdf || pdf.numPages === 0) {
    throw new LocalExtractError('empty_pdf', 'That PDF has no pages.');
  }

  const pageTexts = [];
  let usedOcr = false;
  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress && onProgress({ stage: 'pdf', page: i, pages: pdf.numPages });
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Reconstruct line breaks: pdf.js marks end-of-line items with hasEOL.
    let text = content.items.map((it) => (it.str || '') + (it.hasEOL ? '\n' : ' ')).join('');

    const density = text.replace(/[^a-z0-9]/gi, '').length;
    if (density < MIN_TEXT_CHARS) {
      // Scanned / image-only page — OCR it.
      usedOcr = true;
      onProgress && onProgress({ stage: 'ocr-page', page: i, pages: pdf.numPages });
      try {
        const canvas = await renderPdfPageToCanvas(page, 2);
        text = await ocrImageLike(canvas, onProgress);
      } catch (err) {
        if (err instanceof LocalExtractError) throw err;
        text = '';
      }
    }
    pageTexts.push(text);
  }
  return { text: pageTexts.join('\n'), usedOcr };
};

/**
 * Read a PDF or image and return editable transaction rows.
 * @param {{ file: File, onProgress?: (info:object)=>void }} args
 * @returns {Promise<{ rows: object[], meta: object }>}
 * @throws {LocalExtractError}
 */
export const extractTransactionsLocal = async ({ file, onProgress }) => {
  if (!file) throw new LocalExtractError('format', 'No file selected.');
  if (!fileExtOk(file)) {
    throw new LocalExtractError('format', 'Unsupported file. Use a PDF, PNG, JPG, or WEBP.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new LocalExtractError('too_large', 'File is over 12 MB. Use a smaller file or split it.');
  }

  let text = '';
  let usedOcr = false;
  if (isPdf(file)) {
    const res = await extractPdf(file, onProgress);
    text = res.text;
    usedOcr = res.usedOcr;
  } else {
    onProgress && onProgress({ stage: 'ocr', progress: 0 });
    text = await ocrImageLike(file, onProgress);
    usedOcr = true;
  }

  onProgress && onProgress({ stage: 'parse' });
  // Text-layer PDFs are high quality (~0.7 base); OCR output is noisier (~0.5).
  const { rows } = parseTransactionsFromText(text, { baseConfidence: usedOcr ? 0.5 : 0.7 });
  if (!rows.length) {
    throw new LocalExtractError('no_data', 'No transactions could be read from that file. Try a clearer image or a text-based PDF.');
  }
  return { rows, meta: { usedOcr, length: text.length } };
};

export default extractTransactionsLocal;
