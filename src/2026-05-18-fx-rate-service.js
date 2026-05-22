// Live FX rate service for the Wallet BRL ↔ USD click-flip feature.
// Fetches the current USD/BRL quote from AwesomeAPI (Brazilian Central-Bank
// derived) and picks the LOWEST USD-to-BRL rate from the payload so the
// displayed USD value is maximized — exactly what CLAUDE.md rule #26 asks for.
//
// Pure module, no React. Safe to import from anywhere.
//
// Cache key: `aurum.fx.v1`
// TTL:       30 minutes (the context layer re-fetches on that cadence).
//
// Public API:
//   - fetchUsdBrlRate()  → Promise<{ ok, rate, raw, error, fetchedAt }>
//   - readCachedRate()   → { rate, bid, ask, high, low, fetchedAt } | null
//   - writeCachedRate(p) → boolean
//   - RATE_TTL_MS        → 1800000

const FX_KEY = 'aurum.fx.v1';
const ENDPOINT = 'https://economia.awesomeapi.com.br/json/last/USD-BRL';

export const RATE_TTL_MS = 30 * 60 * 1000;

// AwesomeAPI returns: `{ "USDBRL": { code, codein, name, high, low, ... } }`
// (single-pair endpoint returns one object with the pair key).
// `bid` is the current buy price, `low` is today's lowest. The user-visible
// rule is "always use the lowest USD-to-BRL conversion rate", so we use
// `Math.min(bid, low)`. This guarantees the highest USD-equivalent displayed.
const pickLowestRate = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  // Endpoint may return either { USDBRL: {...} } or [ {...} ]; normalize.
  const entry = Array.isArray(payload) ? payload[0] : (payload.USDBRL || payload);
  if (!entry) return null;
  const bid = Number(entry.bid);
  const ask = Number(entry.ask);
  const high = Number(entry.high);
  const low = Number(entry.low);
  const candidates = [bid, ask, high, low].filter((n) => Number.isFinite(n) && n > 0);
  if (!candidates.length) return null;
  const rate = Math.min(...candidates);
  return {
    rate,
    bid: Number.isFinite(bid) ? bid : null,
    ask: Number.isFinite(ask) ? ask : null,
    high: Number.isFinite(high) ? high : null,
    low: Number.isFinite(low) ? low : null,
  };
};

export const fetchUsdBrlRate = async () => {
  try {
    if (typeof fetch !== 'function') {
      return { ok: false, error: 'fetch unavailable' };
    }
    const response = await fetch(ENDPOINT, { method: 'GET' });
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    const raw = await response.json();
    const picked = pickLowestRate(raw);
    if (!picked) return { ok: false, error: 'malformed FX payload' };
    const fetchedAt = Date.now();
    const payload = { ...picked, fetchedAt };
    return { ok: true, ...payload, raw };
  } catch (err) {
    return { ok: false, error: err?.message || 'network error' };
  }
};

export const readCachedRate = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(FX_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Number.isFinite(parsed.rate) || parsed.rate <= 0) return null;
    return parsed;
  } catch (_) {
    return null;
  }
};

export const writeCachedRate = (payload) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    if (!payload || !Number.isFinite(payload.rate)) return false;
    const safe = {
      rate: payload.rate,
      bid: payload.bid ?? null,
      ask: payload.ask ?? null,
      high: payload.high ?? null,
      low: payload.low ?? null,
      fetchedAt: Number.isFinite(payload.fetchedAt) ? payload.fetchedAt : Date.now(),
    };
    window.localStorage.setItem(FX_KEY, JSON.stringify(safe));
    return true;
  } catch (_) {
    return false;
  }
};

// Convenience: format a freshness label for the chip tooltip.
//   "refreshed 12 s ago" / "5 min ago" / "3 h ago" / "2 d ago"
export const formatAge = (ts, now = Date.now()) => {
  if (!Number.isFinite(ts)) return 'unknown';
  const diff = Math.max(0, now - ts);
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s} s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} d ago`;
};
