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
import { isPostponedCard, cardPaymentISO, localMidnightISO, monthlyPaymentISO, splitInstallmentAmounts } from './2026-06-19-utils-card-billing.js';

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

const isoToLocalYMD = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const buildInstallmentDrafts = (row, count) => {
  const installments = Math.max(1, Math.min(12, Number(count) || 1));
  return splitInstallmentAmounts(row.amount, installments).map((amount, index) => ({
    _id: generateId(),
    amount,
    paymentDate: row.date ? isoToLocalYMD(monthlyPaymentISO(row.date, index, 10)) : '',
    paymentMethod: row.paymentMethod,
  }));
};

const applyRowPatch = (row, patch) => {
  const next = { ...row, ...patch };
  if (next.type !== 'expense') return { ...next, installments: 1, installmentDrafts: [] };
  const drafts = Array.isArray(row.installmentDrafts) ? row.installmentDrafts : [];
  const scheduleChanged = drafts.length > 0
    && ['amount', 'date'].some((key) => Object.prototype.hasOwnProperty.call(patch, key));
  if (scheduleChanged) {
    return { ...next, installments: drafts.length, installmentDrafts: buildInstallmentDrafts(next, drafts.length) };
  }
  if (drafts.length > 0 && Object.prototype.hasOwnProperty.call(patch, 'paymentMethod')) {
    return {
      ...next,
      installmentDrafts: drafts.map((item) => ({ ...item, paymentMethod: next.paymentMethod })),
    };
  }
  return next;
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
        // No date on this line? Default to today so the import is never blocked
        // by a missing date (the row stays fully editable in the review table —
        // the date input is pre-filled with today and the user can correct it).
        date: raw.date || todayYMD(),
        description: raw.description || '',
        amount: raw.amount,
        currency: raw.currency || 'BRL',
        type: raw.type === 'income' ? 'income' : 'expense',
        category,
        paymentMethod: method,
        installments: 1,
        installmentDrafts: [],
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

  const patchRow = (id, patch) => setRows((prev) => prev.map((r) => (r._id === id ? applyRowPatch(r, patch) : r)));
  const deleteRow = (id) => setRows((prev) => prev.filter((r) => r._id !== id));

  const setInstallmentCount = (id, count) => setRows((prev) => prev.map((row) => {
    if (row._id !== id) return row;
    const installments = Math.max(1, Math.min(12, Number(count) || 1));
    return {
      ...row,
      installments,
      installmentDrafts: installments > 1 ? buildInstallmentDrafts(row, installments) : [],
    };
  }));

  const patchInstallment = (rowId, installmentId, patch) => setRows((prev) => prev.map((row) => (
    row._id === rowId
      ? { ...row, installmentDrafts: (row.installmentDrafts || []).map((item) => item._id === installmentId ? { ...item, ...patch } : item) }
      : row
  )));

  const deleteInstallment = (rowId, installmentId) => setRows((prev) => prev.map((row) => {
    if (row._id !== rowId) return row;
    const installmentDrafts = (row.installmentDrafts || []).filter((item) => item._id !== installmentId);
    return {
      ...row,
      installments: Math.max(1, installmentDrafts.length),
      installmentDrafts,
      keep: installmentDrafts.length > 0 ? row.keep : false,
    };
  }));

  const addRow = () => setRows((prev) => [
    ...(prev || []),
    {
      _id: generateId(), keep: true, editing: true, manual: true, methodTouched: false,
      date: todayYMD(), description: '', amount: 0, currency: 'BRL', type: 'expense',
      category: DEFAULT_CATEGORY, paymentMethod: bulkMethod, installments: 1, installmentDrafts: [], confidence: 1, duplicate: false, missingFx: false, raw: '',
    },
  ]);

  // Changing the bulk method re-applies it to every row the user hasn't manually
  // overridden (spec: applies to all unless an individual row was changed).
  const applyBulkMethod = (method) => {
    setBulkMethod(method);
    setRows((prev) => (prev || []).map((r) => (r.methodTouched ? r : applyRowPatch(r, { paymentMethod: method }))));
  };

  const keptCount = rows ? rows.filter((r) => r.keep).length : 0;

  const confirmImport = () => {
    setImportError('');
    const blockedFx = (r) => r.currency === 'USD' && !(Number(fxRate) > 0);
    const kept = (rows || []).filter((r) => r.keep);
    // Validate every kept row before saving anything.
    const broken = kept.filter((r) => !(Number(r.amount) > 0) || !r.paymentMethod || !r.date);
    if (broken.length) {
      setImportError(`Fix ${broken.length} row${broken.length === 1 ? '' : 's'}: each needs a purchase date, amount greater than zero, and payment method.`);
      return;
    }
    const brokenInstallments = kept.filter((r) => (r.installmentDrafts || []).some((item) =>
      !(Number(item.amount) > 0) || !item.paymentDate || !item.paymentMethod));
    if (brokenInstallments.length) {
      setImportError(`Fix the instalment schedule for ${brokenInstallments.length} purchase${brokenInstallments.length === 1 ? '' : 's'} before importing.`);
      return;
    }
    const importable = kept.filter((r) => !blockedFx(r));
    const skippedFx = kept.length - importable.length;
    if (!importable.length) {
      setStatus(skippedFx ? `Skipped ${skippedFx} USD row${skippedFx === 1 ? '' : 's'} — no FX rate available.` : 'Nothing selected to import.');
      setStep('idle'); setRows(null); setPendingFile(null);
      return;
    }
    const list = importable.flatMap((r) => {
      const type = r.type === 'income' ? 'income' : 'expense';
      const installmentDrafts = type === 'expense' && Array.isArray(r.installmentDrafts)
        ? r.installmentDrafts
        : [];
      if (installmentDrafts.length) {
        const groupId = generateId();
        const purchaseDate = localMidnightISO(r.date);
        return installmentDrafts.map((installment, index) => ({
          id: generateId(),
          groupId,
          date: ymdToISO(installment.paymentDate),
          purchaseDate,
          type: 'expense',
          amount: storedAmountBRL({ ...r, amount: installment.amount }, fxRate),
          description: installmentDrafts.length > 1
            ? `${r.description} \u00b7 ${index + 1}/${installmentDrafts.length}`
            : r.description,
          category: normalizeCategoryName(r.category),
          paymentMethod: installment.paymentMethod || r.paymentMethod,
          tags: ['imported', 'ocr', 'installment'],
        }));
      }
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
      return [row];
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
          setInstallmentCount={setInstallmentCount}
          patchInstallment={patchInstallment}
          deleteInstallment={deleteInstallment}
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
const InstallmentDraftEditor = ({ row, tk, methods, patchInstallment, deleteInstallment, setInstallmentCount }) => {
  const drafts = Array.isArray(row.installmentDrafts) ? row.installmentDrafts : [];
  const scheduledTotal = drafts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const originalTotal = Number(row.amount) || 0;
  const average = drafts.length ? scheduledTotal / drafts.length : 0;
  const mismatch = Math.abs(scheduledTotal - originalTotal) >= 0.005;
  const inputStyle = {
    width: '100%', background: 'transparent', border: `1px solid ${tk.hairline2}`,
    borderRadius: 7, padding: '7px 9px', color: tk.text, fontSize: 12,
    fontFamily: 'var(--font-mono)', outline: 'none', colorScheme: tk.isDark ? 'dark' : 'light',
  };
  const summary = [
    ['Original purchase date', row.date || 'Not set'],
    ['Original purchase value', formatByCurrency(originalTotal, row.currency)],
    ['Instalments', `${drafts.length}x`],
    ['Value / instalment', formatByCurrency(average, row.currency)],
    ['Payment method', row.paymentMethod],
  ];

  return (
    <div style={{ padding: 14, border: `1px solid ${tk.accent}55`, borderRadius: 12, background: tk.surface2 || 'transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ color: tk.accent, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Instalment schedule - payment dates stay separate from purchase date
        </div>
        <button type="button" onClick={() => setInstallmentCount(row._id, 1)}
          style={{ background: 'transparent', border: `1px solid ${tk.hairline2}`, color: tk.textDim, padding: '5px 10px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
          Use single payment
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginTop: 10 }}>
        {summary.map(([label, value]) => (
          <div key={label} style={{ padding: '9px 10px', border: `1px solid ${tk.hairline}`, borderRadius: 9 }}>
            <div style={{ color: tk.textDim, fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ color: tk.text, fontFamily: 'var(--font-mono)', fontSize: 12, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 7, marginTop: 10 }}>
        {drafts.map((installment, index) => (
          <div key={installment._id} style={{ display: 'grid', gridTemplateColumns: '54px 150px 140px minmax(170px, 1fr) auto', gap: 8, alignItems: 'center' }}>
            <span style={{ color: tk.accent, fontFamily: 'var(--font-mono)', fontSize: 10 }}>{index + 1}/{drafts.length}</span>
            <input type="date" value={installment.paymentDate || ''}
              onChange={(event) => patchInstallment(row._id, installment._id, { paymentDate: event.target.value })}
              aria-label={`Payment date for instalment ${index + 1}`} style={inputStyle} />
            <input type="number" inputMode="decimal" min="0.01" step="0.01" value={installment.amount}
              onChange={(event) => patchInstallment(row._id, installment._id, { amount: Number(event.target.value) })}
              aria-label={`Value for instalment ${index + 1}`} style={{ ...inputStyle, textAlign: 'right' }} />
            <select value={installment.paymentMethod || row.paymentMethod}
              onChange={(event) => patchInstallment(row._id, installment._id, { paymentMethod: event.target.value })}
              aria-label={`Payment method for instalment ${index + 1}`} style={inputStyle}>
              {methods.map((method) => <option key={method.id} value={method.id}>{method.label}</option>)}
            </select>
            <button type="button" onClick={() => deleteInstallment(row._id, installment._id)}
              style={{ background: 'transparent', border: `1px solid ${tk.hairline2}`, color: tk.negative, padding: '7px 10px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
              Remove
            </button>
          </div>
        ))}
      </div>
      <div style={{ color: mismatch ? tk.negative : tk.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 10 }}>
        Scheduled total - {formatByCurrency(scheduledTotal, row.currency)}{mismatch ? ' - differs from original value' : ''}
      </div>
    </div>
  );
};

const ReviewModal = ({
  rows, tk, fxRate, methods, categoriesList, bulkMethod, keptCount, importError,
  patchRow, setInstallmentCount, patchInstallment, deleteInstallment,
  deleteRow, addRow, applyBulkMethod, onCancel, onConfirm,
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
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1220 }}>
              <thead>
                <tr style={{ background: tk.surface2 || 'transparent' }}>
                  {['Keep', 'Date', 'Description', 'Amount', 'Curr', 'Category', 'Type', 'Payment', 'Instalments', 'Status', ''].map((h, i) => (
                    <th key={i} style={head}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <React.Fragment key={r._id}>
                  <tr style={{ opacity: r.keep ? 1 : 0.5, transition: 'opacity 150ms' }}>
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
                    <td style={cell}>
                      {r.type === 'expense' && r.editing ? (
                        <select value={Math.max(1, Number(r.installments) || 1)}
                          onChange={(event) => setInstallmentCount(r._id, event.target.value)}
                          style={{ ...editInput, minWidth: 92 }}>
                          {Array.from({ length: 12 }, (_, index) => index + 1).map((count) => (
                            <option key={count} value={count}>{count}x</option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ color: tk.textDim, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                          {r.type === 'expense' ? `${Math.max(1, Number(r.installments) || 1)}x` : '-'}
                        </span>
                      )}
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
                  {r.editing && r.type === 'expense' && (r.installmentDrafts || []).length > 0 && (
                    <tr>
                      <td colSpan={11} style={{ padding: '0 10px 12px', borderBottom: `1px solid ${tk.hairline}` }}>
                        <InstallmentDraftEditor
                          row={r}
                          tk={tk}
                          methods={methods}
                          patchInstallment={patchInstallment}
                          deleteInstallment={deleteInstallment}
                          setInstallmentCount={setInstallmentCount}
                        />
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{ color: importError ? tk.negative : tk.textDim, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', maxWidth: 560 }}>
            {importError || (rows.some((r) => r.missingFx)
              ? 'USD rows need a live FX rate to convert — fix the rate or untick them.'
              : rows.some((r) => r.keep && (r.installmentDrafts || []).length > 0)
              ? 'Instalments keep the original purchase date and use separate monthly payment dates.'
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
