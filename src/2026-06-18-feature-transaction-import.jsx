// No-key transaction importer (UI).
//
// Reads a PDF or image fully on-device (pdf.js + Tesseract OCR — see
// 2026-06-18-utils-local-extract.js), then:
//   1. asks which payment method to use (every import),
//   2. shows a review table to edit / delete / add rows and fix flagged rows,
//   3. on confirm, sends the rows through the SAME importTransactions() path as
//      CSV/JSON, so the Dashboard, Graphs, Wallet and totals all update by
//      themselves.
//
// No API keys, no network — nothing about your file leaves the browser.

import React, { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext, CATEGORIES, DEFAULT_CATEGORY, generateId } from './context.jsx';
import { normalizeCategoryName, getCategoryDisplayName } from './2026-05-19-utils-category-colors.js';
import { buildDuplicateIndex, findDuplicate } from './2026-05-17-utils-duplicate-detection.js';
import { PAYMENT_METHODS } from './payment-methods.js';
import {
  extractTransactionsLocal, LocalExtractError, ACCEPTED_EXTENSIONS,
} from './2026-06-18-utils-local-extract.js';
import { isPostponedCard, cardPaymentISO, localMidnightISO } from './2026-06-19-utils-card-billing.js';

const LOW_CONFIDENCE = 0.6;
const IMPORT_OVERLAY_Z = 10000;

const ImportOverlayPortal = ({ children }) => {
  if (typeof document === 'undefined') return children;
  return createPortal(children, document.body);
};

const todayYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Local-time ISO from YYYY-MM-DD (avoids the UTC "off by one day" trap).
const ymdToISO = (ymd) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
  if (!m) return new Date().toISOString();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toISOString();
};

const formatByCurrency = (amount, currency) => {
  const n = Number(amount) || 0;
  if (currency === 'USD') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
};

// USD rows convert to BRL at import (the ledger stores BRL). Needs a live rate.
const storedAmountBRL = (row, fxRate) => {
  if (row.currency === 'USD') return (Number(fxRate) > 0) ? row.amount * Number(fxRate) : row.amount;
  return row.amount;
};

// Credit-card expense rows (e.g. Mercado Pago) are stored on the card's payment
// due date — the 10th of next month — keeping the real purchase day in
// `purchaseDate`. Everything else is stored on its own date.
const effectiveDates = (purchaseYMD, method, type) => {
  const ymd = purchaseYMD || todayYMD();
  if (type === 'expense' && isPostponedCard(method)) {
    const due = cardPaymentISO(ymd, method);
    if (due) return { date: due, purchaseDate: localMidnightISO(ymd) };
  }
  return { date: ymdToISO(ymd), purchaseDate: null };
};

const progressText = (info) => {
  if (!info) return 'Reading file…';
  switch (info.stage) {
    case 'pdf': return `Reading PDF text — page ${info.page}/${info.pages}…`;
    case 'ocr-page': return `Scanning page ${info.page}/${info.pages} with OCR…`;
    case 'ocr': return `Reading image${typeof info.progress === 'number' ? ` — ${Math.round(info.progress * 100)}%` : '…'}`;
    case 'parse': return 'Finding transactions…';
    default: return 'Reading file…';
  }
};

