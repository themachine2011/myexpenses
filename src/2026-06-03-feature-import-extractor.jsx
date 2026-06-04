// AI Import — PDF / screenshot transaction extractor (UI).
//
// Renders two import buttons + a small settings strip (API key + model), and a
// review modal where the user edits, deletes, de-duplicates, and selects which
// extracted transactions to import. Confirmed rows go through the SAME
// `importTransactions` path as CSV/JSON, so they behave exactly like manual
// entries (Dashboard, Graphs, categories, currency all update automatically).

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useAppContext, CATEGORIES, DEFAULT_CATEGORY, generateId } from './context.jsx';
import { normalizeCategoryName, getCategoryDisplayName } from './2026-05-19-utils-category-colors.js';
import { buildDuplicateIndex, findDuplicate } from './2026-05-17-utils-duplicate-detection.js';
import {
  extractTransactions, ExtractError,
  MODEL_OPTIONS, DEFAULT_MODEL, ACCEPTED_EXTENSIONS,
} from './2026-06-03-utils-ai-extract.js';

const KEY_STORAGE = 'aurum.ai.key';
const MODEL_STORAGE = 'aurum.ai.model';
const LOW_CONFIDENCE = 0.6;

const readLS = (k, fallback = '') => {
  try { return (typeof window !== 'undefined' && window.localStorage.getItem(k)) || fallback; }
  catch { return fallback; }
};
const writeLS = (k, v) => {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(k, v); } catch { /* ignore */ }
};

const todayYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Build a local-time ISO date from YYYY-MM-DD (avoids the UTC "off by one day"
// trap that new Date('2026-06-01') causes in negative-offset timezones).
const ymdToISO = (ymd) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
  if (!m) return new Date().toISOString();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toISOString();
};

// Format an amount in its OWN currency (the stored ledger is BRL, but a review
// row may be a USD receipt we haven't converted yet).
const formatByCurrency = (amount, currency) => {
  const n = Number(amount) || 0;
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
};

// USD rows are converted to BRL at import (the ledger stores BRL). Needs a live
// FX rate; if missing we flag the row and leave it unchecked by default.
const storedAmountBRL = (row, fxRate) => {
  if (row.currency === 'USD') {
    return (Number(fxRate) > 0) ? row.amount * Number(fxRate) : row.amount;
  }
  return row.amount;
};

