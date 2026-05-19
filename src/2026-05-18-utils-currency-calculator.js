// Brazilian-locale number parsing + formatting helpers and a safe
// expression evaluator (shunting-yard → RPN). Used by the Dashboard
// Calculator. No eval, no Function — only a whitelisted tokenizer.

const DECIMAL_RE = /^\d{1,3}(?:\.\d{3})*(?:,\d+)?$|^\d+(?:[.,]\d+)?$/;

// Parse a BR-style number string to Number.
// Accepted forms:
//   "1234"            → 1234
//   "1234,56"         → 1234.56   (BR decimal)
//   "1234.56"         → 1234.56   (JS-style decimal, single dot, ≠ 3 trailing digits)
//   "1.234,56"        → 1234.56   (BR thousands + decimal)
//   "1.000"           → 1000      (BR thousands only — fixed: previously returned 1)
//   "1.000.000"       → 1000000   (BR thousands only — fixed: previously returned NaN)
// The disambiguation rule for "X.YYY" with no comma:
//   if YYY is exactly 3 digits → treat the dot as a thousands separator,
//   otherwise → treat as JS-style decimal.
export const parseBrNumber = (input) => {
  if (typeof input === 'number') return input;
  if (input == null) return NaN;
  const s = String(input).trim();
  if (!s) return NaN;
  if (!DECIMAL_RE.test(s)) {
    const flexible = s.replace(/\s/g, '');
    if (!/^-?\d+(?:[.,]\d+)?$/.test(flexible)) return NaN;
    return Number(flexible.replace(',', '.'));
  }
  let cleaned;
  if (s.indexOf(',') >= 0) {
    // BR canonical: dots are thousands, comma is decimal.
    cleaned = s.replace(/\./g, '').replace(',', '.');
  } else {
    // No comma. Could be:
    //   - JS-style decimal:        "1.5"     (1 digit after dot)
    //   - BR thousands grouping:   "1.000", "1.000.000"
    // The DECIMAL_RE already passed `^\d{1,3}(?:\.\d{3})*(?:,\d+)?$|^\d+(?:[.,]\d+)?$`,
    // so a string like "1.000.000" or any grouped form ends here. Strip dots
    // when the structure is exactly thousands-grouped; otherwise leave alone.
    const isGroupedThousands = /^\d{1,3}(?:\.\d{3})+$/.test(s);
    cleaned = isGroupedThousands ? s.replace(/\./g, '') : s;
  }
  return Number(cleaned);
};