export const TransactionImportControls = () => {
  const { themeTokens, transactions, importTransactions, suggestCategory, categories, fxRate, fxStatus } = useAppContext();

  const [step, setStep] = useState('idle');     // 'idle' | 'method' | 'loading' | 'review'
  const [pendingFile, setPendingFile] = useState(null);
  const [bulkMethod, setBulkMethod] = useState(PAYMENT_METHODS[0].id);
  const [rows, setRows] = useState(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [importError, setImportError] = useState('');

  const fileRef = useRef(null);

  const usdNoRate = !(Number(fxRate) > 0);

  // Turn raw extractor output into editable review rows.
  const buildRows = (rawRows, method) => {
    const index = buildDuplicateIndex(transactions);
    return rawRows.map((raw) => {
      let category = raw.category ? normalizeCategoryName(raw.category) : '';
      if (!category) category = (suggestCategory && suggestCategory(raw.description)) || DEFAULT_CATEGORY;
      category = normalizeCategoryName(category);
      const row = {
        _id: generateId(),
        keep: true,
        editing: false,
        manual: false,
        methodTouched: false,
        date: raw.date || '',
        description: raw.description || '',
        amount: raw.amount,
        currency: raw.currency || 'BRL',
        type: raw.type === 'income' ? 'income' : 'expense',
        category,
        paymentMethod: method,
        confidence: raw.confidence,
        raw: raw.raw || '',
      };
      const candidate = {
        date: effectiveDates(row.date, row.paymentMethod, row.type).date,
        amount: storedAmountBRL(row, fxRate),
        description: row.description,
        paymentMethod: row.paymentMethod,
      };
      row.duplicate = !!findDuplicate(candidate, index);
      row.missingFx = row.currency === 'USD' && usdNoRate;
      row.keep = !row.duplicate && !row.missingFx && Number(row.amount) > 0;
      return row;
    });
  };

  const onPick = (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    setError('');
    setStatus('');
    setPendingFile(file);
    setStep('method');
  };

  const runExtraction = async () => {
    if (!pendingFile) return;
    setStep('loading');
    setProgress('Reading file…');
    setError('');
    try {
      const { rows: rawRows } = await extractTransactionsLocal({
        file: pendingFile,
        onProgress: (info) => setProgress(progressText(info)),
      });
      setRows(buildRows(rawRows, bulkMethod));
      setImportError('');
      setStep('review');
    } catch (err) {
      const msg = err instanceof LocalExtractError ? err.message : (err?.message || 'Could not read that file.');
      setError(msg);
      setStep('idle');
      setPendingFile(null);
    }
  };

  const cancelMethod = () => { setStep('idle'); setPendingFile(null); };

  const patchRow = (id, patch) => setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  const deleteRow = (id) => setRows((prev) => prev.filter((r) => r._id !== id));

  const addRow = () => setRows((prev) => [
    ...(prev || []),
    {
      _id: generateId(), keep: true, editing: true, manual: true, methodTouched: false,
      date: todayYMD(), description: '', amount: 0, currency: 'BRL', type: 'expense',
      category: DEFAULT_CATEGORY, paymentMethod: bulkMethod, confidence: 1, duplicate: false, missingFx: false, raw: '',
    },
  ]);

  // Changing the bulk method re-applies it to every row the user hasn't manually
  // overridden (spec: applies to all unless an individual row was changed).
  const applyBulkMethod = (method) => {
    setBulkMethod(method);
    setRows((prev) => (prev || []).map((r) => (r.methodTouched ? r : { ...r, paymentMethod: method })));
  };

  const keptCount = rows ? rows.filter((r) => r.keep).length : 0;

  const confirmImport = () => {
    setImportError('');
    const blockedFx = (r) => r.currency === 'USD' && !(Number(fxRate) > 0);
    const kept = (rows || []).filter((r) => r.keep);
    // Validate every kept row before saving anything.
    const broken = kept.filter((r) => !(Number(r.amount) > 0) || !r.paymentMethod);
    if (broken.length) {
      setImportError(`Fix ${broken.length} row${broken.length === 1 ? '' : 's'}: each needs an amount greater than zero and a payment method.`);
      return;
    }
    const importable = kept.filter((r) => !blockedFx(r));
    const skippedFx = kept.length - importable.length;
    if (!importable.length) {
      setStatus(skippedFx ? `Skipped ${skippedFx} USD row${skippedFx === 1 ? '' : 's'} — no FX rate available.` : 'Nothing selected to import.');
      setStep('idle'); setRows(null); setPendingFile(null);
      return;
    }
    const list = importable.map((r) => {
      const type = r.type === 'income' ? 'income' : 'expense';
      const { date, purchaseDate } = effectiveDates(r.date, r.paymentMethod, type);
      const row = {
        id: generateId(),
        date,
        type,
        amount: storedAmountBRL(r, fxRate),
        description: r.description,
        category: normalizeCategoryName(r.category),
        paymentMethod: r.paymentMethod,
        tags: ['imported', 'ocr'],
      };
      if (purchaseDate) row.purchaseDate = purchaseDate;
      return row;
    });
    const result = importTransactions(list);
    const usdConverted = importable.filter((r) => r.currency === 'USD' && Number(fxRate) > 0).length;
    const parts = [`Imported ${result.added} transaction${result.added === 1 ? '' : 's'}`];
    if (result.duplicates) parts.push(`${result.duplicates} duplicate${result.duplicates === 1 ? '' : 's'} skipped`);
    if (result.invalid) parts.push(`${result.invalid} invalid`);
    if (usdConverted) parts.push(`${usdConverted} USD→BRL`);
    if (skippedFx) parts.push(`${skippedFx} USD skipped (no FX)`);
    setStatus(parts.join(' · '));
    setStep('idle'); setRows(null); setPendingFile(null);
  };

  // ---- shared styles ----
  const tk = themeTokens;
  const pill = (primary, disabled) => ({
    padding: '10px 18px',
    border: primary ? 'none' : `1px solid ${tk.accent}`,
    borderRadius: 999,
    background: primary ? tk.accent : 'transparent',
    color: primary ? '#0B0B0D' : tk.accent,
    fontFamily: 'var(--font-body)', fontWeight: 700,
    fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
    cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.6 : 1,
    transition: 'all 200ms',
  });
  const mono10 = { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' };

  const loading = step === 'loading';

  return (
    <>
      <button onClick={() => fileRef.current?.click()} disabled={loading} style={pill(true, loading)}
        title="Import a PDF or image — read on-device, no API key">
        {loading ? 'Reading…' : 'Import PDF / Image'}
      </button>
      <input ref={fileRef} type="file" accept={ACCEPTED_EXTENSIONS} onChange={onPick} style={{ display: 'none' }} />

      {(status || error) && (
        <div style={{ width: '100%', ...mono10, color: error ? tk.negative : tk.textDim }}>
          {error || status}
        </div>
      )}

      {step === 'method' && (
        <MethodPrompt
          tk={tk}
          fileName={pendingFile?.name || 'file'}
          methods={PAYMENT_METHODS}
          value={bulkMethod}
          onPick={setBulkMethod}
          onCancel={cancelMethod}
          onContinue={runExtraction}
        />
      )}

      {step === 'loading' && <LoadingOverlay tk={tk} text={progress} fileName={pendingFile?.name || ''} />}

      {step === 'review' && rows && (
        <ReviewModal
          rows={rows}
          tk={tk}
          fxRate={fxRate}
          fxStatus={fxStatus}
          methods={PAYMENT_METHODS}
          categoriesList={categories}
          bulkMethod={bulkMethod}
          keptCount={keptCount}
          importError={importError}
          patchRow={patchRow}
          deleteRow={deleteRow}
          addRow={addRow}
          applyBulkMethod={applyBulkMethod}
          onCancel={() => { setStep('idle'); setRows(null); setPendingFile(null); }}
          onConfirm={confirmImport}
        />
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Step 1 — ask for a payment method (shown on every import)
// ---------------------------------------------------------------------------
const MethodPrompt = ({ tk, fileName, methods, value, onPick, onCancel, onContinue }) => (
  <ImportOverlayPortal>
    <div role="dialog" aria-modal="true" aria-label="Choose payment method"
    onClick={onCancel}
    style={{ position: 'fixed', inset: 0, zIndex: IMPORT_OVERLAY_Z, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', padding: 24 }}>
    <div onClick={(e) => e.stopPropagation()}
      style={{
        width: 'min(440px, 100%)', background: tk.surface, border: `1px solid ${tk.hairline}`,
        borderRadius: 18, padding: 24, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.5)' : '0 20px 50px rgba(40,30,20,0.12)',
      }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', color: tk.textDim }}>
        Import · {fileName}
      </div>
      <div style={{ color: tk.text, fontSize: 20, fontWeight: 700, marginTop: 6 }}>Which payment method?</div>
      <div style={{ color: tk.textDim, fontSize: 12, marginTop: 4, marginBottom: 16 }}>
        We'll apply it to every row. You can still change individual rows in the next step.
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {methods.map((m) => {
          const active = m.id === value;
          return (
            <button key={m.id} onClick={() => onPick(m.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                border: `1px solid ${active ? tk.accent : tk.hairline2}`,
                background: active ? `${tk.accent}1A` : 'transparent',
                color: tk.text, transition: 'all 160ms',
              }}>
              <span style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${active ? tk.accent : tk.hairline2}`,
                background: active ? tk.accent : 'transparent',
              }} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{m.label}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: tk.textDim, letterSpacing: '0.1em' }}>{m.id}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button onClick={onCancel}
          style={{ background: 'transparent', border: `1px solid ${tk.hairline2}`, color: tk.textDim, padding: '10px 18px', borderRadius: 999, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={onContinue}
          style={{ background: tk.accent, border: 'none', color: '#0B0B0D', padding: '10px 18px', borderRadius: 999, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer' }}>
          Read file
        </button>
      </div>
    </div>
    </div>
  </ImportOverlayPortal>
);

// ---------------------------------------------------------------------------
// Loading overlay (while pdf.js / OCR run)
// ---------------------------------------------------------------------------
const LoadingOverlay = ({ tk, text, fileName }) => (
  <ImportOverlayPortal>
    <div role="status" aria-live="polite"
    style={{ position: 'fixed', inset: 0, zIndex: IMPORT_OVERLAY_Z, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', padding: 24 }}>
    <div style={{
      width: 'min(380px, 100%)', background: tk.surface, border: `1px solid ${tk.hairline}`,
      borderRadius: 18, padding: 28, textAlign: 'center',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
    }}>
      <style>{`@keyframes tl_spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: 40, height: 40, margin: '0 auto 16px', borderRadius: '50%',
        border: `3px solid ${tk.hairline2}`, borderTopColor: tk.accent,
        animation: 'tl_spin 0.8s linear infinite',
      }} />
      <div style={{ color: tk.text, fontSize: 14, fontWeight: 600 }}>{text}</div>
      {fileName && <div style={{ color: tk.textDim, fontFamily: 'var(--font-mono)', fontSize: 11, marginTop: 6 }}>{fileName}</div>}
      <div style={{ color: tk.textDim, fontSize: 11, marginTop: 10 }}>Reading happens on your device — nothing is uploaded.</div>
    </div>
    </div>
  </ImportOverlayPortal>
);

// ---------------------------------------------------------------------------
// Step 2 — review table
// ---------------------------------------------------------------------------
const ReviewModal = ({
  rows, tk, fxRate, methods, categoriesList, bulkMethod, keptCount, importError,
  patchRow, deleteRow, addRow, applyBulkMethod, onCancel, onConfirm,
}) => {
  const cell = { padding: '9px 10px', borderBottom: `1px solid ${tk.hairline}`, fontSize: 13, color: tk.text, verticalAlign: 'middle' };
  const head = { padding: '9px 10px', borderBottom: `1px solid ${tk.hairline}`, color: tk.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' };
  const editInput = { background: 'transparent', border: `1px solid ${tk.hairline2}`, borderRadius: 6, padding: '5px 7px', color: tk.text, fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none', width: '100%' };
  const badge = (bg, color, text) => (
    <span style={{ background: bg, color, borderRadius: 999, padding: '3px 8px', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{text}</span>
  );

  const statusBadge = (r) => {
    if (r.duplicate) return badge('rgba(224,122,110,0.15)', '#E07A6E', 'Duplicate');
    if (r.missingFx) return badge('rgba(245,158,11,0.15)', '#F59E0B', 'USD · no FX');
    if (!(Number(r.amount) > 0)) return badge('rgba(224,122,110,0.15)', '#E07A6E', 'No amount');
    if (!r.date) return badge('rgba(245,158,11,0.15)', '#F59E0B', 'No date');
    if ((r.description || '').trim().length < 3) return badge('rgba(245,158,11,0.15)', '#F59E0B', 'Unclear');
    if (r.confidence < LOW_CONFIDENCE) return badge('rgba(245,158,11,0.15)', '#F59E0B', `Low ${Math.round(r.confidence * 100)}%`);
    return badge('rgba(34,197,94,0.15)', '#22C55E', `${Math.round((r.confidence || 1) * 100)}%`);
  };

  const categoryOptions = useMemo(() => {
    const set = new Set(CATEGORIES);
    (categoriesList || []).forEach((c) => set.add(normalizeCategoryName(c)));
    rows.forEach((r) => set.add(normalizeCategoryName(r.category)));
    return Array.from(set);
  }, [rows, categoriesList]);

  return (
    <ImportOverlayPortal>
      <div role="dialog" aria-modal="true" aria-label="Review extracted transactions"
      style={{ position: 'fixed', inset: 0, zIndex: IMPORT_OVERLAY_Z, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{
        width: 'min(1180px, 100%)', maxHeight: '90vh', overflow: 'auto',
        background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 18, padding: 24,
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        boxShadow: tk.isDark ? '0 30px 60px rgba(0,0,0,0.5)' : '0 20px 50px rgba(40,30,20,0.12)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', color: tk.textDim }}>
              Review extracted transactions
            </div>
            <div style={{ color: tk.text, fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              {rows.length} found · {keptCount} selected
            </div>
            <div style={{ color: tk.textDim, fontSize: 12, marginTop: 4 }}>
              Edit any field, untick rows you don't want, add missing ones. Nothing is saved until you confirm.
            </div>
          </div>
          <button onClick={onCancel} aria-label="Close"
            style={{ background: 'transparent', border: `1px solid ${tk.hairline}`, color: tk.textDim, padding: '6px 12px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>

        {/* bulk payment method */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tk.textDim }}>
            Payment method · applies to all
          </span>
          <select value={bulkMethod} onChange={(e) => applyBulkMethod(e.target.value)}
            style={{ ...editInput, width: 'auto', minWidth: 180 }}>
            {methods.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <button onClick={addRow}
            style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${tk.accent}`, color: tk.accent, padding: '8px 16px', borderRadius: 999, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer' }}>
            + Add row
          </button>
        </div>

        <div style={{ height: 14 }} />
        {rows.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: tk.textDim, fontSize: 13, border: `1px solid ${tk.hairline}`, borderRadius: 12 }}>
            No rows. Use “+ Add row” to enter one manually, or cancel.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: `1px solid ${tk.hairline}`, borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1040 }}>
              <thead>
                <tr style={{ background: tk.surface2 || 'transparent' }}>
                  {['Keep', 'Date', 'Description', 'Amount', 'Curr', 'Category', 'Type', 'Payment', 'Status', ''].map((h, i) => (
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
                        : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: r.date ? tk.textDim : tk.negative }}>{r.date || 'no date'}</span>}
                    </td>
                    <td style={{ ...cell, minWidth: 200 }}>
                      {r.editing
                        ? <input type="text" value={r.description} onChange={(e) => patchRow(r._id, { description: e.target.value })} placeholder="Description" style={editInput} />
                        : (r.description || <span style={{ color: tk.negative }}>—</span>)}
                    </td>
                    <td style={{ ...cell, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {r.editing
                        ? <input type="number" inputMode="decimal" step="0.01" value={r.amount} onChange={(e) => patchRow(r._id, { amount: Number(e.target.value) })} style={{ ...editInput, textAlign: 'right' }} />
                        : (
                          <span style={{ fontFamily: 'var(--font-mono)' }}>
                            {formatByCurrency(r.amount, r.currency)}
                            {r.currency === 'USD' && Number(fxRate) > 0 && (
                              <span style={{ color: tk.textDim, fontSize: 10, display: 'block' }}>
                                ≈ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.amount * Number(fxRate))}
                              </span>
                            )}
                          </span>
                        )}
                    </td>
                    <td style={cell}>
                      {r.editing
                        ? (
                          <select value={r.currency}
                            onChange={(e) => {
                              const currency = e.target.value;
                              const missingFx = currency === 'USD' && !(Number(fxRate) > 0);
                              patchRow(r._id, { currency, missingFx, keep: !r.duplicate && !missingFx && Number(r.amount) > 0 });
                            }}
                            style={editInput}>
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
                        : <span style={{ fontSize: 12, color: tk.textDim }}>{getCategoryDisplayName(r.category)}</span>}
                    </td>
                    <td style={cell}>
                      {r.editing
                        ? (
                          <select value={r.type} onChange={(e) => patchRow(r._id, { type: e.target.value })} style={editInput}>
                            <option value="expense">expense</option>
                            <option value="income">income</option>
                          </select>
                        )
                        : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: r.type === 'income' ? tk.positive : tk.textDim }}>{r.type}</span>}
                    </td>
                    <td style={cell}>
                      <select value={r.paymentMethod}
                        onChange={(e) => patchRow(r._id, { paymentMethod: e.target.value, methodTouched: true })}
                        style={{ ...editInput, minWidth: 130 }}>
                        {methods.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </select>
                    </td>
                    <td style={cell}>{statusBadge(r)}</td>
                    <td style={{ ...cell, whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <button onClick={() => patchRow(r._id, { editing: !r.editing })}
                        style={{ background: 'transparent', border: `1px solid ${tk.hairline2}`, color: tk.textDim, padding: '4px 9px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', marginRight: 6 }}>
                        {r.editing ? 'Done' : 'Edit'}
                      </button>
                      <button onClick={() => deleteRow(r._id)} aria-label="Delete row"
                        style={{ background: 'transparent', border: `1px solid ${tk.hairline2}`, color: tk.negative, padding: '4px 9px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer' }}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{ color: importError ? tk.negative : tk.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', maxWidth: 560 }}>
            {importError || (rows.some((r) => r.missingFx)
              ? 'USD rows need a live FX rate to convert — fix the rate or untick them.'
              : rows.some((r) => r.keep && r.type === 'expense' && isPostponedCard(r.paymentMethod))
              ? 'Mercado Pago rows will be scheduled for payment on the 10th of next month.'
              : 'Duplicates and zero-amount rows are unticked by default.')}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onCancel}
              style={{ background: 'transparent', border: `1px solid ${tk.hairline2}`, color: tk.textDim, padding: '10px 18px', borderRadius: 999, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={onConfirm} disabled={keptCount === 0}
              style={{ background: keptCount === 0 ? tk.hairline2 : tk.accent, border: 'none', color: '#0B0B0D', padding: '10px 18px', borderRadius: 999, fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: keptCount === 0 ? 'not-allowed' : 'pointer', opacity: keptCount === 0 ? 0.6 : 1 }}>
              Import {keptCount} selected
            </button>
          </div>
        </div>
      </div>
      </div>
    </ImportOverlayPortal>
  );
};

export default TransactionImportControls;