export const AiImportControls = () => {
  const { themeTokens, transactions, importTransactions, suggestCategory, fxRate, fxStatus } = useAppContext();

  const [apiKey, setApiKey] = useState(() => readLS(KEY_STORAGE));
  const [model, setModel] = useState(() => readLS(MODEL_STORAGE) || DEFAULT_MODEL);
  const [showSettings, setShowSettings] = useState(() => !readLS(KEY_STORAGE));
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [rows, setRows] = useState(null); // null = modal closed
  const [sourceName, setSourceName] = useState('');

  const pdfRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => { writeLS(KEY_STORAGE, apiKey); }, [apiKey]);
  useEffect(() => { writeLS(MODEL_STORAGE, model); }, [model]);

  const usdNoRate = !(Number(fxRate) > 0);

  // Turn raw extractor output into editable review rows (category guess +
  // duplicate flag computed once here).
  const buildRows = (rawRows) => {
    const index = buildDuplicateIndex(transactions);
    return rawRows.map((raw) => {
      let category = raw.category ? normalizeCategoryName(raw.category) : '';
      if (!category) category = (suggestCategory && suggestCategory(raw.description)) || DEFAULT_CATEGORY;
      category = normalizeCategoryName(category);
      const date = raw.date || todayYMD();
      const row = {
        _id: generateId(),
        keep: true,
        editing: false,
        date,
        description: raw.description,
        amount: raw.amount,
        currency: raw.currency,
        type: raw.type,
        category,
        paymentMethod: raw.paymentMethod || 'Debit/Cash',
        bank: raw.bank || '',
        confidence: raw.confidence,
      };
      const candidate = {
        date: ymdToISO(date),
        amount: storedAmountBRL(row, fxRate),
        description: row.description,
        paymentMethod: row.paymentMethod,
      };
      row.duplicate = !!findDuplicate(candidate, index);
      row.missingFx = row.currency === 'USD' && usdNoRate;
      // Default: skip likely duplicates and un-convertible USD rows.
      row.keep = !row.duplicate && !row.missingFx;
      return row;
    });
  };

  const handleFile = async (file, inputRef) => {
    if (inputRef?.current) inputRef.current.value = '';
    if (!file) return;
    setError('');
    setStatus('');
    setLoading(true);
    setSourceName(file.name || 'file');
    try {
      const { rows: rawRows } = await extractTransactions({ file, apiKey, model, categories: CATEGORIES });
      setRows(buildRows(rawRows));
    } catch (err) {
      const msg = err instanceof ExtractError ? err.message : (err?.message || 'Extraction failed.');
      setError(msg);
      // If the key is missing/invalid, pop the settings open so it's fixable.
      if (err instanceof ExtractError && (err.code === 'no_key' || err.code === 'auth')) setShowSettings(true);
    } finally {
      setLoading(false);
    }
  };

  const patchRow = (id, patch) => setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  const deleteRow = (id) => setRows((prev) => prev.filter((r) => r._id !== id));

  const keptCount = rows ? rows.filter((r) => r.keep).length : 0;

  const confirmImport = () => {
    const kept = (rows || []).filter((r) => r.keep);
    if (!kept.length) { setRows(null); return; }
    const list = kept.map((r) => ({
      id: generateId(),
      date: ymdToISO(r.date),
      type: r.type === 'income' ? 'income' : 'expense',
      amount: storedAmountBRL(r, fxRate),
      description: r.description,
      category: normalizeCategoryName(r.category),
      paymentMethod: r.paymentMethod || 'Debit/Cash',
      tags: ['imported', 'ai'],
    }));
    const result = importTransactions(list);
    const usdConverted = kept.filter((r) => r.currency === 'USD' && Number(fxRate) > 0).length;
    const parts = [`Imported ${result.added} transaction${result.added === 1 ? '' : 's'}`];
    if (result.duplicates) parts.push(`${result.duplicates} duplicate${result.duplicates === 1 ? '' : 's'} skipped`);
    if (result.invalid) parts.push(`${result.invalid} invalid`);
    if (usdConverted) parts.push(`${usdConverted} USD→BRL`);
    setStatus(parts.join(' · '));
    setRows(null);
  };

  // ---- styles ----
  const pill = (primary) => ({
    padding: '10px 18px',
    border: primary ? 'none' : `1px solid ${themeTokens.accent}`,
    borderRadius: 999,
    background: primary ? themeTokens.accent : 'transparent',
    color: primary ? '#0B0B0D' : themeTokens.accent,
    fontFamily: 'var(--font-body)', fontWeight: 700,
    fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
    cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
    transition: 'all 200ms',
  });
  const smallInput = {
    background: 'transparent',
    border: `1px solid ${themeTokens.hairline2}`,
    borderRadius: 8, padding: '8px 10px',
    color: themeTokens.text, fontSize: 13, fontFamily: 'var(--font-mono)', outline: 'none',
  };
  const mono10 = { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' };

  return (
    <>
      <button onClick={() => pdfRef.current?.click()} disabled={loading} style={pill(false)}>
        {loading ? 'Scanning…' : 'Import PDF'}
      </button>
      <button onClick={() => imgRef.current?.click()} disabled={loading} style={pill(false)}>
        Import Image
      </button>
      <button onClick={() => setShowSettings((s) => !s)} style={pill(false)} title="AI key & model">
        AI ⚙
      </button>
      <input ref={pdfRef} type="file" accept="application/pdf,.pdf" onChange={(e) => handleFile(e.target.files?.[0], pdfRef)} style={{ display: 'none' }} />
      <input ref={imgRef} type="file" accept={ACCEPTED_EXTENSIONS} onChange={(e) => handleFile(e.target.files?.[0], imgRef)} style={{ display: 'none' }} />

      {showSettings && (
        <div style={{ width: '100%', display: 'grid', gap: 8, marginTop: 4 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Anthropic API key (sk-ant-…)"
              style={{ ...smallInput, flex: 1, minWidth: 220 }}
            />
            <select value={model} onChange={(e) => setModel(e.target.value)} style={smallInput}>
              {MODEL_OPTIONS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div style={{ ...mono10, color: themeTokens.textDim, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
            🔒 Stored only in this browser, sent only to Anthropic when you scan. Don't use on a shared computer.
          </div>
        </div>
      )}

      {(status || error) && (
        <div style={{ width: '100%', ...mono10, color: error ? themeTokens.negative : themeTokens.textDim }}>
          {error || status}
        </div>
      )}

      {rows && (
        <ReviewModal
          rows={rows}
          sourceName={sourceName}
          themeTokens={themeTokens}
          fxRate={fxRate}
          fxStatus={fxStatus}
          keptCount={keptCount}
          patchRow={patchRow}
          deleteRow={deleteRow}
          onCancel={() => setRows(null)}
          onConfirm={confirmImport}
        />
      )}
    </>
  );
};

const ReviewModal = ({ rows, sourceName, themeTokens, fxRate, keptCount, patchRow, deleteRow, onCancel, onConfirm }) => {
  const cell = { padding: '10px 12px', borderBottom: `1px solid ${themeTokens.hairline}`, fontSize: 13, color: themeTokens.text, verticalAlign: 'middle' };
  const head = { padding: '10px 12px', borderBottom: `1px solid ${themeTokens.hairline}`, color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' };
  const editInput = { background: 'transparent', border: `1px solid ${themeTokens.hairline2}`, borderRadius: 6, padding: '5px 7px', color: themeTokens.text, fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none', width: '100%' };
  const badge = (bg, color, text) => (
    <span style={{ background: bg, color, borderRadius: 999, padding: '3px 8px', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{text}</span>
  );

  const statusBadge = (r) => {
    if (r.duplicate) return badge('rgba(224,122,110,0.15)', '#E07A6E', 'Duplicate');
    if (r.missingFx) return badge('rgba(245,158,11,0.15)', '#F59E0B', 'USD · no FX');
    if (r.confidence < LOW_CONFIDENCE) return badge('rgba(245,158,11,0.15)', '#F59E0B', `Low ${Math.round(r.confidence * 100)}%`);
    return badge('rgba(34,197,94,0.15)', '#22C55E', `${Math.round(r.confidence * 100)}%`);
  };

  const categoryOptions = useMemo(() => {
    const set = new Set(CATEGORIES);
    rows.forEach((r) => set.add(normalizeCategoryName(r.category)));
    return Array.from(set);
  }, [rows]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Review extracted transactions"
      style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{
        width: 'min(1080px, 100%)', maxHeight: '90vh', overflow: 'auto',
        background: themeTokens.surface, border: `1px solid ${themeTokens.hairline}`,
        borderRadius: 18, padding: 24,
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        boxShadow: themeTokens.isDark ? '0 30px 60px rgba(0,0,0,0.5)' : '0 20px 50px rgba(40,30,20,0.12)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', color: themeTokens.textDim }}>
              Review · {sourceName}
            </div>
            <div style={{ color: themeTokens.text, fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              {rows.length} found · {keptCount} selected
            </div>
            <div style={{ color: themeTokens.textDim, fontSize: 12, marginTop: 4 }}>
              Edit any field, untick rows you don't want, then import. Nothing is saved until you confirm.
            </div>
          </div>
          <button onClick={onCancel} aria-label="Close"
            style={{ background: 'transparent', border: `1px solid ${themeTokens.hairline}`, color: themeTokens.textDim, padding: '6px 12px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>

        <div style={{ height: 16 }} />
        <div style={{ overflowX: 'auto', border: `1px solid ${themeTokens.hairline}`, borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
            <thead>
              <tr style={{ background: themeTokens.surface2 }}>
                {['Keep', 'Date', 'Description', 'Amount', 'Curr', 'Category', 'Type', 'Status', ''].map((h, i) => (
                  <th key={i} style={head}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} style={{ opacity: r.keep ? 1 : 0.5, transition: 'opacity 150ms' }}>
                  <td style={{ ...cell, textAlign: 'center' }}>
                    <input type="checkbox" checked={r.keep} onChange={(e) => patchRow(r._id, { keep: e.target.checked })} aria-label="Keep this row" />
                  </td>
                  <td style={cell}>
                    {r.editing
                      ? <input type="date" value={r.date} onChange={(e) => patchRow(r._id, { date: e.target.value })} style={editInput} />
                      : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: themeTokens.textDim }}>{r.date}</span>}
                  </td>
                  <td style={{ ...cell, minWidth: 200 }}>
                    {r.editing
                      ? <input type="text" value={r.description} onChange={(e) => patchRow(r._id, { description: e.target.value })} style={editInput} />
                      : r.description}
                  </td>
                  <td style={{ ...cell, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {r.editing
                      ? <input type="number" inputMode="decimal" value={r.amount} onChange={(e) => patchRow(r._id, { amount: Number(e.target.value) })} style={{ ...editInput, textAlign: 'right' }} />
                      : (
                        <span style={{ fontFamily: 'var(--font-mono)' }}>
                          {formatByCurrency(r.amount, r.currency)}
                          {r.currency === 'USD' && Number(fxRate) > 0 && (
                            <span style={{ color: themeTokens.textDim, fontSize: 10, display: 'block' }}>
                              ≈ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.amount * Number(fxRate))}
                            </span>
                          )}
                        </span>
                      )}
                  </td>
                  <td style={cell}>
                    {r.editing
                      ? (
                        <select value={r.currency} onChange={(e) => patchRow(r._id, { currency: e.target.value })} style={editInput}>
                          <option value="BRL">BRL</option>
                          <option value="USD">USD</option>
                        </select>
                      )
                      : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.currency}</span>}
                  </td>
                  <td style={cell}>
                    {r.editing
                      ? (
                        <select value={normalizeCategoryName(r.category)} onChange={(e) => patchRow(r._id, { category: e.target.value })} style={editInput}>
                          {categoryOptions.map((c) => <option key={c} value={c}>{getCategoryDisplayName(c)}</option>)}
                        </select>
                      )
                      : <span style={{ fontSize: 12, color: themeTokens.textDim }}>{getCategoryDisplayName(r.category)}</span>}
                  </td>
                  <td style={cell}>
                    {r.editing
                      ? (
                        <select value={r.type} onChange={(e) => patchRow(r._id, { type: e.target.value })} style={editInput}>
                          <option value="expense">expense</option>
                          <option value="income">income</option>
                        </select>
                      )
                      : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: r.type === 'income' ? themeTokens.positive : themeTokens.textDim }}>{r.type}</span>}
                  </td>
                  <td style={cell}>{statusBadge(r)}</td>
                  <td style={{ ...cell, whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button onClick={() => patchRow(r._id, { editing: !r.editing })}
                      style={{ background: 'transparent', border: `1px solid ${themeTokens.hairline2}`, color: themeTokens.textDim, padding: '4px 9px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', marginRight: 6 }}>
                      {r.editing ? 'Done' : 'Edit'}
                    </button>
                    <button onClick={() => deleteRow(r._id)} aria-label="Delete row"
                      style={{ background: 'transparent', border: `1px solid ${themeTokens.hairline2}`, color: themeTokens.negative, padding: '4px 9px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer' }}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{ color: themeTokens.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            {rows.some((r) => r.missingFx) ? 'USD rows need a live FX rate to convert — fix the rate or untick them.' : 'Duplicates are unticked by default.'}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onCancel}
              style={{ background: 'transparent', border: `1px solid ${themeTokens.hairline2}`, color: themeTokens.textDim, padding: '10px 18px', borderRadius: 999, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={onConfirm} disabled={keptCount === 0}
              style={{ background: keptCount === 0 ? themeTokens.hairline2 : themeTokens.accent, border: 'none', color: '#0B0B0D', padding: '10px 18px', borderRadius: 999, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: keptCount === 0 ? 'not-allowed' : 'pointer', opacity: keptCount === 0 ? 0.6 : 1 }}>
              Import {keptCount} selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