// Format a number BR-style without the R$ prefix: 1234.56 → "1.234,56".
// Mirrors Intl.NumberFormat('pt-BR') without bringing in the full prefix.
export const fmtBr = (value, fractionDigits = 2) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0,00';
  const fixed = n.toFixed(fractionDigits);
  const [intPart, decPart] = fixed.split('.');
  const sign = intPart.startsWith('-') ? '-' : '';
  const abs = sign ? intPart.slice(1) : intPart;
  const withDots = abs.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}${withDots}${decPart ? ',' + decPart : ''}`;
};

// ----------------------------------------------------------------------------
// Expression evaluator (shunting-yard → RPN).
// Supports: numbers (BR or international), + − × ÷ * / unary ± parentheses,
// suffix % (treated as / 100), ^ (power), prefix unary √ (sqrt).
// Anything else → { ok: false, error }.
// ----------------------------------------------------------------------------

const TOKEN_TYPES = {
  NUMBER: 'number',
  OPERATOR: 'op',
  LEFT_PAREN: '(',
  RIGHT_PAREN: ')',
  FUNCTION: 'fn',
};

const PRECEDENCE = { '+': 1, '-': 1, '*': 2, '/': 2, '×': 2, '÷': 2, '%': 3, '^': 4, 'u-': 5, 'u+': 5 };
const RIGHT_ASSOC = new Set(['^', 'u-', 'u+']);

const ALLOWED_FUNCS = new Set(['sqrt', '√']);

const isDigit = (c) => c >= '0' && c <= '9';
const isOpChar = (c) => '+-*/×÷^%'.includes(c);

const tokenize = (input) => {
  const out = [];
  let i = 0;
  const s = String(input).trim();
  if (!s) return out;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if (c === '(') { out.push({ type: TOKEN_TYPES.LEFT_PAREN }); i++; continue; }
    if (c === ')') { out.push({ type: TOKEN_TYPES.RIGHT_PAREN }); i++; continue; }
    if (c === '√') { out.push({ type: TOKEN_TYPES.FUNCTION, value: 'sqrt' }); i++; continue; }
    // sqrt keyword
    if (s.slice(i, i + 4).toLowerCase() === 'sqrt') {
      out.push({ type: TOKEN_TYPES.FUNCTION, value: 'sqrt' });
      i += 4; continue;
    }
    if (isDigit(c) || c === '.' || c === ',') {
      // Read a number — allow . as thousands sep, , as decimal, or plain JS-style.
      let j = i;
      while (j < s.length && (isDigit(s[j]) || s[j] === '.' || s[j] === ',')) j++;
      const raw = s.slice(i, j);
      const n = parseBrNumber(raw);
      if (!Number.isFinite(n)) return { error: `Invalid number "${raw}"` };
      out.push({ type: TOKEN_TYPES.NUMBER, value: n });
      i = j; continue;
    }
    if (isOpChar(c)) {
      out.push({ type: TOKEN_TYPES.OPERATOR, value: c });
      i++; continue;
    }
    return { error: `Unexpected character "${c}"` };
  }
  return out;
};

const toRpn = (tokens) => {
  const out = [];
  const stack = [];
  let prev = null;
  for (const tok of tokens) {
    if (tok.type === TOKEN_TYPES.NUMBER) {
      out.push(tok);
      prev = tok;
      continue;
    }
    if (tok.type === TOKEN_TYPES.FUNCTION) {
      stack.push(tok);
      prev = tok;
      continue;
    }
    if (tok.type === TOKEN_TYPES.OPERATOR) {
      let op = tok.value;
      // Detect unary +/-
      const unary = !prev || prev.type === TOKEN_TYPES.OPERATOR || prev.type === TOKEN_TYPES.LEFT_PAREN;
      if (unary && (op === '-' || op === '+')) {
        op = op === '-' ? 'u-' : 'u+';
      }
      // Suffix %: pop operand → operand / 100
      if (op === '%') {
        // Treat as immediate divide by 100 of last value
        out.push({ type: TOKEN_TYPES.NUMBER, value: 100 });
        out.push({ type: TOKEN_TYPES.OPERATOR, value: '/' });
        prev = { type: TOKEN_TYPES.NUMBER };
        continue;
      }
      const prec = PRECEDENCE[op];
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.type === TOKEN_TYPES.LEFT_PAREN) break;
        const topOp = top.type === TOKEN_TYPES.FUNCTION ? 'fn' : top.value;
        const topPrec = top.type === TOKEN_TYPES.FUNCTION ? 99 : PRECEDENCE[topOp];
        if (topPrec > prec || (topPrec === prec && !RIGHT_ASSOC.has(op))) {
          out.push(stack.pop());
        } else break;
      }
      stack.push({ type: TOKEN_TYPES.OPERATOR, value: op });
      prev = { type: TOKEN_TYPES.OPERATOR };
      continue;
    }
    if (tok.type === TOKEN_TYPES.LEFT_PAREN) {
      stack.push(tok);
      prev = tok;
      continue;
    }
    if (tok.type === TOKEN_TYPES.RIGHT_PAREN) {
      while (stack.length && stack[stack.length - 1].type !== TOKEN_TYPES.LEFT_PAREN) {
        out.push(stack.pop());
      }
      if (!stack.length) return { error: 'Mismatched parentheses' };
      stack.pop();
      if (stack.length && stack[stack.length - 1].type === TOKEN_TYPES.FUNCTION) {
        out.push(stack.pop());
      }
      prev = tok;
      continue;
    }
  }
  while (stack.length) {
    const top = stack.pop();
    if (top.type === TOKEN_TYPES.LEFT_PAREN) return { error: 'Mismatched parentheses' };
    out.push(top);
  }
  return out;
};

const applyOp = (op, a, b) => {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': case '×': return a * b;
    case '/': case '÷': return b === 0 ? NaN : a / b;
    case '^': return Math.pow(a, b);
    default: return NaN;
  }
};

const evalRpn = (rpn) => {
  const stack = [];
  for (const tok of rpn) {
    if (tok.type === TOKEN_TYPES.NUMBER) {
      stack.push(tok.value);
      continue;
    }
    if (tok.type === TOKEN_TYPES.FUNCTION) {
      const a = stack.pop();
      if (tok.value === 'sqrt') {
        if (a < 0) return { error: '√ of a negative number' };
        stack.push(Math.sqrt(a));
        continue;
      }
      if (!ALLOWED_FUNCS.has(tok.value)) return { error: `Unknown function ${tok.value}` };
    }
    if (tok.type === TOKEN_TYPES.OPERATOR) {
      const op = tok.value;
      if (op === 'u-' || op === 'u+') {
        const a = stack.pop();
        if (a === undefined) return { error: 'Missing operand' };
        stack.push(op === 'u-' ? -a : a);
        continue;
      }
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) return { error: 'Missing operand' };
      stack.push(applyOp(op, a, b));
      continue;
    }
  }
  if (stack.length !== 1) return { error: 'Invalid expression' };
  const value = stack[0];
  if (!Number.isFinite(value)) return { error: 'Math error' };
  return { value };
};

export const evalExpression = (input) => {
  try {
    const tokens = tokenize(input);
    if (tokens && tokens.error) return { ok: false, error: tokens.error };
    if (!tokens.length) return { ok: false, error: 'Empty expression' };
    const rpn = toRpn(tokens);
    if (rpn && rpn.error) return { ok: false, error: rpn.error };
    const result = evalRpn(rpn);
    if (result.error) return { ok: false, error: result.error };
    return { ok: true, value: result.value };
  } catch (err) {
    return { ok: false, error: err.message || 'Invalid expression' };
  }
};
