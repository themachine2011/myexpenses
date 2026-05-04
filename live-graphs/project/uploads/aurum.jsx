import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from 'react';
import {
  PlusCircle, Trash2, TrendingUp, TrendingDown, Activity, Wallet,
  CreditCard as CardIcon, ArrowRight, Clock, Repeat, Calendar as CalendarIcon,
  X, Target, PiggyBank, Search, Download, Upload, ArrowLeft, Wifi,
  AlertCircle, Edit3, Home, Layers, Flag, Zap, Check, Lock,
  ChevronLeft, ChevronRight, Percent, BarChart3, Bike, Building2, Gauge, Palette,
  Sparkles, MoreVertical, Users, Heart, Languages, Eye, EyeOff, MapPin, ShieldCheck, Sun, Moon, PieChart as PieChartIcon,
  Plus, BookOpen, Plane, Award
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie,
  LineChart, Line, Legend, ComposedChart, Sector,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const THEME = {
  light: {
    bg: '#fbfbfd',
    card: 'rgba(255, 255, 255, 0.7)',
    cardBorder: 'rgba(0, 0, 0, 0.06)',
    text: '#1d1d1f',
    textMuted: '#6e6e73',
    grid: 'rgba(0,0,0,0.06)',
    tooltipBg: 'rgba(255,255,255,0.95)',
    shadow: '0 10px 40px rgba(0,0,0,0.08)',
    buttonBg: 'rgba(0,0,0,0.04)',
    buttonHover: 'rgba(0,0,0,0.08)'
  },
  dark: {
    bg: '#1c1c1e',
    card: 'rgba(44, 44, 46, 0.55)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    text: '#f5f5f7',
    textMuted: '#98989d',
    grid: 'rgba(255,255,255,0.06)',
    tooltipBg: 'rgba(44,44,46,0.92)',
    shadow: '0 10px 40px rgba(0,0,0,0.5)',
    buttonBg: 'rgba(255,255,255,0.06)',
    buttonHover: 'rgba(255,255,255,0.12)'
  }
};

const COLORS = {
  red: '#ff3b30',
  yellow: '#ffcc00',
  green: '#34c759',
  blue: '#0071e3',
  purple: '#af52de',
  orange: '#ff9500',
  gray: '#8e8e93',
  bmwBlue: '#1C69D4'
};

const T = {
  en: {
    dashboard: 'Dashboard', costs: 'Costs', netWorth: 'Net Worth', cards: 'Cards',
    graph: 'Graph', timeline: 'Timeline',
    goals: 'Goals', motorcycle: 'Motorcycle', debts: 'Debts', transactions: 'Transactions',
    liquidIncome: 'Liquid Income', savingsRate: 'Savings Rate', cashFlow: 'Cash Flow',
    totalNetWorth: 'Total Net Worth', liquidNetWorth: 'Liquid Net Worth',
    assets: 'Assets', apartment: 'Apartment', location: 'Location', value: 'Value',
    rentalIncome: 'Rental Income', dueDate: 'Due Date', sqm: 'Sq Meters',
    financialHealth: 'Financial Health', healthy: 'Healthy', moderate: 'Moderate', critical: 'Critical',
    healthy_desc: 'Strong savings. Low debt exposure.',
    moderate_desc: 'Manageable. Watch discretionary spend.',
    critical_desc: 'High debt-to-income. Reduce expenses.',
    currentValue: 'Current Value', remainingBalance: 'Remaining Balance',
    totalFinancing: 'Total Financing', totalPaid: 'Total Paid', insurance: 'Insurance',
    pctIncome: '% of Income', showGoal: 'Show Goal', hideGoal: 'Hide Goal',
    income: 'Income', expenses: 'Expenses', tight: 'Tight', balance: 'Balance',
    totalOwed: 'Total Owed', breakdown: 'Breakdown', currentBill: 'Current Cycle',
    future: 'Future', total: 'Total', progress: 'Progress', remaining: 'Remaining',
    estTime: 'Est. Time', search: 'Search ledger...', newEntry: 'New Entry',
    addTransaction: 'Add Transaction', description: 'Description', amount: 'Amount',
    category: 'Category', paymentMethod: 'Payment', date: 'Date', cash: 'Cash',
    recentActivity: 'Recent Activity', viewAll: 'View all', target: 'Target Amount',
    save: 'Save', deleteConfirm: 'Delete transaction?', cancel: 'Cancel',
    delete: 'Delete', editTransaction: 'Edit Transaction', saveChanges: 'Save Changes',
    spendingByCategory: 'Spending by Category', projection: 'Financial Projection',
    goalTrajectory: 'Goal Trajectory', incomeImpact: 'Income Impact', forecast: 'Forecast',
    importCsv: 'Import CSV', exportCsv: 'Export CSV', clearHistory: 'Clear History',
    fixedCosts: 'Fixed Costs', variableCosts: 'Variable Costs',
    specifications: 'Specifications', installments: 'Installments', financing: 'Financing Plan',
    addDebt: 'Add Debt', newDebt: 'New Debt', creditorName: 'Creditor Name',
    newGoal: 'New Goal', title: 'Title', duration: 'Duration', price: 'Price',
    otherGoals: 'Other Goals', mainGoal: 'Main Goal',
    catCourse: 'Course', catAsset: 'Asset', catTrip: 'Trip', catAptAsset: 'Apartment',
    catBikeAsset: 'Motorcycle', catEurope: 'Europe', catUS: 'United States',
    brand: 'Brand', model: 'Model', horsepower: 'Horsepower', year: 'Year',
    color: 'Color', segment: 'Segment', mainUnit: 'Main Unit'
  },
  pt: {
    dashboard: 'Painel', costs: 'Custos', netWorth: 'Patrimônio', cards: 'Cartões',
    graph: 'Gráfico', timeline: 'Linha do Tempo',
    goals: 'Metas', motorcycle: 'Moto', debts: 'Dívidas', transactions: 'Transações',
    liquidIncome: 'Renda Líquida', savingsRate: 'Taxa de Poupança', cashFlow: 'Fluxo de Caixa',
    totalNetWorth: 'Patrimônio Total', liquidNetWorth: 'Patrimônio Líquido',
    assets: 'Ativos', apartment: 'Apartamento', location: 'Localização', value: 'Valor',
    rentalIncome: 'Renda de Aluguel', dueDate: 'Vencimento', sqm: 'Metros Quadrados',
    financialHealth: 'Saúde Financeira', healthy: 'Saudável', moderate: 'Moderado', critical: 'Crítico',
    healthy_desc: 'Poupança forte. Baixa exposição a dívidas.',
    moderate_desc: 'Gerenciável. Cuidado com gastos supérfluos.',
    critical_desc: 'Alta relação dívida-renda. Reduza despesas.',
    currentValue: 'Valor Atual', remainingBalance: 'Saldo Devedor',
    totalFinancing: 'Financiamento Total', totalPaid: 'Total Pago', insurance: 'Seguro',
    pctIncome: '% da Renda', showGoal: 'Mostrar Meta', hideGoal: 'Ocultar Meta',
    income: 'Renda', expenses: 'Despesas', tight: 'Apertado', balance: 'Saldo',
    totalOwed: 'Total Devido', breakdown: 'Detalhamento', currentBill: 'Fatura Atual',
    future: 'Futuro', total: 'Total', progress: 'Progresso', remaining: 'Restante',
    estTime: 'Tempo Est.', search: 'Buscar lançamentos...', newEntry: 'Nova Entrada',
    addTransaction: 'Adicionar', description: 'Descrição', amount: 'Valor',
    category: 'Categoria', paymentMethod: 'Pagamento', date: 'Data', cash: 'Dinheiro',
    recentActivity: 'Atividade Recente', viewAll: 'Ver tudo', target: 'Meta',
    save: 'Salvar', deleteConfirm: 'Excluir transação?', cancel: 'Cancelar',
    delete: 'Excluir', editTransaction: 'Editar Transação', saveChanges: 'Salvar',
    spendingByCategory: 'Gastos por Categoria', projection: 'Projeção Financeira',
    goalTrajectory: 'Trajetória da Meta', incomeImpact: 'Impacto na Renda', forecast: 'Previsão',
    importCsv: 'Importar CSV', exportCsv: 'Exportar CSV', clearHistory: 'Limpar Histórico',
    fixedCosts: 'Custos Fixos', variableCosts: 'Custos Variáveis',
    specifications: 'Especificações', installments: 'Parcelas', financing: 'Plano de Financiamento',
    addDebt: 'Adicionar Dívida', newDebt: 'Nova Dívida', creditorName: 'Nome do Credor',
    newGoal: 'Nova Meta', title: 'Título', duration: 'Duração', price: 'Preço',
    otherGoals: 'Outras Metas', mainGoal: 'Meta Principal',
    catCourse: 'Curso', catAsset: 'Bem', catTrip: 'Viagem', catAptAsset: 'Apartamento',
    catBikeAsset: 'Motocicleta', catEurope: 'Europa', catUS: 'Estados Unidos',
    brand: 'Marca', model: 'Modelo', horsepower: 'Potência', year: 'Ano',
    color: 'Cor', segment: 'Segmento', mainUnit: 'Unidade Principal'
  }
};

const AppContext = createContext();
const useAppContext = () => useContext(AppContext);

const formatBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const formatCompact = (v) => {
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return `R$ ${Math.round(v || 0)}`;
};
const generateId = () => `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getCardDates = (cardType) => cardType === 'VISA Mercado Pago' ? { close: 7, due: 15 } : { close: 8, due: 16 };
const getBillingMonth = (txDateStr, cardType) => {
  const d = new Date(txDateStr);
  const { close } = getCardDates(cardType);
  if (d.getDate() > close) return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

// -------------------------------------------------------------
// MOTORCYCLE FINANCING – FIXED, LOCKED TRANSACTIONS
// 36 monthly installments of R$ 2,191.00 starting May 2025.
// These are injected as "locked" transactions so they flow
// through all aggregations (Liquid Income, Financial Health,
// Cash Flow, Fixed Costs) natively but cannot be deleted.
// -------------------------------------------------------------
const MOTO_INSTALLMENT_AMOUNT = 2191;
const MOTO_INSTALLMENT_COUNT = 48;
const MOTO_START_YEAR = 2025;
const MOTO_START_MONTH = 5; // June (0-indexed) → last installment: May 2029
const MOTO_DUE_DAY = 18;

const generateMotoInstallments = () => {
  const out = [];
  for (let i = 0; i < MOTO_INSTALLMENT_COUNT; i++) {
    const d = new Date(MOTO_START_YEAR, MOTO_START_MONTH + i, MOTO_DUE_DAY);
    out.push({
      id: `moto-fin-${i + 1}`,
      description: `Moto Financing ${String(i + 1).padStart(2, '0')}/${MOTO_INSTALLMENT_COUNT}`,
      amount: MOTO_INSTALLMENT_AMOUNT,
      type: 'expense',
      category: 'Motorcycle',
      paymentMethod: 'Debit/Cash',
      date: d.toISOString(),
      isFixed: true,
      isRecurring: true,
      locked: true,
      installmentIndex: i + 1
    });
  }
  return out;
};

// -------------------------------------------------------------
// Debt installment generator — mirrors the motorcycle pattern.
// Given a debt plan {id, name, totalDebit, installmentCount,
// startDate, monthlyAmount}, emits N locked transactions dated
// one month apart. Each transaction:
//   • category: 'Debt Payment'  (picks up fixed-cost aggregations)
//   • locked: true              (protected from delete / clear)
//   • debtId: link back to plan
// Bank Balance only counts the current-month installment (same
// rule as motorcycle), so the remaining balance isn't deducted
// from cash all at once. Rounding: each installment is the
// truncated cents, the FINAL installment absorbs the drift so
// the sum equals totalDebit exactly.
// -------------------------------------------------------------
const generateDebtInstallments = (debt) => {
  const out = [];
  const total = Number(debt.totalDebit) || 0;
  const n = Math.max(1, Math.floor(Number(debt.installmentCount) || 1));
  const perMonth = Math.floor((total / n) * 100) / 100;
  const lastMonth = Math.round((total - perMonth * (n - 1)) * 100) / 100;
  const start = new Date(debt.startDate);
  if (isNaN(start.getTime())) return out;
  for (let i = 0; i < n; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
    out.push({
      id: `debt-${debt.id}-${i + 1}`,
      description: `${debt.name} ${String(i + 1).padStart(2, '0')}/${n}`,
      amount: i === n - 1 ? lastMonth : perMonth,
      type: 'expense',
      // Per-debt category so each debt appears as its own slice in the
      // category pie charts; keep 'Debt Payment' as a parent tag so
      // aggregated "Debt Payment" filters still catch it.
      category: `Debt: ${debt.name}`,
      parentCategory: 'Debt Payment',
      paymentMethod: 'Debit/Cash',
      date: d.toISOString(),
      isFixed: true,
      isRecurring: true,
      locked: true,
      debtId: debt.id,
      installmentIndex: i + 1
    });
  }
  return out;
};

// -------------------------------------------------------------
// Timeframe helpers — used by LiveCashWidget, Timeline tab, and
// anywhere else that needs a consistent "from / to" window.
// -------------------------------------------------------------
const TIMEFRAMES = {
  current:       { label: 'Current Month',      monthsBack: 0,  monthsForward: 1  },
  lastNext:      { label: 'Last + Next Month',  monthsBack: 1,  monthsForward: 2  },
  next3:         { label: 'Next 3 Months',      monthsBack: 0,  monthsForward: 3  },
  months6:       { label: '6 Months',           monthsBack: 0,  monthsForward: 6  },
  months12:      { label: '12 Months',          monthsBack: 0,  monthsForward: 12 },
  months36:      { label: '36 Months',          monthsBack: 0,  monthsForward: 36 }
};

const getTimeframeRange = (key) => {
  const tf = TIMEFRAMES[key] || TIMEFRAMES.current;
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - tf.monthsBack, 1);
  const to   = new Date(now.getFullYear(), now.getMonth() + tf.monthsForward, 1);
  return { from, to, label: tf.label };
};

// Accurate cash-flow across any window. Income and debit/cash expenses
// both respect the window. Locked installments are only counted if the
// installment date falls inside the window (same rule as before, but
// now the window is dynamic instead of hard-coded to "this month").
const computeBankBalance = (transactions, { from, to } = {}) => {
  const start = from ? new Date(from) : null;
  const end   = to   ? new Date(to)   : null;
  const inWindow = (d) => {
    if (start && d < start) return false;
    if (end && d >= end) return false;
    return true;
  };
  let cash = 0;
  transactions.forEach(tx => {
    const d = new Date(tx.date);
    if (tx.type === 'income') {
      if (inWindow(d)) cash += tx.amount;
      return;
    }
    if (tx.paymentMethod !== 'Debit/Cash') return;
    if (!inWindow(d)) return;
    cash -= tx.amount;
  });
  return cash;
};

const GlassCard = ({ children, className = '', delay = 0, onClick, hoverable = false }) => {
  const { themeTokens } = useAppContext();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={hoverable ? { y: -4, scale: 1.01 } : {}}
      onClick={onClick}
      className={`relative overflow-hidden backdrop-blur-3xl rounded-2xl border ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        background: themeTokens.card,
        borderColor: themeTokens.cardBorder,
        boxShadow: themeTokens.shadow,
        color: themeTokens.text,
        WebkitBackdropFilter: 'blur(30px)',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

const Label = ({ children, className = '' }) => {
  const { themeTokens } = useAppContext();
  return (
    <p className={`text-[10px] sm:text-[11px] uppercase tracking-widest font-semibold ${className}`} style={{ color: themeTokens.textMuted }}>
      {children}
    </p>
  );
};

const EMVChip = ({ size = 'md' }) => {
  const dim = size === 'sm' ? { w: 30, h: 22 } : { w: 40, h: 30 };
  return (
    <svg width={dim.w} height={dim.h} viewBox="0 0 40 30" fill="none" className="opacity-90">
      <rect width="40" height="30" rx="4" fill="url(#paint0_linear_chip)"/>
      <path d="M12 0V30M28 0V30M0 10H12M28 10H40M0 20H12M28 20H40" stroke="#B89B5E" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="12" y="8" width="16" height="14" rx="2" stroke="#B89B5E" strokeWidth="1.5"/>
      <defs>
        <linearGradient id="paint0_linear_chip" x1="0" y1="0" x2="40" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E2C78A"/><stop offset="0.5" stopColor="#D1B26F"/><stop offset="1" stopColor="#9C7A3C"/>
        </linearGradient>
      </defs>
    </svg>
  );
};

// --- RESPONSIVE CREDIT CARD ---------------------------------
// Aspect ratio (1.58:1) preserved exactly. What changes with
// viewport: padding, chip size, card-number font, name/type
// font, and "Total Spent" block. Uses clamp()-equivalent
// via responsive tailwind classes so the card reads well at
// 320px phones through widescreen.
// ------------------------------------------------------------
const CreditCardVisual = ({
  type = 'VISA',
  cardTheme = 'visa',           // 'visa' or 'mastercard'
  cardholderName = 'Laurencio Pereira',
  cardNumber = '1234',
  stats = { current: 0, future: 0, total: 0 },
  flipped,
  onFlip
}) => {
  const isVisa = cardTheme === 'visa';
  const handleFlip = () => { if (typeof onFlip === 'function') onFlip(!flipped); };

  return (
    <div style={{ perspective: '1000px' }} className="w-full max-w-[560px] mx-auto">
      <motion.div
        whileHover={{ scale: 1.02, rotateX: 5, rotateY: 5, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
        onClick={handleFlip}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-full aspect-[1.58/1] cursor-pointer rounded-[14px] sm:rounded-[18px] md:rounded-[20px] shadow-2xl"
      >
        {/* FRONT OF CARD */}
        <div className="absolute inset-0 rounded-[14px] sm:rounded-[18px] md:rounded-[20px] p-4 sm:p-5 md:p-6 lg:p-7 flex flex-col justify-between border"
          style={{
            backfaceVisibility: 'hidden',
            background: isVisa ? 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)' : 'linear-gradient(135deg, #820AD1 0%, #60079c 100%)',
            borderColor: isVisa ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'
          }}>
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-white/10 to-transparent pointer-events-none z-20 mix-blend-overlay rounded-[14px] sm:rounded-[18px] md:rounded-[20px]" />

          <div className="flex justify-between items-start z-30">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="scale-75 sm:scale-90 md:scale-100 origin-left">
                <EMVChip />
              </div>
              <Wifi className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white/70 rotate-90" />
            </div>
            <div className="text-right">
              {isVisa ? (
                <div className="bg-white/90 backdrop-blur-sm px-2 py-0.5 sm:px-3 sm:py-1 rounded shadow-md inline-block">
                  <span className="text-[#1A1F71] font-black text-base sm:text-lg md:text-xl italic tracking-wider">VISA</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-2 mr-1">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 rounded-full bg-[#EB001B] mix-blend-multiply opacity-90 shadow-sm"></div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 rounded-full bg-[#F79E1B] mix-blend-multiply opacity-90 shadow-sm"></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="z-30 mt-2 sm:mt-3 md:mt-4 mb-1 sm:mb-2 drop-shadow-md">
            <p className="font-mono text-sm sm:text-base md:text-xl lg:text-2xl tracking-[0.15em] sm:tracking-[0.2em] text-white/90">
              •••• •••• •••• {cardNumber}
            </p>
          </div>

          <div className="z-30 flex justify-between items-end gap-2 drop-shadow-md">
            <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
              <p className="text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-widest text-white/60 font-semibold truncate">{type}</p>
              <p className="text-[11px] sm:text-xs md:text-sm font-bold text-white tracking-widest uppercase truncate">{cardholderName}</p>
            </div>
            <div className="text-right space-y-0.5 sm:space-y-1 shrink-0">
               <p className="text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-widest text-white/60 font-semibold border-b border-white/20 pb-0.5">Total Spent</p>
               <p className="text-sm sm:text-base md:text-lg font-black text-white whitespace-nowrap">{formatBRL(stats?.total || 0)}</p>
            </div>
          </div>
        </div>

        {/* BACK OF CARD */}
        <div className="absolute inset-0 rounded-[14px] sm:rounded-[18px] md:rounded-[20px] overflow-hidden border"
          style={{
            backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
            background: isVisa ? 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)' : 'linear-gradient(135deg, #60079c 0%, #820AD1 100%)',
            borderColor: isVisa ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'
          }}>
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-white/10 to-transparent pointer-events-none z-20 mix-blend-overlay rounded-[14px] sm:rounded-[18px] md:rounded-[20px]" />
          <div className="absolute top-4 sm:top-5 md:top-6 left-0 right-0 h-6 sm:h-8 md:h-10 bg-black/80 z-10" />
          <div className="z-30 flex flex-col justify-end h-full p-3 sm:p-4 md:p-6 pt-12 sm:pt-16 md:pt-20">
             <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 bg-white/10 p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl backdrop-blur-sm border border-white/10">
               <div>
                 <p className="text-white/60 text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-widest font-semibold">Current Month</p>
                 <p className="text-[#ff3b30] font-bold text-sm sm:text-base md:text-lg whitespace-nowrap">{formatBRL(stats?.current || 0)}</p>
               </div>
               <div className="text-right">
                 <p className="text-white/60 text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-widest font-semibold">Future</p>
                 <p className="text-[#ffcc00] font-bold text-sm sm:text-base md:text-lg whitespace-nowrap">{formatBRL(stats?.future || 0)}</p>
               </div>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- InteractiveCreditCard: card + collapsible transaction list ---
// Wraps CreditCardVisual with a "See Details" toggle that expands
// to show the recent transactions for that card. Self-contained:
// owns its own flipped/showMore state, themed via `themeMode`.
// -------------------------------------------------------------------
const InteractiveCreditCard = ({
  type = 'VISA Mercado Pago',
  cardTheme = 'visa',
  cardholderName = 'Laurencio Pereira',
  cardNumber = '1234',
  stats = { current: 0, future: 0, total: 0, txs: [] },
  themeMode = 'dark'
}) => {
  const [flipped, setFlipped] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const dropdownColors = {
    bg: themeMode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    border: themeMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    text: themeMode === 'dark' ? '#f5f5f7' : '#1d1d1f',
    textMuted: themeMode === 'dark' ? '#86868b' : '#6e6e73'
  };

  return (
    <div className="space-y-4 w-full max-w-[560px] mx-auto">
      <CreditCardVisual
        type={type}
        cardTheme={cardTheme}
        cardholderName={cardholderName}
        cardNumber={cardNumber}
        stats={stats}
        flipped={flipped}
        onFlip={setFlipped}
      />

      <button
        onClick={() => setShowMore(!showMore)}
        className="w-full py-2.5 text-xs font-semibold rounded-full border transition-all duration-300 ease-out hover:scale-[1.01]"
        style={{
          borderColor: dropdownColors.border,
          background: dropdownColors.bg,
          color: dropdownColors.text
        }}
      >
        {showMore ? 'Hide Details' : 'See Details'}
      </button>

      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {stats.txs && stats.txs.map(tx => {
              const isFuture = new Date(tx.date) > new Date();
              return (
                <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl border"
                     style={{ background: dropdownColors.bg, borderColor: dropdownColors.border }}>
                  <span className="text-sm font-semibold truncate pr-2" style={{ color: dropdownColors.text }}>
                    {tx.description}
                  </span>
                  <span className={`text-sm font-bold whitespace-nowrap ${isFuture ? 'text-[#ffcc00]' : 'text-[#ff3b30]'}`}>
                    {formatBRL(tx.amount)}
                  </span>
                </div>
              );
            })}
            {(!stats.txs || stats.txs.length === 0) && (
              <p className="text-xs text-center p-3 rounded-xl border"
                 style={{ color: dropdownColors.textMuted, borderColor: dropdownColors.border, background: dropdownColors.bg }}>
                No recent transactions
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Backward-compat alias: some call sites still use CardWithDetails.
// Resolves cardTheme from the human-friendly `type` string and reads
// themeMode from AppContext so it stays in sync with the global toggle.
const CardWithDetails = ({ type, stats }) => {
  const { theme } = useAppContext();
  const cardTheme = /visa/i.test(type) ? 'visa' : 'mastercard';
  const cardNumber = /visa/i.test(type) ? '1234' : '5678';
  return (
    <InteractiveCreditCard
      type={type}
      cardTheme={cardTheme}
      cardNumber={cardNumber}
      stats={stats}
      themeMode={theme || 'dark'}
    />
  );
};

// --- BMW ROUNDEL (ultra-realistic SVG) ----------------------
// Authentic Bayerische Motoren Werke roundel:
//  • Deep-black outer ring with brushed/beveled depth
//  • Chrome-embossed "BMW" wordmark (not flat white)
//  • Proper blue #1C69D4 + off-white quadrants, canonical
//    arrangement: TL white, TR blue, BR white, BL blue
//  • Thin chrome cross at quadrant intersection
//  • Multi-layer specular highlights (top-left gloss + rim light)
//  • Subtle inner vignette for spherical depth
// ------------------------------------------------------------
const BMWLogo = ({ size = 240 }) => (
  <svg viewBox="0 0 200 200" width={size} height={size}
       style={{ filter: 'drop-shadow(0 14px 34px rgba(0,0,0,0.55)) drop-shadow(0 4px 10px rgba(28,105,212,0.25))' }}>
    <defs>
      {/* Outer black ring — deep brushed metallic, lit from top-left */}
      <radialGradient id="bmw-ring" cx="35%" cy="28%" r="90%">
        <stop offset="0%"  stopColor="#3a3a3d" />
        <stop offset="18%" stopColor="#1d1d1f" />
        <stop offset="55%" stopColor="#0a0a0a" />
        <stop offset="100%" stopColor="#000000" />
      </radialGradient>

      {/* Chrome bevel at outermost edge */}
      <linearGradient id="bmw-chrome-edge" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"  stopColor="#e8e8eb" />
        <stop offset="40%" stopColor="#9a9a9d" />
        <stop offset="60%" stopColor="#5a5a5c" />
        <stop offset="100%" stopColor="#1a1a1c" />
      </linearGradient>

      {/* Chrome bevel at inner ring edge */}
      <linearGradient id="bmw-chrome-inner" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"  stopColor="#2a2a2c" />
        <stop offset="45%" stopColor="#6a6a6d" />
        <stop offset="55%" stopColor="#c8c8cb" />
        <stop offset="100%" stopColor="#f0f0f3" />
      </linearGradient>

      {/* Blue quadrant — rich BMW Motorsport blue */}
      <radialGradient id="bmw-blue-q" cx="30%" cy="30%" r="110%">
        <stop offset="0%"  stopColor="#4aa3ff" />
        <stop offset="35%" stopColor="#1C69D4" />
        <stop offset="75%" stopColor="#0b4a9e" />
        <stop offset="100%" stopColor="#062a5c" />
      </radialGradient>

      {/* White quadrant — off-white with soft depth */}
      <radialGradient id="bmw-white-q" cx="30%" cy="30%" r="115%">
        <stop offset="0%"  stopColor="#ffffff" />
        <stop offset="55%" stopColor="#f1f3f6" />
        <stop offset="100%" stopColor="#c4c8ce" />
      </radialGradient>

      {/* Chrome for BMW letters — bright silver with dark shadow band */}
      <linearGradient id="bmw-letter-chrome" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"  stopColor="#fafafb" />
        <stop offset="30%" stopColor="#e2e2e5" />
        <stop offset="48%" stopColor="#9a9a9d" />
        <stop offset="52%" stopColor="#707073" />
        <stop offset="70%" stopColor="#bcbcbf" />
        <stop offset="100%" stopColor="#f4f4f6" />
      </linearGradient>

      {/* Specular top-left gloss */}
      <radialGradient id="bmw-gloss" cx="28%" cy="22%" r="55%">
        <stop offset="0%"  stopColor="rgba(255,255,255,0.55)" />
        <stop offset="45%" stopColor="rgba(255,255,255,0.12)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </radialGradient>

      {/* Bottom rim-light to suggest sphericity */}
      <radialGradient id="bmw-rim-light" cx="72%" cy="82%" r="45%">
        <stop offset="0%"  stopColor="rgba(255,255,255,0.28)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </radialGradient>

      {/* Inner vignette on quadrants — subtle bowl depth */}
      <radialGradient id="bmw-quad-shadow" cx="50%" cy="50%" r="55%">
        <stop offset="70%"  stopColor="rgba(0,0,0,0)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
      </radialGradient>

      {/* Emboss filter for the BMW wordmark */}
      <filter id="bmw-emboss" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="0.4" result="blur"/>
        <feSpecularLighting in="blur" surfaceScale="3" specularConstant="1.2"
                            specularExponent="20" lightingColor="#ffffff" result="spec">
          <feDistantLight azimuth="135" elevation="55"/>
        </feSpecularLighting>
        <feComposite in="spec" in2="SourceAlpha" operator="in" result="specOnText"/>
        <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="specOnText"/></feMerge>
      </filter>
    </defs>

    {/* ---- Outer chrome bevel ---- */}
    <circle cx="100" cy="100" r="99" fill="url(#bmw-chrome-edge)" />

    {/* ---- Main black ring body ---- */}
    <circle cx="100" cy="100" r="96.5" fill="url(#bmw-ring)" />

    {/* Fine brushed highlight lines on the ring (very subtle) */}
    <g opacity="0.18">
      <circle cx="100" cy="100" r="88" fill="none" stroke="#ffffff" strokeWidth="0.4" strokeDasharray="0.6 1.4" />
      <circle cx="100" cy="100" r="83" fill="none" stroke="#ffffff" strokeWidth="0.3" strokeDasharray="0.4 2" />
    </g>

    {/* ---- "BMW" wordmark at top — chrome embossed ---- */}
    <text x="100" y="20.5" textAnchor="middle"
          fill="url(#bmw-letter-chrome)"
          fontSize="15" fontWeight="900"
          fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
          letterSpacing="1.8"
          filter="url(#bmw-emboss)">BMW</text>
    {/* Soft inner shadow under the letters for grounding */}
    <text x="100" y="20.8" textAnchor="middle"
          fill="rgba(0,0,0,0.55)"
          fontSize="15" fontWeight="900"
          fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
          letterSpacing="1.8" opacity="0.35">BMW</text>

    {/* ---- Decorative chrome dots (left & right on the ring) ---- */}
    <circle cx="13" cy="100" r="2.2" fill="url(#bmw-chrome-edge)" />
    <circle cx="13" cy="100" r="1.1" fill="#ffffff" opacity="0.9" />
    <circle cx="187" cy="100" r="2.2" fill="url(#bmw-chrome-edge)" />
    <circle cx="187" cy="100" r="1.1" fill="#ffffff" opacity="0.9" />

    {/* ---- Inner chrome ring (bevel between black ring and quadrants) ---- */}
    <circle cx="100" cy="100" r="77" fill="none" stroke="url(#bmw-chrome-inner)" strokeWidth="2.2" />

    {/* ---- Quadrants ---- */}
    <g>
      <path d="M 100 24.5 A 75.5 75.5 0 0 0 24.5 100 L 100 100 Z" fill="url(#bmw-white-q)" />
      <path d="M 100 24.5 A 75.5 75.5 0 0 1 175.5 100 L 100 100 Z" fill="url(#bmw-blue-q)" />
      <path d="M 175.5 100 A 75.5 75.5 0 0 1 100 175.5 L 100 100 Z" fill="url(#bmw-white-q)" />
      <path d="M 24.5 100 A 75.5 75.5 0 0 0 100 175.5 L 100 100 Z" fill="url(#bmw-blue-q)" />
    </g>

    {/* Quadrant inner vignette (spherical bowl feel) */}
    <circle cx="100" cy="100" r="75.5" fill="url(#bmw-quad-shadow)" />

    {/* ---- Chrome cross at center (canonical BMW detail) ---- */}
    <line x1="24.5" y1="100" x2="175.5" y2="100" stroke="url(#bmw-chrome-inner)" strokeWidth="1.4" />
    <line x1="100" y1="24.5" x2="100" y2="175.5" stroke="url(#bmw-chrome-inner)" strokeWidth="1.4" />
    {/* Tiny chrome hub where lines cross */}
    <circle cx="100" cy="100" r="1.8" fill="url(#bmw-chrome-edge)" />

    {/* ---- Top-left specular gloss on the quadrants ---- */}
    <circle cx="100" cy="100" r="75.5" fill="url(#bmw-gloss)" style={{ mixBlendMode: 'screen' }} />

    {/* ---- Bottom rim-light ---- */}
    <circle cx="100" cy="100" r="75.5" fill="url(#bmw-rim-light)" style={{ mixBlendMode: 'screen' }} />

    {/* ---- Glass reflection highlight across the top ---- */}
    <path d="M 35 60 Q 100 25 165 60 Q 140 50 100 50 Q 60 50 35 60 Z"
          fill="rgba(255,255,255,0.22)" style={{ mixBlendMode: 'screen' }} />

    {/* ---- Outer micro-shadow to separate from background ---- */}
    <circle cx="100" cy="100" r="99" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="0.6" />
    <circle cx="100" cy="100" r="96.5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" />
  </svg>
);

// Apple Health-style: very subtle shadow, almost imperceptible. Keeps
// charts feeling flat and native, not webby. Used sparingly.
const shadowDefs = (
  <defs>
    <filter id="chart-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="rgba(0,0,0,0.08)" />
    </filter>
  </defs>
);

const RotatingCharts = ({ data, lines, timeRange, setTimeRange, tabs }) => {
  const { themeTokens } = useAppContext();
  const [chartIdx, setChartIdx] = useState(0);
  const chartTypes = ['Line', 'Bar', 'Stacked', 'Donut', 'Area'];

  const handlePrimaryClick = () => setChartIdx((prev) => (prev + 1) % chartTypes.length);

  const renderChart = (type, isPrimary) => {
    const height = isPrimary ? 300 : 120;
    const commonProps = { data, margin: { top: 10, right: 10, left: -20, bottom: 0 } };

    const dynamicShadowDefs = (
      <defs>
        {shadowDefs.props.children}
        {lines.map(line => (
          <linearGradient key={line.key} id={`grad-${line.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={line.color} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={line.color} stopOpacity={0}/>
          </linearGradient>
        ))}
      </defs>
    );

    const AxisComponents = isPrimary ? (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke={themeTokens.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: themeTokens.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: themeTokens.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: themeTokens.tooltipBg, backdropFilter: 'blur(20px)', borderColor: themeTokens.cardBorder, borderRadius: 16, color: themeTokens.text, boxShadow: themeTokens.shadow }} formatter={(v) => formatBRL(v)} />
        <Legend wrapperStyle={{ fontSize: 11, color: themeTokens.textMuted, paddingTop: 10 }} />
      </>
    ) : null;

    switch (type) {
      case 'Line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart {...commonProps}>
              {dynamicShadowDefs}
              {AxisComponents}
              {lines.map(line => <Line key={line.key} type="monotone" dataKey={line.key} stroke={line.color} strokeWidth={isPrimary ? 2.5 : 1.5} strokeLinecap="round" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: themeTokens.bg, fill: line.color }} />)}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'Bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart {...commonProps}>
              {dynamicShadowDefs}
              {AxisComponents}
              {lines.map(line => <Bar key={line.key} dataKey={line.key} fill={line.color} radius={[6, 6, 0, 0]} />)}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'Stacked':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart {...commonProps}>
              {dynamicShadowDefs}
              {AxisComponents}
              {lines.map(line => <Bar key={line.key} dataKey={line.key} stackId="a" fill={line.color} radius={[3, 3, 3, 3]} />)}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'Area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart {...commonProps}>
              {dynamicShadowDefs}
              {AxisComponents}
              {lines.map(line => <Area key={line.key} type="monotone" dataKey={line.key} stroke={line.color} fill={`url(#grad-${line.key})`} strokeWidth={isPrimary ? 2.5 : 1.5} strokeLinecap="round" />)}
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'Donut':
        const agg = lines.map(line => ({
          name: line.name || line.key,
          value: data.reduce((sum, d) => sum + (d[line.key] || 0), 0),
          color: line.color
        })).filter(d => d.value > 0);

        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              {dynamicShadowDefs}
              {isPrimary && <Tooltip contentStyle={{ background: themeTokens.tooltipBg, borderColor: themeTokens.cardBorder, borderRadius: 16, color: themeTokens.text }} formatter={(v)=>formatBRL(v)}/>}
              <Pie data={agg} innerRadius={isPrimary ? "62%" : "42%"} outerRadius={isPrimary ? "82%" : "82%"} dataKey="value" stroke={themeTokens.bg} strokeWidth={isPrimary ? 3 : 2} paddingAngle={2}>
                {agg.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              {isPrimary && <Legend wrapperStyle={{ fontSize: 11 }} />}
            </PieChart>
          </ResponsiveContainer>
        );
      default: return null;
    }
  };

  const primaryType = chartTypes[chartIdx];
  const secondaryType = chartTypes[(chartIdx + 1) % chartTypes.length];

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex justify-between items-center mb-2 gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {chartTypes.map((type, i) => (
            <button key={type} onClick={() => setChartIdx(i)} aria-label={`${type} chart`}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                background: i === chartIdx ? themeTokens.text : themeTokens.textMuted,
                opacity: i === chartIdx ? 1 : 0.3,
                transform: i === chartIdx ? 'scale(1.6)' : 'scale(1)'
              }} />
          ))}
          <span className="ml-2 text-[10px] uppercase tracking-widest font-bold" style={{ color: themeTokens.textMuted }}>
            {primaryType}
          </span>
        </div>
        {/* iOS Stocks-style segmented time range */}
        <div className="inline-flex p-0.5 rounded-[10px]" style={{ background: themeTokens.buttonBg }}>
          {(tabs || [3, 6, 12, 36]).map((m) => {
            const id    = typeof m === 'object' ? m.id    : m;
            const label = typeof m === 'object' ? m.label : `${m}M`;
            const active = timeRange === id;
            return (
              <button key={id} onClick={() => setTimeRange(id)}
                className="px-3 py-1 rounded-[8px] text-[11px] font-semibold transition-all"
                style={{
                  background: active ? themeTokens.bg : 'transparent',
                  color: active ? themeTokens.text : themeTokens.textMuted,
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08), 0 1px 1px rgba(0,0,0,0.04)' : 'none'
                }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="cursor-pointer relative z-10 transition-transform hover:scale-[1.005]" onClick={handlePrimaryClick}>
        {renderChart(primaryType, true)}
      </div>

      <div className="cursor-pointer opacity-40 hover:opacity-80 transition-all scale-95 origin-top mt-2" onClick={handlePrimaryClick}>
        <div className="text-center mb-1"><Label>Next · {secondaryType}</Label></div>
        {renderChart(secondaryType, false)}
      </div>
    </div>
  );
};

// =============================================================
// GHOST SIMULATOR — What-if playground
// -------------------------------------------------------------
// A "ghost" copy of the transaction data that users can poke
// with iOS Control Center-style sliders. Seeds from historical
// monthly AVERAGES (income / fixed / variable). Sliders mutate
// only this component's internal state — there is no path back
// to the app's transactions or netWorthState, so Net Worth is
// provably unaffected.
//
// Visual treatment: greyscale + reduced opacity so the main
// projection chart above remains dominant. On hover, opacity
// eases up a little so interaction doesn't feel like fighting
// the UI.
// =============================================================
const iosFmt = (v) => `R$ ${(v / 1000).toFixed(1)}k`;

// iOS Control Center-style vertical slider.
// - Thick, side-by-side rounded pillar (no visible thumb)
// - Fill rises from the bottom; height of fill == current value
// - Drag (pointer), scroll wheel, and tap-to-set all work
// - Tinted with an accent color that also drives the "shine"
const IOSSlider = ({ value, min, max, step = 50, onChange, accent, label, color }) => {
  const ref = useRef(null);
  const pct = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;

  const snap = (v) => {
    const clamped = Math.max(min, Math.min(max, v));
    const stepped = Math.round(clamped / step) * step;
    return Math.max(min, Math.min(max, stepped));
  };

  const valueFromPointer = (clientY) => {
    const el = ref.current;
    if (!el) return value;
    const rect = el.getBoundingClientRect();
    const ratio = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return snap(min + ratio * (max - min));
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    const el = ref.current;
    if (!el) return;
    el.setPointerCapture?.(e.pointerId);
    onChange(valueFromPointer(e.clientY));
    const move = (ev) => onChange(valueFromPointer(ev.clientY));
    const up = (ev) => {
      el.releasePointerCapture?.(ev.pointerId);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    // Scroll up = increase, scroll down = decrease. deltaY is positive when
    // scrolling down, so we subtract it.
    const delta = -Math.sign(e.deltaY) * step * 4;
    onChange(snap(value + delta));
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none" style={{ touchAction: 'none' }}>
      <div
        ref={ref}
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp')   { e.preventDefault(); onChange(snap(value + step)); }
          if (e.key === 'ArrowDown') { e.preventDefault(); onChange(snap(value - step)); }
        }}
        className="relative cursor-grab active:cursor-grabbing rounded-[28px] overflow-hidden shadow-inner transition-shadow duration-300 ease-out focus:outline-none focus:ring-2"
        style={{
          width: 56,
          height: 220,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.10)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Fill — rises from the bottom */}
        <motion.div
          animate={{ height: `${pct * 100}%` }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="absolute bottom-0 left-0 right-0"
          style={{
            background: `linear-gradient(180deg, ${accent}dd 0%, ${accent}aa 100%)`,
          }}
        >
          {/* Inner top-edge highlight ("shine") */}
          <div
            className="absolute top-0 left-1 right-1 h-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.45)', filter: 'blur(1px)' }}
          />
        </motion.div>
        {/* Glass sheen overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.15) 100%)',
          }}
        />
      </div>
      <div className="text-center">
        <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color }}>
          {label}
        </p>
        <p className="font-mono font-black text-sm mt-0.5" style={{ color }}>
          {iosFmt(value)}
        </p>
      </div>
    </div>
  );
};

const GhostSimulator = () => {
  const { transactions, themeTokens } = useAppContext();

  // --- Seed from historical monthly averages ----------------
  const defaults = useMemo(() => {
    const byMonth = {};
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!byMonth[key]) byMonth[key] = { income: 0, fixed: 0, variable: 0 };
      if (tx.type === 'income') byMonth[key].income += tx.amount;
      else if (tx.type === 'expense') {
        if (tx.isFixed || tx.isRecurring || tx.locked) byMonth[key].fixed += tx.amount;
        else byMonth[key].variable += tx.amount;
      }
    });
    const rows = Object.values(byMonth);
    const n = Math.max(1, rows.length);
    const sum = rows.reduce((a, r) => ({
      income: a.income + r.income,
      fixed: a.fixed + r.fixed,
      variable: a.variable + r.variable
    }), { income: 0, fixed: 0, variable: 0 });
    // Sensible fallbacks if no history exists yet
    const avgIncome   = rows.length ? sum.income   / n : 15000;
    const avgFixed    = rows.length ? sum.fixed    / n : 6000;
    const avgVariable = rows.length ? sum.variable / n : 4000;
    return {
      income:   Math.min(10000, Math.max(0, Math.round(avgIncome / 100) * 100)),
      fixed:    Math.min(10000, Math.max(0, Math.round(avgFixed / 100) * 100)),
      variable: Math.min(10000, Math.max(0, Math.round(avgVariable / 100) * 100)),
    };
  }, [transactions]);

  // --- Ghost state (entirely local; cannot touch Net Worth) -
  const [income, setIncome] = useState(defaults.income);
  const [fixed, setFixed] = useState(defaults.fixed);
  const [variable, setVariable] = useState(defaults.variable);
  const [hovered, setHovered] = useState(false);

  // Reseed when defaults change (e.g. after import)
  useEffect(() => { setIncome(defaults.income); }, [defaults.income]);
  useEffect(() => { setFixed(defaults.fixed); }, [defaults.fixed]);
  useEffect(() => { setVariable(defaults.variable); }, [defaults.variable]);

  const handleClear = () => {
    setIncome(defaults.income);
    setFixed(defaults.fixed);
    setVariable(defaults.variable);
  };

  const remaining = Math.max(0, income - fixed - variable);

  // --- Expense category breakdown from real transactions ----
  // Proportions come from historical expense data; amounts are
  // scaled by the CURRENT slider totals so the pie responds.
  const categoryPie = useMemo(() => {
    const buckets = {};
    transactions.filter(tx => tx.type === 'expense').forEach(tx => {
      const key = tx.category || 'General';
      buckets[key] = (buckets[key] || 0) + tx.amount;
    });
    const entries = Object.entries(buckets);
    if (entries.length === 0) {
      // Fallback: sensible starter mix
      return [
        { name: 'Rent',          value: (fixed + variable) * 0.35 },
        { name: 'Utilities',     value: (fixed + variable) * 0.15 },
        { name: 'Food',          value: (fixed + variable) * 0.20 },
        { name: 'Transport',     value: (fixed + variable) * 0.12 },
        { name: 'Entertainment', value: (fixed + variable) * 0.10 },
        { name: 'Other',         value: (fixed + variable) * 0.08 },
      ];
    }
    const total = entries.reduce((s, [, v]) => s + v, 0);
    const budget = fixed + variable;
    return entries
      .map(([name, v]) => ({ name, value: (v / total) * budget }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7); // keep the pie readable
  }, [transactions, fixed, variable]);

  // --- Flow (stacked bars, 6 months) ------------------------
  const flowData = useMemo(() => {
    const out = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      // Add a little deterministic wobble so the ghost doesn't feel static
      const wob = 1 + ((i % 3) - 1) * 0.08;
      out.push({
        name: d.toLocaleDateString('en-US', { month: 'short' }),
        income:   Math.round(income * wob),
        fixed:    Math.round(fixed * (2 - wob)),
        variable: Math.round(variable * wob),
      });
    }
    return out;
  }, [income, fixed, variable]);

  // --- Cumulative remaining (line) --------------------------
  const cumulativeData = useMemo(() => {
    let running = 0;
    return flowData.map(row => {
      running += (row.income - row.fixed - row.variable);
      return { name: row.name, remaining: Math.round(running) };
    });
  }, [flowData]);

  // --- Allocation donut (budget composition) ----------------
  const allocationData = [
    { name: 'Remaining', value: remaining,  color: COLORS.green  },
    { name: 'Fixed',     value: fixed,      color: COLORS.red    },
    { name: 'Variable',  value: variable,   color: COLORS.yellow },
  ].filter(d => d.value > 0);

  const pieColors = [COLORS.blue, COLORS.purple, COLORS.orange, COLORS.green, COLORS.yellow, COLORS.red, COLORS.gray];

  // --- Tooltip style match ----------------------------------
  const tooltipStyle = {
    background: themeTokens.tooltipBg,
    border: `1px solid ${themeTokens.cardBorder}`,
    borderRadius: 12,
    color: themeTokens.text,
    fontSize: 11,
    boxShadow: themeTokens.shadow,
  };

  // --- Ghost visual treatment -------------------------------
  const ghostFilter = hovered
    ? 'grayscale(0.15) opacity(0.92)'
    : 'grayscale(0.45) opacity(0.58)';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="transition-all duration-500 ease-out"
      style={{ filter: ghostFilter }}
    >
      <GlassCard className="p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} style={{ color: themeTokens.textMuted }} />
            <h3 className="text-lg font-bold tracking-tight">What-If Simulator</h3>
            <span className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full"
                  style={{ background: themeTokens.buttonBg, color: themeTokens.textMuted }}>
              Ghost · read-only
            </span>
          </div>
          <button
            onClick={handleClear}
            className="px-4 py-2 rounded-full text-xs font-bold border transition-all duration-300 ease-out hover:scale-[1.03] flex items-center gap-1.5"
            style={{ borderColor: themeTokens.cardBorder, background: themeTokens.buttonBg, color: themeTokens.text }}
          >
            <X size={13}/> Clear
          </button>
        </div>
        <p className="text-xs mb-6" style={{ color: themeTokens.textMuted }}>
          Drag, scroll, or tap the pillars. These numbers never touch your real data or Net Worth.
        </p>

        {/* Layout: sliders column + charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 lg:gap-8 items-start">

          {/* --- iOS Control Center-style sliders ----------- */}
          <div className="flex justify-center gap-3 sm:gap-4 p-4 rounded-2xl"
               style={{ background: themeTokens.buttonBg, border: `1px solid ${themeTokens.cardBorder}` }}>
            <IOSSlider
              label="Income"   color={COLORS.green}  accent={COLORS.green}
              value={income}   min={0} max={10000} step={100}
              onChange={(v) => setIncome(Math.min(10000, Math.max(0, v)))}
            />
            <IOSSlider
              label="Fixed"    color={COLORS.red}    accent={COLORS.red}
              value={fixed}    min={0} max={10000} step={100}
              onChange={(v) => setFixed(Math.min(10000, Math.max(0, v)))}
            />
            <IOSSlider
              label="Variable" color={COLORS.yellow} accent={COLORS.yellow}
              value={variable} min={0} max={10000} step={100}
              onChange={(v) => setVariable(Math.min(10000, Math.max(0, v)))}
            />
          </div>

          {/* --- 4-chart grid ------------------------------- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* 1. Budget allocation donut */}
            <div className="p-3 rounded-2xl" style={{ background: themeTokens.buttonBg }}>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: themeTokens.textMuted }}>
                Budget Allocation
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={allocationData} dataKey="value" innerRadius="55%" outerRadius="85%" stroke="none" paddingAngle={3}>
                    {allocationData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 2. Expense categories pie (from real transactions) */}
            <div className="p-3 rounded-2xl" style={{ background: themeTokens.buttonBg }}>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: themeTokens.textMuted }}>
                Expense Categories
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryPie} dataKey="value" nameKey="name" outerRadius="85%" stroke="none">
                    {categoryPie.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [formatBRL(v), n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 3. Monthly flow (stacked bars) */}
            <div className="p-3 rounded-2xl" style={{ background: themeTokens.buttonBg }}>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: themeTokens.textMuted }}>
                Monthly Flow
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={flowData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={themeTokens.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: themeTokens.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: themeTokens.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatBRL(v)} />
                  <Bar dataKey="fixed"    stackId="a" fill={COLORS.red}    radius={[0,0,0,0]} />
                  <Bar dataKey="variable" stackId="a" fill={COLORS.yellow} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 4. Cumulative remaining (area) */}
            <div className="p-3 rounded-2xl" style={{ background: themeTokens.buttonBg }}>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: themeTokens.textMuted }}>
                Cumulative Remaining
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={cumulativeData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ghost-rem-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"  stopColor={COLORS.green} stopOpacity={0.7}/>
                      <stop offset="100%" stopColor={COLORS.green} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={themeTokens.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: themeTokens.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: themeTokens.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatBRL(v)} />
                  <Area type="monotone" dataKey="remaining" stroke={COLORS.green} strokeWidth={2} fill="url(#ghost-rem-grad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

          </div>
        </div>
      </GlassCard>
    </div>
  );
};

// =============================================================
// DEEP DIVE — 3D carousel of six advanced analytics views.
// Rotates in a horizontal ring so the previous/next cards peek
// at the edges. Click a side card to bring it center, or use
// the Prev/Next pill controls. All six views derive their data
// from the live transaction store via useAppContext.
// =============================================================
const recTooltip = (themeTokens) => ({
  background: themeTokens.tooltipBg,
  border: `1px solid ${themeTokens.cardBorder}`,
  borderRadius: 12,
  color: themeTokens.text,
  fontSize: 11,
  boxShadow: themeTokens.shadow,
});

// -- 1. HEATMAP — category × week-of-month, top-5 categories ---
const HeatmapCard = () => {
  const { transactions, themeTokens } = useAppContext();
  const { grid, max, weeks, categories } = useMemo(() => {
    const now = new Date();
    const ms = new Date(now.getFullYear(), now.getMonth(), 1);
    const byCat = {};
    transactions.forEach(tx => {
      if (tx.type !== 'expense') return;
      const d = new Date(tx.date);
      if (d < ms || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return;
      const k = tx.category || 'Other';
      byCat[k] = (byCat[k] || 0) + tx.amount;
    });
    const top = Object.entries(byCat).sort((a,b) => b[1]-a[1]).slice(0, 5).map(([k]) => k);
    const g = {};
    top.forEach(c => { g[c] = [0,0,0,0]; });
    transactions.forEach(tx => {
      if (tx.type !== 'expense') return;
      const d = new Date(tx.date);
      if (d < ms || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return;
      const k = tx.category || 'Other';
      if (!top.includes(k)) return;
      const wk = Math.min(3, Math.floor((d.getDate() - 1) / 7));
      g[k][wk] += tx.amount;
    });
    let m = 0;
    Object.values(g).forEach(row => row.forEach(v => { if (v > m) m = v; }));
    return { grid: g, max: Math.max(m, 1), weeks: ['W1','W2','W3','W4'], categories: top };
  }, [transactions]);

  if (categories.length === 0) {
    return <p className="text-center text-xs mt-10" style={{ color: themeTokens.textMuted }}>No expenses this month yet.</p>;
  }

  const cellColor = (v) => {
    const pct = v / max;
    if (pct >= 0.66) return COLORS.red;
    if (pct >= 0.33) return COLORS.yellow;
    if (pct > 0) return COLORS.green;
    return themeTokens.buttonBg;
  };

  return (
    <div className="h-full grid gap-1.5" style={{ gridTemplateColumns: '90px repeat(4, 1fr)', gridTemplateRows: 'auto repeat(5, 1fr)' }}>
      <div />
      {weeks.map(w => (
        <div key={w} className="text-[10px] font-bold text-center self-center" style={{ color: themeTokens.textMuted }}>{w}</div>
      ))}
      {categories.map((cat) => (
        <React.Fragment key={cat}>
          <div className="text-[10px] font-semibold truncate pr-1 text-right self-center" style={{ color: themeTokens.textMuted }}>{cat}</div>
          {grid[cat].map((v, i) => (
            <div key={i} className="rounded-lg flex items-center justify-center text-[9px] font-bold text-white"
                 title={formatBRL(v)}
                 style={{
                   background: cellColor(v),
                   opacity: v === 0 ? 0.35 : 0.55 + 0.45 * (v / max),
                   textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                 }}>
              {v > 0 ? formatCompact(v) : '·'}
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};

// -- 2. WATERFALL — income sources → expenses → net savings ---
const WaterfallCard = () => {
  const { transactions, themeTokens } = useAppContext();
  const data = useMemo(() => {
    const now = new Date();
    const ms = new Date(now.getFullYear(), now.getMonth(), 1);
    const me = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const mTxs = transactions.filter(t => { const d = new Date(t.date); return d >= ms && d < me; });
    const incByCat = {};
    mTxs.filter(t => t.type === 'income').forEach(t => {
      const k = t.category || 'Salary';
      incByCat[k] = (incByCat[k] || 0) + t.amount;
    });
    const exp = mTxs.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
    const incEntries = Object.entries(incByCat).sort((a,b) => b[1]-a[1]).slice(0, 3);
    const totalInc = incEntries.reduce((s, [, v]) => s + v, 0);
    const net = totalInc - exp;
    let cum = 0;
    const greens = ['#1e5631', '#4c9a2a', '#76ba1b'];
    const bars = incEntries.map(([name, v], i) => {
      const s = cum; cum += v;
      return { name, range: [s, cum], value: v, fill: greens[i] || COLORS.green };
    });
    if (exp > 0) bars.push({ name: 'Expenses', range: [cum - exp, cum], value: exp, fill: COLORS.red });
    bars.push({ name: 'Net', range: [0, Math.max(0, net)], value: net, fill: COLORS.blue });
    return bars;
  }, [transactions]);

  if (data.length === 0) {
    return <p className="text-center text-xs mt-10" style={{ color: themeTokens.textMuted }}>No cash flow this month yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={themeTokens.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: themeTokens.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: themeTokens.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
        <Tooltip contentStyle={recTooltip(themeTokens)} formatter={(_, __, p) => [formatBRL(p.payload.value), p.payload.name]} cursor={{ fill: 'transparent' }} />
        <Bar dataKey="range" radius={[6,6,0,0]}>
          {data.map((e, i) => <Cell key={i} fill={e.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// -- 3. DISCRETIONARY SPEND — 6-month stacked bars ------------
const DiscretionaryCard = () => {
  const { transactions, themeTokens } = useAppContext();
  const DISCRETIONARY = ['Restaurants', 'Entertainment', 'Clothing', 'Travel', 'Zaffari'];
  const palette = ['#e67e22', '#9b59b6', COLORS.red, COLORS.yellow, COLORS.blue];

  const data = useMemo(() => {
    const out = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nx = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const row = { name: d.toLocaleDateString('en-US', { month: 'short' }) };
      DISCRETIONARY.forEach(c => { row[c] = 0; });
      transactions.forEach(tx => {
        if (tx.type !== 'expense') return;
        const td = new Date(tx.date);
        if (td < d || td >= nx) return;
        if (DISCRETIONARY.includes(tx.category)) row[tx.category] += tx.amount;
      });
      out.push(row);
    }
    return out;
  }, [transactions]);

  const hasAny = data.some(row => DISCRETIONARY.some(c => row[c] > 0));
  if (!hasAny) {
    return <p className="text-center text-xs mt-10" style={{ color: themeTokens.textMuted }}>No discretionary spend tracked yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={themeTokens.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: themeTokens.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: themeTokens.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
        <Tooltip contentStyle={recTooltip(themeTokens)} formatter={v => formatBRL(v)} cursor={{ fill: 'transparent' }} />
        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} iconType="circle" iconSize={7} />
        {DISCRETIONARY.map((c, i) => (
          <Bar key={c} dataKey={c} stackId="a" fill={palette[i]}
               radius={i === DISCRETIONARY.length - 1 ? [4,4,0,0] : 0} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

// -- 4. INCOME STABILITY — min/max range per source, avg dot ---
const StabilityCard = () => {
  const { transactions, themeTokens } = useAppContext();
  const sources = useMemo(() => {
    const monthly = {};
    transactions.filter(t => t.type === 'income').forEach(tx => {
      const td = new Date(tx.date);
      const mk = `${td.getFullYear()}-${td.getMonth()}`;
      const src = tx.category || 'Salary';
      if (!monthly[src]) monthly[src] = {};
      monthly[src][mk] = (monthly[src][mk] || 0) + tx.amount;
    });
    return Object.entries(monthly).map(([src, m]) => {
      const vs = Object.values(m);
      return {
        source: src,
        min: Math.min(...vs),
        max: Math.max(...vs),
        avg: vs.reduce((a,b) => a+b, 0) / vs.length,
      };
    }).sort((a,b) => b.avg - a.avg).slice(0, 5);
  }, [transactions]);

  if (sources.length === 0) {
    return <p className="text-center text-xs mt-10" style={{ color: themeTokens.textMuted }}>No income history yet.</p>;
  }

  const gMax = Math.max(1, ...sources.map(s => s.max));

  return (
    <div className="space-y-4 h-full flex flex-col justify-center">
      {sources.map((s) => {
        const minPct = (s.min / gMax) * 100;
        const rangePct = ((s.max - s.min) / gMax) * 100;
        const avgPct = (s.avg / gMax) * 100;
        return (
          <div key={s.source}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold truncate">{s.source}</span>
              <span className="font-mono font-bold text-xs" style={{ color: COLORS.green }}>
                avg {formatCompact(s.avg)}
              </span>
            </div>
            <div className="relative h-2 rounded-full" style={{ background: themeTokens.grid }}>
              <div className="absolute h-full rounded-full"
                   style={{
                     left: `${minPct}%`,
                     width: `${Math.max(2, rangePct)}%`,
                     background: `linear-gradient(90deg, ${COLORS.green}, #1e5631)`
                   }} />
              <div className="absolute rounded-full border-2"
                   style={{
                     left: `calc(${avgPct}% - 6px)`,
                     top: '-3px',
                     width: 12, height: 12,
                     background: '#fff',
                     borderColor: '#1e5631',
                     boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                   }} />
            </div>
            <div className="flex justify-between text-[9px] font-semibold mt-1" style={{ color: themeTokens.textMuted }}>
              <span>min {formatCompact(s.min)}</span>
              <span>max {formatCompact(s.max)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// -- 5. HEALTH RADAR — multi-dimensional financial score ------
const HealthRadarCard = () => {
  const { transactions, savingsTotal, themeTokens, ccStats } = useAppContext();
  const metrics = useMemo(() => {
    const now = new Date();
    const ms = new Date(now.getFullYear(), now.getMonth(), 1);
    const me = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const mTxs = transactions.filter(t => { const d = new Date(t.date); return d >= ms && d < me; });
    const inc = mTxs.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
    const exp = mTxs.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
    const fixed = mTxs.filter(t => t.type === 'expense' && (t.isFixed || t.isRecurring)).reduce((s,t) => s + t.amount, 0);
    const ccTotal = (ccStats['VISA Mercado Pago']?.total || 0) + (ccStats['Nubank MasterCard']?.total || 0);

    const savingsRate = inc > 0 ? Math.max(0, Math.min(100, ((inc - exp) / inc) * 100)) : 0;
    // Liquidity: months of expenses the savings pot covers, capped at 6 months = 100
    const liquidity = exp > 0 ? Math.min(100, (savingsTotal / exp) * (100 / 6)) : 75;
    const debtCtrl = inc > 0 ? Math.max(0, Math.min(100, 100 - (fixed / inc) * 100)) : 60;
    const cardDiscipline = inc > 0 ? Math.max(0, Math.min(100, 100 - (ccTotal / inc) * 100)) : 70;
    const incomeSources = new Set(mTxs.filter(t => t.type === 'income').map(t => t.category)).size;
    const diversity = Math.min(100, incomeSources * 34);

    return [
      { metric: 'Savings', value: Math.round(savingsRate) },
      { metric: 'Liquidity', value: Math.round(liquidity) },
      { metric: 'Debt Ctrl', value: Math.round(debtCtrl) },
      { metric: 'Card', value: Math.round(cardDiscipline) },
      { metric: 'Diversity', value: Math.round(diversity) },
    ];
  }, [transactions, savingsTotal, ccStats]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={metrics} outerRadius="78%">
        <PolarGrid stroke={themeTokens.grid} />
        <PolarAngleAxis dataKey="metric" tick={{ fill: themeTokens.textMuted, fontSize: 10, fontWeight: 600 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="value" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.25} strokeWidth={2} />
        <Tooltip contentStyle={recTooltip(themeTokens)} formatter={v => `${v}/100`} />
      </RadarChart>
    </ResponsiveContainer>
  );
};

// -- 6. TREEMAP — current-month category breakdown ------------
const CategoryTreemapCard = () => {
  const { transactions, themeTokens } = useAppContext();
  const cats = useMemo(() => {
    const now = new Date();
    const ms = new Date(now.getFullYear(), now.getMonth(), 1);
    const byCat = {};
    transactions.forEach(tx => {
      if (tx.type !== 'expense') return;
      const d = new Date(tx.date);
      if (d < ms) return;
      const k = tx.category || 'Other';
      byCat[k] = (byCat[k] || 0) + tx.amount;
    });
    const total = Object.values(byCat).reduce((s,v) => s+v, 0) || 1;
    return Object.entries(byCat).sort((a,b) => b[1]-a[1]).slice(0, 5)
      .map(([name, value]) => ({ name, value, pct: (value/total)*100 }));
  }, [transactions]);

  if (cats.length === 0) {
    return <p className="text-center text-xs mt-10" style={{ color: themeTokens.textMuted }}>No expenses this month yet.</p>;
  }

  const colors = ['#34495e', '#e67e22', '#9b59b6', COLORS.red, COLORS.gray];
  const layouts = [
    { gridRow: '1 / 3', gridColumn: '1' },
    { gridColumn: '2', gridRow: '1' },
    { gridColumn: '2', gridRow: '2' },
    { gridColumn: '3', gridRow: '1' },
    { gridColumn: '3', gridRow: '2' },
  ];

  return (
    <div className="h-full grid gap-2"
         style={{ gridTemplateColumns: '2fr 1.2fr 0.8fr', gridTemplateRows: '1fr 1fr' }}>
      {cats.map((c, i) => (
        <motion.div
          key={c.name}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22,1,0.36,1] }}
          className="rounded-2xl flex flex-col items-center justify-center text-center text-white p-3"
          style={{ ...layouts[i], background: colors[i] }}
          title={formatBRL(c.value)}
        >
          <span className="text-[11px] font-semibold mb-1 opacity-90 truncate max-w-full">{c.name}</span>
          <span className="text-2xl font-black leading-none">{c.pct.toFixed(0)}%</span>
          <span className="text-[10px] mt-1 opacity-70">{formatCompact(c.value)}</span>
        </motion.div>
      ))}
    </div>
  );
};

// -- DEEP DIVE CAROUSEL — 3D ring of 6 cards -------------------
// Center card is fully visible; prev/next cards peek at the
// edges because each sits on a 60° rotation at translateZ(R).
// Responsive: card width + radius scale to viewport so the
// carousel fits on phones without horizontal overflow.
const DeepDiveCarousel = () => {
  const { themeTokens } = useAppContext();
  const [idx, setIdx] = useState(0);
  const [size, setSize] = useState({ w: 520, h: 400, r: 560 });

  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth;
      if (vw < 640)       setSize({ w: 280, h: 340, r: 300 });
      else if (vw < 1024) setSize({ w: 440, h: 380, r: 480 });
      else                setSize({ w: 540, h: 420, r: 600 });
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  const cards = [
    { id: 'heatmap',       title: 'Expense Intensity',   subtitle: 'Category × week',              icon: Gauge,       render: () => <HeatmapCard /> },
    { id: 'waterfall',     title: 'Income Waterfall',    subtitle: 'Sources → expenses → net',     icon: TrendingUp,  render: () => <WaterfallCard /> },
    { id: 'discretionary', title: 'Discretionary Spend', subtitle: 'Non-essentials · 6 months',    icon: Sparkles,    render: () => <DiscretionaryCard /> },
    { id: 'stability',     title: 'Income Stability',    subtitle: 'Min · avg · max per source',   icon: Activity,    render: () => <StabilityCard /> },
    { id: 'radar',         title: 'Health Radar',        subtitle: 'Five-axis financial score',    icon: ShieldCheck, render: () => <HealthRadarCard /> },
    { id: 'treemap',       title: 'Category Breakdown',  subtitle: 'This month · top 5',           icon: PieChartIcon, render: () => <CategoryTreemapCard /> },
  ];
  const total = cards.length;
  const anglePer = 360 / total;
  const normalizedIdx = ((idx % total) + total) % total;
  const current = cards[normalizedIdx];

  const rotate = (dir) => setIdx(v => v + dir);
  const goTo = (target) => {
    let diff = target - normalizedIdx;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    setIdx(v => v + diff);
  };

  return (
    <GlassCard className="p-6 sm:p-8">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Layers size={20} color={COLORS.blue} />
          <h3 className="text-xl font-bold tracking-tight">Deep Dive</h3>
        </div>
        <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full"
              style={{ background: themeTokens.buttonBg, color: themeTokens.textMuted }}>
          {normalizedIdx + 1} / {total} · {current.title}
        </span>
      </div>
      <p className="text-xs mb-6" style={{ color: themeTokens.textMuted }}>
        Tap a side card to pull it center, or use Prev / Next to cycle.
      </p>

      <div className="relative mx-auto overflow-hidden" style={{ perspective: '1600px', height: size.h + 40 }}>
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: size.w,
            height: size.h,
            marginLeft: -size.w / 2,
            marginTop: -size.h / 2,
            transformStyle: 'preserve-3d',
            transform: `translateZ(${-size.r}px) rotateY(${-idx * anglePer}deg)`,
            transition: 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {cards.map((c, i) => {
            const Icon = c.icon;
            const active = i === normalizedIdx;
            return (
              <div
                key={c.id}
                onClick={() => goTo(i)}
                className="absolute top-0 left-0 rounded-[24px] border overflow-hidden cursor-pointer"
                style={{
                  width: size.w,
                  height: size.h,
                  transform: `rotateY(${i * anglePer}deg) translateZ(${size.r}px)`,
                  backfaceVisibility: 'hidden',
                  background: themeTokens.card,
                  borderColor: themeTokens.cardBorder,
                  boxShadow: active
                    ? `0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px ${themeTokens.cardBorder}`
                    : themeTokens.shadow,
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  opacity: active ? 1 : 0.78,
                  transition: 'opacity 0.5s ease, box-shadow 0.5s ease',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <div className="relative z-10 p-5 sm:p-6 flex flex-col h-full">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                         style={{ background: `${COLORS.blue}20`, color: COLORS.blue }}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold tracking-tight truncate" style={{ color: themeTokens.text }}>
                        {c.title}
                      </h4>
                      <p className="text-[10px] uppercase tracking-widest font-semibold truncate"
                         style={{ color: themeTokens.textMuted }}>
                        {c.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0">{c.render()}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* iOS-style pill controls — Prev, dot pager, Next */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 mt-6">
        <button
          onClick={() => rotate(-1)}
          aria-label="Previous"
          className="w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 ease-out hover:scale-[1.06] active:scale-95"
          style={{ borderColor: themeTokens.cardBorder, background: themeTokens.buttonBg, color: themeTokens.text }}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-1.5">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to chart ${i + 1}`}
              className="rounded-full transition-all duration-300 ease-out"
              style={{
                width: i === normalizedIdx ? 18 : 6,
                height: 6,
                background: i === normalizedIdx ? COLORS.blue : themeTokens.textMuted,
                opacity: i === normalizedIdx ? 1 : 0.4,
              }}
            />
          ))}
        </div>
        <button
          onClick={() => rotate(1)}
          aria-label="Next"
          className="w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 ease-out hover:scale-[1.06] active:scale-95"
          style={{ borderColor: themeTokens.cardBorder, background: themeTokens.buttonBg, color: themeTokens.text }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </GlassCard>
  );
};

const Dashboard = () => {
  const { t, transactions, ccStats, themeTokens } = useAppContext();
  const [timeRange, setTimeRange] = useState(6);
  // Income visibility toggle — Expenses are ALWAYS visible (user request).
  const [showIncome, setShowIncome] = useState(true);

  const now = new Date();
  const thisMonthTxs = transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthTxs = transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
  });

  const currentIncome = thisMonthTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
  const currentExpense = thisMonthTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  const lastIncome = lastMonthTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
  const lastExpense = lastMonthTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);

  const currentNet = currentIncome - currentExpense;
  const lastNet = lastIncome - lastExpense;
  const netDelta = lastNet !== 0 ? ((currentNet - lastNet) / Math.abs(lastNet)) * 100 : null;
  const expDelta = lastExpense !== 0 ? ((currentExpense - lastExpense) / lastExpense) * 100 : null;

  const savingsRate = currentIncome > 0 ? ((currentIncome - currentExpense) / currentIncome) * 100 : 0;

  const ccTotal = (ccStats['VISA Mercado Pago']?.total || 0) + (ccStats['Nubank MasterCard']?.total || 0);
  const ccPctIncome = currentIncome > 0 ? (ccTotal / currentIncome) * 100 : 0;

  const dayOfMonth = now.getDate();
  // Total days in the current month (handles leap years automatically)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // Split current expenses into fixed and variable for the new cards
  const currentFixed    = thisMonthTxs.filter(tx => tx.type === 'expense' && (tx.isFixed || tx.isRecurring || tx.locked)).reduce((s, tx) => s + tx.amount, 0);
  const currentVariable = thisMonthTxs.filter(tx => tx.type === 'expense' && !tx.isFixed && !tx.isRecurring && !tx.locked).reduce((s, tx) => s + tx.amount, 0);

  // Daily Avg = Variable Costs ÷ total days in month
  const dailyAvg = daysInMonth > 0 ? currentVariable / daysInMonth : 0;

  // Remaining Daily Budget: how much can be spent per remaining day
  const remainingBalance      = Math.max(0, currentIncome - currentFixed - currentVariable);
  const remainingDays         = Math.max(1, daysInMonth - dayOfMonth + 1);
  const remainingDailyBudget  = Math.min(10000, Math.max(0, remainingBalance / remainingDays));

  // Top-5 expense categories this month — used for the insights strip
  const topCategories = useMemo(() => {
    const buckets = {};
    thisMonthTxs.filter(tx => tx.type === 'expense').forEach(tx => {
      const key = tx.category || 'Other';
      buckets[key] = (buckets[key] || 0) + tx.amount;
    });
    return Object.entries(buckets)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  const getHistoricalAverage = (type) => {
    const pastTx = transactions.filter(t => t.type === type && new Date(t.date) < new Date(now.getFullYear(), now.getMonth(), 1));
    if(pastTx.length === 0) return 0;
    const monthsMap = {};
    pastTx.forEach(t => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthsMap[key] = (monthsMap[key] || 0) + t.amount;
    });
    const totals = Object.values(monthsMap);
    return totals.reduce((a,b) => a+b, 0) / totals.length;
  };

  const graphData = useMemo(() => {
    const data = [];
    const avgIncome = getHistoricalAverage('income');
    const avgExpense = getHistoricalAverage('expense');

    for (let i = 0; i < timeRange; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short' });

      const monthTx = transactions.filter(t => {
        const td = new Date(t.date);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      });

      let inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      let exp = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

      if (i > 0 && inc === 0 && exp === 0) {
        inc = avgIncome;
        exp = avgExpense;
      }
      data.push({ name: label, income: inc, expenses: exp });
    }
    return data;
  }, [transactions, timeRange]);

  // Expenses line is ALWAYS present; income is gated behind the toggle.
  const lines = [
    ...(showIncome ? [{ key: 'income', name: t.income, color: COLORS.green }] : []),
    { key: 'expenses', name: t.expenses, color: COLORS.red }
  ];

  const inPctOfTotal = (showIncome && (currentIncome + currentExpense) > 0)
    ? (currentIncome / (currentIncome + currentExpense)) * 100 : 0;
  const outPctOfTotal = (currentIncome + currentExpense) > 0
    ? (currentExpense / (currentIncome + currentExpense)) * 100 : 100;

  const categoryPalette = [COLORS.red, COLORS.orange, COLORS.yellow, COLORS.blue, COLORS.purple];

  return (
    <div className="space-y-6">
      {/* --- HERO ROW: Liquid Income + Financial Health --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr">
        <GlassCard className="p-6 md:col-span-2 h-full">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <Label>{t.liquidIncome}</Label>
              <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                <h2 className="text-3xl sm:text-4xl font-bold break-all transition-all duration-300"
                    style={{
                      color: currentNet >= 0 ? COLORS.green : COLORS.red,
                      filter: showIncome ? 'none' : 'blur(10px)',
                      userSelect: showIncome ? 'auto' : 'none'
                    }}>
                  {formatBRL(currentNet)}
                </h2>
              </div>
            </div>
            {netDelta !== null && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                   style={{ background: netDelta >= 0 ? `${COLORS.green}15` : `${COLORS.red}15` }}>
                {netDelta >= 0
                  ? <TrendingUp size={12} color={COLORS.green}/>
                  : <TrendingDown size={12} color={COLORS.red}/>}
                <span className="text-xs font-bold" style={{ color: netDelta >= 0 ? COLORS.green : COLORS.red }}>
                  {netDelta >= 0 ? '+' : ''}{netDelta.toFixed(1)}% vs last
                </span>
              </div>
            )}
          </div>
          {/* Proportional bar — Income segment hides when toggled off */}
          <div className="w-full mt-4 h-2 rounded-full overflow-hidden flex" style={{ background: themeTokens.grid }}>
             {showIncome && (
               <motion.div initial={{ width: 0 }} animate={{ width: `${inPctOfTotal}%` }} transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }}
                           style={{ background: COLORS.green }} />
             )}
             <motion.div initial={{ width: 0 }} animate={{ width: `${outPctOfTotal}%` }} transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }}
                         style={{ background: COLORS.red }} />
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span style={{ color: COLORS.green, transition: 'filter 300ms ease, opacity 300ms ease',
                            filter: showIncome ? 'none' : 'blur(6px)', opacity: showIncome ? 1 : 0.4 }}>
              IN: {formatBRL(currentIncome)}
            </span>
            <span style={{ color: COLORS.red }}>OUT: {formatBRL(currentExpense)}</span>
          </div>
        </GlassCard>

        <GlassCard className="p-6 h-full">
          <Label>{t.financialHealth}</Label>
          <div className="mt-4 flex items-center gap-3">
             {savingsRate >= 20 && ccPctIncome < 30 ? (
               <Heart size={32} color={COLORS.green} />
             ) : savingsRate < 10 || ccPctIncome > 50 ? (
               <AlertCircle size={32} color={COLORS.red} />
             ) : (
               <ShieldCheck size={32} color={COLORS.yellow} />
             )}
             <div>
               <p className="text-xl font-bold">
                 {savingsRate >= 20 && ccPctIncome < 30 ? t.healthy : savingsRate < 10 || ccPctIncome > 50 ? t.critical : t.moderate}
               </p>
             </div>
          </div>
          <p className="text-xs mt-3" style={{ color: themeTokens.textMuted }}>
             {savingsRate >= 20 && ccPctIncome < 30 ? t.healthy_desc : savingsRate < 10 || ccPctIncome > 50 ? t.critical_desc : t.moderate_desc}
          </p>
        </GlassCard>
      </div>

      {/* --- iOS Health-style stat strip --- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 auto-rows-fr">
        <GlassCard className="p-4 sm:p-5 h-full">
          <Label>Daily Avg</Label>
          <p className="text-lg sm:text-xl font-black mt-1.5 break-all">{formatBRL(dailyAvg)}</p>
          <p className="text-[10px] mt-1" style={{ color: themeTokens.textMuted }}>Variable ÷ {daysInMonth}d</p>
        </GlassCard>
        <GlassCard className="p-4 sm:p-5 h-full">
          <Label>Daily Budget Left</Label>
          <p className="text-lg sm:text-xl font-black mt-1.5 break-all" style={{ color: COLORS.green }}>
            {formatBRL(remainingDailyBudget)}
          </p>
          <p className="text-[10px] mt-1" style={{ color: themeTokens.textMuted }}>{remainingDays}d remaining</p>
        </GlassCard>
        <GlassCard className="p-4 sm:p-5 h-full">
          <Label>{t.savingsRate}</Label>
          <p className="text-lg sm:text-xl font-black mt-1.5"
             style={{ color: savingsRate >= 20 ? COLORS.green : savingsRate >= 10 ? COLORS.yellow : COLORS.red }}>
            {savingsRate.toFixed(1)}%
          </p>
          <p className="text-[10px] mt-1" style={{ color: themeTokens.textMuted }}>of income</p>
        </GlassCard>
        <GlassCard className="p-4 sm:p-5 h-full">
          <Label>{t.expenses}</Label>
          <p className="text-lg sm:text-xl font-black mt-1.5 break-all">{formatBRL(currentExpense)}</p>
          {expDelta !== null ? (
            <p className="text-[10px] mt-1 font-semibold" style={{ color: expDelta <= 0 ? COLORS.green : COLORS.red }}>
              {expDelta >= 0 ? '▲' : '▼'} {Math.abs(expDelta).toFixed(1)}% vs last
            </p>
          ) : (
            <p className="text-[10px] mt-1" style={{ color: themeTokens.textMuted }}>this month</p>
          )}
        </GlassCard>
        <GlassCard className="p-4 sm:p-5 h-full">
          <Label>Card Exposure</Label>
          <p className="text-lg sm:text-xl font-black mt-1.5"
             style={{ color: ccPctIncome < 30 ? COLORS.green : ccPctIncome < 50 ? COLORS.yellow : COLORS.red }}>
            {ccPctIncome.toFixed(0)}%
          </p>
          <p className="text-[10px] mt-1" style={{ color: themeTokens.textMuted }}>of income</p>
        </GlassCard>
      </div>

      {/* --- PROJECTION — with iOS-style Show/Hide Income toggle --- */}
      <GlassCard className="p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Activity size={20} color={COLORS.blue} />
            <h3 className="text-xl font-bold tracking-tight">{t.projection}</h3>
          </div>
          <button
            onClick={() => setShowIncome(v => !v)}
            aria-pressed={showIncome}
            aria-label={showIncome ? 'Hide income' : 'Show income'}
            className="w-9 h-9 flex items-center justify-center rounded-full border transition-all duration-300 ease-out hover:scale-[1.08] active:scale-95"
            style={{
              background: showIncome ? `${COLORS.green}18` : themeTokens.buttonBg,
              borderColor: showIncome ? `${COLORS.green}55` : themeTokens.cardBorder,
              color: showIncome ? COLORS.green : themeTokens.textMuted
            }}>
            {showIncome ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
        </div>
        <RotatingCharts data={graphData} lines={lines} timeRange={timeRange} setTimeRange={setTimeRange} />
      </GlassCard>

      {/* --- TOP CATEGORIES THIS MONTH --- */}
      {topCategories.length > 0 && (
        <GlassCard className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={20} color={COLORS.blue} />
            <h3 className="text-xl font-bold tracking-tight">Top Categories</h3>
            <span className="ml-auto text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full"
                  style={{ background: themeTokens.buttonBg, color: themeTokens.textMuted }}>
              {now.toLocaleDateString('en-US', { month: 'long' })}
            </span>
          </div>
          <div className="space-y-4">
            {topCategories.map((c, i) => {
              const max = topCategories[0].value || 1;
              const pct = (c.value / max) * 100;
              const pctOfTotal = currentExpense > 0 ? (c.value / currentExpense) * 100 : 0;
              const color = categoryPalette[i % categoryPalette.length];
              return (
                <div key={c.name}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-semibold">{c.name}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono font-bold text-sm">{formatBRL(c.value)}</span>
                      <span className="text-[10px] font-semibold" style={{ color: themeTokens.textMuted }}>
                        {pctOfTotal.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: themeTokens.grid }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }}
                                className="h-full rounded-full"
                                style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* --- DEEP DIVE — 3D carousel of six advanced views --- */}
      <DeepDiveCarousel />

      {/* Ghost simulator — what-if playground, cannot affect Net Worth */}
      <GhostSimulator />

      <GlassCard className="p-6 sm:p-8">
         <h3 className="text-xl font-bold mb-6">{t.cards} Overview</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 auto-rows-fr items-stretch">
            <CardWithDetails type="VISA Mercado Pago" stats={ccStats['VISA Mercado Pago']} />
            <CardWithDetails type="Nubank MasterCard" stats={ccStats['Nubank MasterCard']} />
         </div>
      </GlassCard>
    </div>
  );
};

const CostsPage = () => {
  const { t, transactions, themeTokens } = useAppContext();
  const [timeRange, setTimeRange] = useState(6);
  const [showFixed, setShowFixed] = useState(true);
  const [showVariable, setShowVariable] = useState(true);
  const [showIncome, setShowIncome] = useState(false);

  const now = new Date();

  const getHistoricalAverage = (filterFn) => {
    const pastTx = transactions.filter(tx => filterFn(tx) && new Date(tx.date) < new Date(now.getFullYear(), now.getMonth(), 1));
    if(pastTx.length === 0) return 0;
    const map = {};
    pastTx.forEach(tx => {
        const d = new Date(tx.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        map[key] = (map[key] || 0) + tx.amount;
    });
    const totals = Object.values(map);
    return totals.reduce((a,b) => a+b, 0) / totals.length;
  };

  const isFixedFilter = (tx) => tx.type === 'expense' && (tx.isRecurring || tx.isFixed);
  const isVarFilter = (tx) => tx.type === 'expense' && !tx.isRecurring && !tx.isFixed;
  const isIncFilter = (tx) => tx.type === 'income';

  const graphData = useMemo(() => {
    const data = [];
    const avgFixed = getHistoricalAverage(isFixedFilter);
    const avgVar = getHistoricalAverage(isVarFilter);
    const avgInc = getHistoricalAverage(isIncFilter);

    let totalFixedForPct = 0;
    let totalVarForPct = 0;

    for (let i = 0; i < timeRange; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short' });

      const monthTx = transactions.filter(t => {
        const td = new Date(t.date);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      });

      let f = monthTx.filter(isFixedFilter).reduce((s, t) => s + t.amount, 0);
      let v = monthTx.filter(isVarFilter).reduce((s, t) => s + t.amount, 0);
      let inc = monthTx.filter(isIncFilter).reduce((s, t) => s + t.amount, 0);

      if (i > 0 && f === 0 && v === 0 && inc === 0) {
        f = avgFixed; v = avgVar; inc = avgInc;
      }

      totalFixedForPct += f;
      totalVarForPct += v;

      data.push({ name: label, fixed: f, variable: v, income: inc });
    }

    const totalExp = totalFixedForPct + totalVarForPct;
    const fixedPct = totalExp > 0 ? (totalFixedForPct / totalExp) * 100 : 0;
    const varPct = totalExp > 0 ? (totalVarForPct / totalExp) * 100 : 0;

    return { data, fixedPct, varPct };
  }, [transactions, timeRange]);

  const activeLines = [];
  if (showFixed) activeLines.push({ key: 'fixed', name: t.fixedCosts, color: COLORS.red });
  if (showVariable) activeLines.push({ key: 'variable', name: t.variableCosts, color: COLORS.yellow });
  if (showIncome) activeLines.push({ key: 'income', name: t.income, color: COLORS.green });

  return (
    <div className="space-y-6">
       <h2 className="text-2xl font-bold tracking-tight">{t.costs}</h2>
       <GlassCard className="p-6 sm:p-8">
          <RotatingCharts data={graphData.data} lines={activeLines} timeRange={timeRange} setTimeRange={setTimeRange} />

          <div className="flex gap-2 sm:gap-4 justify-center mt-8 pt-6 border-t flex-wrap" style={{ borderColor: themeTokens.cardBorder }}>
            <button onClick={() => setShowFixed(!showFixed)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${showFixed ? 'text-white' : ''}`} style={{ background: showFixed ? COLORS.red : 'transparent', borderColor: COLORS.red, color: showFixed ? '#fff' : COLORS.red }}>
               FIXED
            </button>
            <button onClick={() => setShowVariable(!showVariable)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${showVariable ? 'text-black' : ''}`} style={{ background: showVariable ? COLORS.yellow : 'transparent', borderColor: COLORS.yellow, color: showVariable ? '#000' : COLORS.yellow }}>
               VARIABLE
            </button>
            <button onClick={() => setShowIncome(!showIncome)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${showIncome ? 'text-white' : ''}`} style={{ background: showIncome ? COLORS.green : 'transparent', borderColor: COLORS.green, color: showIncome ? '#fff' : COLORS.green }}>
               INCOME
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8 auto-rows-fr">
             <div className="p-4 rounded-2xl text-center h-full flex flex-col justify-center" style={{ background: themeTokens.buttonBg }}>
                <Label>Fixed vs Total Exp</Label>
                <p className="text-3xl font-black mt-1" style={{ color: COLORS.red }}>{graphData.fixedPct.toFixed(1)}%</p>
             </div>
             <div className="p-4 rounded-2xl text-center h-full flex flex-col justify-center" style={{ background: themeTokens.buttonBg }}>
                <Label>Variable vs Total Exp</Label>
                <p className="text-3xl font-black mt-1" style={{ color: COLORS.yellow }}>{graphData.varPct.toFixed(1)}%</p>
             </div>
          </div>
       </GlassCard>
    </div>
  );
};

const CardsPage = () => {
  const { t, ccStats } = useAppContext();
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">{t.cards}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <CardWithDetails type="VISA Mercado Pago" stats={ccStats['VISA Mercado Pago']} />
         <CardWithDetails type="Nubank MasterCard" stats={ccStats['Nubank MasterCard']} />
      </div>
    </div>
  );
};

const NetWorthPage = () => {
  const { t, transactions, savingsTotal, netWorthState, setNetWorthState, themeTokens } = useAppContext();

  const cashBalance = useMemo(() => {
    let cash = 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    transactions.forEach(tx => {
      if (tx.type === 'income') { cash += tx.amount; return; }
      if (tx.paymentMethod !== 'Debit/Cash') return;
      // Any locked installment (motorcycle financing, debt plans, etc.)
      // only hits cash in the month it's actually due.
      if (tx.locked) {
        const d = new Date(tx.date);
        if (d >= monthStart && d < monthEnd) cash -= tx.amount;
        return;
      }
      cash -= tx.amount;
    });
    return cash;
  }, [transactions]);

  const totalAssets = netWorthState.apartments.reduce((sum, apt) => sum + apt.value, 0) + (netWorthState.motorcycle.marketValue || netWorthState.motorcycle.value || 0);
  const liquidNW = cashBalance + savingsTotal;
  // Motorcycle debt is NOT subtracted — it's an asset already purchased,
  // financing flows through monthly cash flow instead of eroding net worth.
  const grandTotalNW = liquidNW + totalAssets;

  const handleAptChange = (id, field, val) => {
    setNetWorthState(prev => ({
      ...prev, apartments: prev.apartments.map(apt => apt.id === id ? { ...apt, [field]: field === 'name' ? val : Number(val) || val } : apt)
    }));
  };

  const handleMotoChange = (field, val) => {
    setNetWorthState(prev => ({ ...prev, motorcycle: { ...prev.motorcycle, [field]: (field === 'year' || field === 'brand' || field === 'model' || field === 'color' || field === 'segment') ? val : Number(val) || val }}));
  };

  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 auto-rows-fr">
         <GlassCard className="p-6 sm:p-8 h-full">
           <Label>{t.totalNetWorth}</Label>
           <p className="text-3xl sm:text-4xl font-black mt-2 break-all">{formatBRL(grandTotalNW)}</p>
         </GlassCard>
         <GlassCard className="p-6 sm:p-8 h-full">
           <Label>{t.liquidNetWorth}</Label>
           <p className="text-3xl sm:text-4xl font-black mt-2 break-all" style={{ color: COLORS.blue }}>{formatBRL(liquidNW)}</p>
         </GlassCard>
       </div>

       <h3 className="text-xl font-bold tracking-tight mt-8 mb-4">{t.assets}</h3>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-fr">
         {netWorthState.apartments.map(apt => (
           <GlassCard key={apt.id} className="p-6 space-y-4 h-full">
             <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: themeTokens.cardBorder }}>
                <input type="text" value={apt.name} onChange={e => handleAptChange(apt.id, 'name', e.target.value)} className="text-xl font-bold bg-transparent outline-none w-full border-b border-transparent focus:border-blue-500 transition-colors" />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <Label>{t.value} (R$)</Label>
                 <input type="number" value={apt.value} onChange={e => handleAptChange(apt.id, 'value', e.target.value)} className="font-mono font-bold mt-1 bg-transparent outline-none w-full border-b" style={{ borderColor: themeTokens.cardBorder }} />
               </div>
               <div>
                 <Label>{t.rentalIncome} (R$)</Label>
                 <input type="number" value={apt.rent} onChange={e => handleAptChange(apt.id, 'rent', e.target.value)} className="font-mono font-bold mt-1 bg-transparent outline-none w-full border-b" style={{ color: COLORS.green, borderColor: themeTokens.cardBorder }} />
               </div>
               <div>
                 <Label>{t.dueDate} (Day)</Label>
                 <input type="number" value={apt.dueDate} onChange={e => handleAptChange(apt.id, 'dueDate', e.target.value)} className="font-mono font-bold mt-1 bg-transparent outline-none w-full border-b" style={{ borderColor: themeTokens.cardBorder }} />
               </div>
               <div>
                 <Label>{t.sqm} (m²)</Label>
                 <input type="number" value={apt.sqm} onChange={e => handleAptChange(apt.id, 'sqm', e.target.value)} className="font-mono font-bold mt-1 bg-transparent outline-none w-full border-b" style={{ borderColor: themeTokens.cardBorder }} />
               </div>
             </div>
           </GlassCard>
         ))}
       </div>

       <h3 className="text-xl font-bold tracking-tight mt-8 mb-4 flex items-center gap-2"><Bike color={COLORS.blue}/> Vehicle</h3>
       <GlassCard className="p-6 space-y-4 max-w-xl">
          <div className="flex justify-between items-center">
            <h4 className="text-xl font-bold">{t.motorcycle}</h4>
            <div className="flex items-center gap-1 text-sm font-mono" style={{ color: themeTokens.textMuted }}>
              <span>FIPE: R$</span>
              <input type="number" value={netWorthState.motorcycle.fipe} onChange={e=>handleMotoChange('fipe', e.target.value)} className="bg-transparent border-b outline-none w-20 text-right" style={{ borderColor: themeTokens.cardBorder }} />
              <span className="ml-2">Ref:</span>
              <input type="text" value={netWorthState.motorcycle.year} onChange={e=>handleMotoChange('year', e.target.value)} className="bg-transparent border-b outline-none w-12 text-center" style={{ borderColor: themeTokens.cardBorder }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
               <Label>{t.value} (R$)</Label>
               <input type="number" value={netWorthState.motorcycle.value} onChange={e=>handleMotoChange('value', e.target.value)} className="font-mono font-bold mt-1 bg-transparent outline-none w-full border-b" style={{ borderColor: themeTokens.cardBorder }} />
             </div>
             <div>
               <Label>Remaining Debt (R$)</Label>
               <input type="number" value={netWorthState.motorcycle.debt} onChange={e=>handleMotoChange('debt', e.target.value)} className="font-mono font-bold mt-1 bg-transparent outline-none w-full border-b" style={{ color: COLORS.red, borderColor: themeTokens.cardBorder }} />
             </div>
          </div>
       </GlassCard>
    </div>
  );
};

// --- GOALS PAGE — BMW-centric ---
const GoalsPage = () => {
  const { t, savingsTotal, addSaving, goalAmount, setGoalAmount, goals, addGoal, deleteGoal, themeTokens, lang } = useAppContext();
  const [editing, setEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState(goalAmount);
  const [contribution, setContribution] = useState('');
  const [showForm, setShowForm] = useState(false);

  // New-goal form state
  const [gTitle, setGTitle] = useState('');
  const [gDesc, setGDesc] = useState('');
  const [gDuration, setGDuration] = useState('');
  const [gCategory, setGCategory] = useState('Course');
  const [gSubCategory, setGSubCategory] = useState('');
  const [gPrice, setGPrice] = useState('');

  const pct = Math.min((savingsTotal / goalAmount) * 100, 100);

  const handleContribute = (e) => {
    e.preventDefault();
    if(contribution && Number(contribution) > 0) { addSaving(Number(contribution)); setContribution(''); }
  };

  const handleGoalSubmit = (e) => {
    e.preventDefault();
    if (!gTitle || !gPrice) return;
    addGoal({
      id: `g-${Date.now()}`,
      title: gTitle,
      description: gDesc,
      duration: gDuration,
      category: gCategory,
      subCategory: gSubCategory,
      price: Number(gPrice)
    });
    setGTitle(''); setGDesc(''); setGDuration(''); setGCategory('Course'); setGSubCategory(''); setGPrice('');
    setShowForm(false);
  };

  const categoryOptions = [
    { key: 'Course', label: t.catCourse, icon: BookOpen, subs: [] },
    { key: 'Asset', label: t.catAsset, icon: Home, subs: [t.catAptAsset, t.catBikeAsset] },
    { key: 'Trip', label: t.catTrip, icon: Plane, subs: [t.catEurope, t.catUS] }
  ];

  const currentCatObj = categoryOptions.find(c => c.key === gCategory);

  const getCategoryIcon = (cat) => {
    const obj = categoryOptions.find(c => c.key === cat);
    return obj ? obj.icon : Target;
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold tracking-tight">{t.goals}</h2>

      {/* BMW HERO — main pinned goal */}
      <GlassCard className="p-6 sm:p-10 relative overflow-hidden">
        {/* Ambient gradient backdrop */}
        <div className="absolute -top-32 -right-20 w-[420px] h-[420px] rounded-full pointer-events-none opacity-30"
             style={{ background: 'radial-gradient(circle, rgba(28,105,212,0.6) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-10 w-[360px] h-[360px] rounded-full pointer-events-none opacity-20"
             style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)' }} />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          {/* Logo column */}
          <motion.div
             initial={{ rotate: -20, opacity: 0, scale: 0.7 }}
             animate={{ rotate: 0, opacity: 1, scale: 1 }}
             transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
             className="shrink-0"
          >
            <div className="block sm:hidden"><BMWLogo size={160} /></div>
            <div className="hidden sm:block md:hidden"><BMWLogo size={200} /></div>
            <div className="hidden md:block"><BMWLogo size={240} /></div>
          </motion.div>

          {/* Copy column */}
          <div className="flex-1 text-center md:text-left w-full">
            <Label>{t.mainGoal}</Label>
            <h1 className="mt-2 font-black tracking-tight leading-none text-5xl sm:text-6xl md:text-7xl"
                style={{ background: `linear-gradient(135deg, ${COLORS.bmwBlue} 0%, #3AB0FF 50%, ${themeTokens.text} 100%)`,
                         WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              550i F10
            </h1>
            <p className="mt-4 font-black text-4xl sm:text-5xl tracking-tight" style={{ color: themeTokens.text }}>
              R$ <span style={{ color: COLORS.bmwBlue }}>50k</span>
            </p>

            {/* Progress */}
            <div className="mt-6">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <Label>Saved</Label>
                  <p className="text-xl font-bold">{formatBRL(savingsTotal)}</p>
                </div>
                <div className="text-right">
                  <Label>{t.progress}</Label>
                  <p className="text-2xl font-black" style={{ color: COLORS.bmwBlue }}>{pct.toFixed(1)}%</p>
                </div>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: themeTokens.grid }}>
                <motion.div initial={{width:0}} animate={{width: `${pct}%`}} transition={{ duration: 1.2, ease: 'easeOut' }}
                   className="h-full" style={{ background: `linear-gradient(90deg, ${COLORS.bmwBlue}, #3AB0FF)` }} />
              </div>
              {editing ? (
                <div className="flex items-center gap-2 mt-3 justify-center md:justify-start">
                  <span className="text-xs" style={{color: themeTokens.textMuted}}>{t.target}: R$</span>
                  <input type="number" value={tempGoal} onChange={e=>setTempGoal(e.target.value)} className="w-28 px-2 py-1 rounded bg-transparent border outline-none font-mono text-sm" style={{borderColor: COLORS.bmwBlue}} autoFocus />
                  <button onClick={() => { if(tempGoal>0) setGoalAmount(Number(tempGoal)); setEditing(false); }} className="p-1 hover:opacity-70" style={{color: COLORS.green}}><Check size={16}/></button>
                  <button onClick={() => { setEditing(false); setTempGoal(goalAmount); }} className="p-1 hover:opacity-70" style={{color: COLORS.gray}}><X size={16}/></button>
                </div>
              ) : (
                <p className="text-xs mt-2 cursor-pointer hover:opacity-70 transition-opacity text-center md:text-left" onClick={()=>setEditing(true)} style={{ color: themeTokens.textMuted }}>
                  {t.target}: {formatBRL(goalAmount)} <Edit3 size={11} className="inline ml-1 mb-0.5"/>
                </p>
              )}
            </div>

            {/* Contribute form */}
            <form onSubmit={handleContribute} className="flex gap-2 mt-5">
              <input type="number" value={contribution} onChange={e=>setContribution(e.target.value)} placeholder="Add savings..."
                     className="flex-grow rounded-xl px-4 py-3 outline-none transition-colors border bg-transparent text-sm"
                     style={{ borderColor: themeTokens.cardBorder }} />
              <button type="submit" disabled={!contribution} className="text-white font-bold px-7 rounded-full disabled:opacity-50 transition-all duration-300 ease-out shadow-lg hover:shadow-xl hover:scale-[1.03]"
                      style={{ background: `linear-gradient(135deg, ${COLORS.bmwBlue}, #093A82)` }}>Add</button>
            </form>
          </div>
        </div>
      </GlassCard>

      {/* OTHER GOALS */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold tracking-tight">{t.otherGoals}</h3>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg transition-transform hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${COLORS.bmwBlue}, #093A82)`, color: '#fff' }}>
             <Plus size={14}/> {t.newGoal}
          </button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="overflow-hidden mb-6">
              <GlassCard className="p-6">
                <form onSubmit={handleGoalSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>{t.title}</Label>
                      <input type="text" value={gTitle} onChange={e=>setGTitle(e.target.value)} required
                             className="w-full mt-1 bg-transparent border rounded-xl px-4 py-3 outline-none text-sm focus:border-blue-500 transition-colors"
                             style={{ borderColor: themeTokens.cardBorder }} placeholder="Motorcycle License (CNH-A)" />
                    </div>
                    <div>
                      <Label>{t.price} (R$)</Label>
                      <input type="number" value={gPrice} onChange={e=>setGPrice(e.target.value)} required
                             className="w-full mt-1 bg-transparent border rounded-xl px-4 py-3 outline-none text-sm focus:border-blue-500 transition-colors"
                             style={{ borderColor: themeTokens.cardBorder }} placeholder="2500" />
                    </div>
                  </div>

                  <div>
                    <Label>{t.description}</Label>
                    <textarea value={gDesc} onChange={e=>setGDesc(e.target.value)} rows="2"
                              className="w-full mt-1 bg-transparent border rounded-xl px-4 py-3 outline-none text-sm focus:border-blue-500 transition-colors resize-none"
                              style={{ borderColor: themeTokens.cardBorder }} placeholder="Purpose, notes, milestones..." />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>{t.duration}</Label>
                      <input type="text" value={gDuration} onChange={e=>setGDuration(e.target.value)}
                             className="w-full mt-1 bg-transparent border rounded-xl px-4 py-3 outline-none text-sm focus:border-blue-500 transition-colors"
                             style={{ borderColor: themeTokens.cardBorder }} placeholder="3 months" />
                    </div>
                    <div>
                      <Label>{t.category}</Label>
                      <div className="flex gap-2 mt-1">
                        {categoryOptions.map(c => {
                          const Icon = c.icon;
                          const active = gCategory === c.key;
                          return (
                            <button type="button" key={c.key} onClick={() => { setGCategory(c.key); setGSubCategory(''); }}
                                    className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${active ? 'text-white shadow-md' : ''}`}
                                    style={{ background: active ? COLORS.bmwBlue : 'transparent', borderColor: active ? 'transparent' : themeTokens.cardBorder, color: active ? '#fff' : themeTokens.text }}>
                              <Icon size={12}/> {c.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {currentCatObj && currentCatObj.subs.length > 0 && (
                    <div>
                      <Label>Sub-type</Label>
                      <div className="flex gap-2 mt-1">
                        {currentCatObj.subs.map(s => (
                          <button type="button" key={s} onClick={() => setGSubCategory(s)}
                                  className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${gSubCategory === s ? 'text-white' : ''}`}
                                  style={{ background: gSubCategory === s ? COLORS.bmwBlue : 'transparent', borderColor: themeTokens.cardBorder, color: gSubCategory === s ? '#fff' : themeTokens.text }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setShowForm(false)}
                            className="flex-1 py-3 rounded-xl text-sm font-bold border transition-colors"
                            style={{ borderColor: themeTokens.cardBorder, color: themeTokens.text }}>{t.cancel}</button>
                    <button type="submit" disabled={!gTitle || !gPrice}
                            className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 shadow-md"
                            style={{ background: `linear-gradient(135deg, ${COLORS.bmwBlue}, #093A82)` }}>
                      {t.save}
                    </button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {goals.length === 0 && !showForm && (
          <GlassCard className="p-10 text-center">
            <Target size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm" style={{ color: themeTokens.textMuted }}>No other goals yet. Hit NEW GOAL to add one.</p>
          </GlassCard>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {goals.map(g => {
              const Icon = getCategoryIcon(g.category);
              return (
                <motion.div key={g.id} initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.9}}>
                  <GlassCard className="p-5 group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                           style={{ background: `${COLORS.bmwBlue}20`, color: COLORS.bmwBlue }}>
                        <Icon size={18} />
                      </div>
                      <button onClick={() => deleteGoal(g.id)} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: COLORS.red }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest font-semibold" style={{color: themeTokens.textMuted}}>
                      {g.category}{g.subCategory ? ` · ${g.subCategory}` : ''}
                    </p>
                    <h4 className="text-lg font-bold mt-1 leading-tight">{g.title}</h4>
                    {g.description && <p className="text-xs mt-1" style={{color: themeTokens.textMuted}}>{g.description}</p>}
                    <div className="flex items-end justify-between mt-4 pt-3 border-t" style={{borderColor: themeTokens.cardBorder}}>
                      <div>
                        <Label>{t.price}</Label>
                        <p className="font-black text-lg" style={{color: COLORS.bmwBlue}}>{formatBRL(g.price)}</p>
                      </div>
                      {g.duration && (
                        <div className="text-right">
                          <Label>{t.duration}</Label>
                          <p className="font-mono text-xs mt-1">{g.duration}</p>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// --- MOTORCYCLE PAGE ---
const MotorcyclePage = () => {
  const { t, transactions, netWorthState, setNetWorthState, themeTokens } = useAppContext();
  const [editingValue, setEditingValue] = useState(false);
  const [tempValue, setTempValue] = useState(netWorthState.motorcycle.marketValue || netWorthState.motorcycle.value || 0);

  const saveMarketValue = () => {
    const v = Number(tempValue);
    if (v >= 0) {
      setNetWorthState(prev => ({ ...prev, motorcycle: { ...prev.motorcycle, marketValue: v, value: v } }));
    }
    setEditingValue(false);
  };

  // Filter installments (fixed, Motorcycle category) vs other moto-related tx
  const motoInstallments = useMemo(() =>
    transactions.filter(tx => tx.locked && tx.category === 'Motorcycle')
                .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [transactions]
  );
  const otherMotoTxs = transactions.filter(tx => !tx.locked && (tx.category === 'Motorcycle' || tx.category === 'Insurance'));

  const now = new Date();
  const paidInstallments = motoInstallments.filter(tx => new Date(tx.date) <= now);
  const futureInstallments = motoInstallments.filter(tx => new Date(tx.date) > now);

  const totalFinanced = MOTO_INSTALLMENT_AMOUNT * MOTO_INSTALLMENT_COUNT;
  const totalPaid = paidInstallments.reduce((s, tx) => s + tx.amount, 0) + otherMotoTxs.reduce((s, tx) => s + tx.amount, 0);
  const remaining = Math.max(0, totalFinanced - paidInstallments.reduce((s, tx) => s + tx.amount, 0));
  const progress = (paidInstallments.length / MOTO_INSTALLMENT_COUNT) * 100;

  const specs = [
    { icon: Award, label: t.brand, value: 'Triumph' },
    { icon: Bike, label: t.model, value: 'Street Triple RS' },
    { icon: Gauge, label: t.horsepower, value: '130 hp' },
    { icon: CalendarIcon, label: t.year, value: '2023' },
    { icon: Palette, label: t.color, value: 'Grey' },
    { icon: Zap, label: t.segment, value: 'Supernaked' }
  ];

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4 mb-2 flex-wrap">
         <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 shrink-0" style={{ borderColor: COLORS.blue, background: themeTokens.buttonBg }}>
            <span className="font-bold tracking-widest text-xs" style={{ color: COLORS.blue }}>TRIUMPH</span>
         </div>
         <div>
           <h2 className="text-2xl font-bold tracking-tight">Street Triple RS</h2>
           <p className="text-sm font-semibold tracking-widest uppercase mt-1" style={{ color: themeTokens.textMuted }}>Supernaked · 130 hp · 2023</p>
         </div>
       </div>

       {/* SPECIFICATIONS PANEL */}
       <GlassCard className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
             <Sparkles size={18} color={COLORS.blue} />
             <h3 className="text-lg font-bold tracking-tight">{t.specifications}</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {specs.map((s, i) => (
              <div key={i} className="p-3 sm:p-4 rounded-xl flex items-center gap-3" style={{ background: themeTokens.buttonBg }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${COLORS.blue}20`, color: COLORS.blue }}>
                  <s.icon size={16} />
                </div>
                <div className="min-w-0">
                  <Label>{s.label}</Label>
                  <p className="font-bold text-sm sm:text-base truncate">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
       </GlassCard>

       {/* MARKET VALUE — feeds Net Worth as an asset */}
       <GlassCard className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
             <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                     style={{ background: `${COLORS.green}20`, color: COLORS.green }}>
                   <TrendingUp size={18} />
                </div>
                <div>
                   <Label>Motorcycle Market Value</Label>
                   <p className="text-xs mt-1" style={{ color: themeTokens.textMuted }}>
                     Counts as an asset in Net Worth. Financing flows through monthly cash flow only.
                   </p>
                </div>
             </div>
             <div className="flex items-center gap-2">
               {editingValue ? (
                 <>
                   <span className="font-mono font-bold text-lg" style={{ color: themeTokens.textMuted }}>R$</span>
                   <input type="number" value={tempValue} onChange={e => setTempValue(e.target.value)}
                          className="w-32 px-3 py-2 rounded-lg bg-transparent border outline-none font-mono font-bold text-lg text-right"
                          style={{ borderColor: COLORS.green, color: COLORS.green }} autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveMarketValue(); if (e.key === 'Escape') { setEditingValue(false); setTempValue(netWorthState.motorcycle.marketValue); } }} />
                   <button onClick={saveMarketValue} className="p-2 rounded-lg hover:opacity-70 transition-opacity"
                           style={{ background: `${COLORS.green}20`, color: COLORS.green }}><Check size={16}/></button>
                   <button onClick={() => { setEditingValue(false); setTempValue(netWorthState.motorcycle.marketValue); }}
                           className="p-2 rounded-lg hover:opacity-70 transition-opacity"
                           style={{ background: themeTokens.buttonBg, color: themeTokens.textMuted }}><X size={16}/></button>
                 </>
               ) : (
                 <>
                   <p className="text-2xl sm:text-3xl font-black" style={{ color: COLORS.green }}>
                     {formatBRL(netWorthState.motorcycle.marketValue || netWorthState.motorcycle.value || 0)}
                   </p>
                   <button onClick={() => { setTempValue(netWorthState.motorcycle.marketValue || netWorthState.motorcycle.value || 0); setEditingValue(true); }}
                           className="ml-2 px-4 py-2 rounded-lg text-xs font-bold border transition-colors hover:opacity-80 flex items-center gap-1.5"
                           style={{ borderColor: COLORS.green, color: COLORS.green, background: `${COLORS.green}10` }}>
                     <Edit3 size={13}/> Update
                   </button>
                 </>
               )}
             </div>
          </div>
       </GlassCard>

       {/* FINANCING SUMMARY */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr">
          <GlassCard className="p-6 h-full">
            <Label>{t.totalFinancing}</Label>
            <p className="text-2xl sm:text-3xl font-black mt-2 break-all">{formatBRL(totalFinanced)}</p>
            <p className="text-xs mt-1" style={{ color: themeTokens.textMuted }}>{MOTO_INSTALLMENT_COUNT}× {formatBRL(MOTO_INSTALLMENT_AMOUNT)}</p>
          </GlassCard>
          <GlassCard className="p-6 h-full">
            <Label>{t.totalPaid}</Label>
            <p className="text-2xl sm:text-3xl font-black mt-2 break-all" style={{ color: COLORS.green }}>{formatBRL(totalPaid)}</p>
            <p className="text-xs mt-1" style={{ color: themeTokens.textMuted }}>{paidInstallments.length} of {MOTO_INSTALLMENT_COUNT} installments</p>
          </GlassCard>
          <GlassCard className="p-6 h-full">
            <Label>{t.remainingBalance}</Label>
            <p className="text-2xl sm:text-3xl font-black mt-2 break-all" style={{ color: COLORS.red }}>{formatBRL(remaining)}</p>
            <p className="text-xs mt-1" style={{ color: themeTokens.textMuted }}>{futureInstallments.length} future</p>
          </GlassCard>
       </div>

       {/* PAYOFF PROGRESS */}
       <GlassCard className="p-6 sm:p-8">
          <Label>Payoff Progress</Label>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex-grow h-4 rounded-full overflow-hidden" style={{ background: themeTokens.grid }}>
               <motion.div initial={{width:0}} animate={{width:`${progress}%`}} transition={{duration: 1, ease: 'easeOut'}} className="h-full" style={{ background: `linear-gradient(90deg, ${COLORS.blue}, #34c759)` }} />
            </div>
            <span className="font-bold whitespace-nowrap">{progress.toFixed(1)}%</span>
          </div>
       </GlassCard>

       {/* INSTALLMENTS LIST */}
       <GlassCard className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
             <Repeat size={18} color={COLORS.blue} />
             <h3 className="text-lg font-bold tracking-tight">{t.financing} · {t.installments}</h3>
             <span className="ml-auto text-xs font-mono px-2 py-1 rounded-full" style={{background: themeTokens.buttonBg, color: themeTokens.textMuted}}>
               {MOTO_INSTALLMENT_COUNT}× {formatBRL(MOTO_INSTALLMENT_AMOUNT)}
             </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[520px] overflow-y-auto custom-scroll pr-2">
            {motoInstallments.map(tx => {
              const d = new Date(tx.date);
              const isPaid = d <= now;
              return (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl border"
                     style={{ borderColor: themeTokens.cardBorder, background: themeTokens.buttonBg,
                              opacity: isPaid ? 1 : 0.7 }}>
                   <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-mono font-black text-xs"
                        style={{ background: isPaid ? `${COLORS.green}20` : `${COLORS.yellow}20`,
                                 color: isPaid ? COLORS.green : COLORS.yellow }}>
                     {String(tx.installmentIndex).padStart(2, '0')}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-xs font-semibold truncate">
                       {d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                     </p>
                     <p className="text-[10px] uppercase tracking-widest" style={{color: themeTokens.textMuted}}>
                       {isPaid ? 'PAID' : 'SCHEDULED'}
                     </p>
                   </div>
                   <div className="text-right shrink-0">
                     <p className="font-mono font-bold text-sm" style={{ color: isPaid ? COLORS.green : COLORS.red }}>
                       {isPaid ? '' : '-'}{formatBRL(tx.amount)}
                     </p>
                     <Lock size={10} className="inline" style={{color: themeTokens.textMuted}} />
                   </div>
                </div>
              );
            })}
          </div>
       </GlassCard>

       {/* OTHER RELATED TRANSACTIONS */}
       {otherMotoTxs.length > 0 && (
         <GlassCard className="p-6 sm:p-8">
            <h3 className="text-lg font-bold tracking-tight mb-4">Other Related Transactions</h3>
            <div className="space-y-2">
              {otherMotoTxs.map(tx => (
                 <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl border" style={{ borderColor: themeTokens.cardBorder, background: themeTokens.buttonBg }}>
                    <div>
                      <p className="font-semibold text-sm">{tx.description}</p>
                      <p className="text-[10px] tracking-widest uppercase mt-1" style={{ color: themeTokens.textMuted }}>{new Date(tx.date).toLocaleDateString()} · {tx.category}</p>
                    </div>
                    <span className="font-mono font-bold" style={{ color: COLORS.red }}>-{formatBRL(tx.amount)}</span>
                 </div>
              ))}
            </div>
         </GlassCard>
       )}
    </div>
  );
};

// --- DEBTS PAGE (Dynamic) ---
const DebtsPage = () => {
  const { t, transactions, debtsState, addDebt, deleteDebt, themeTokens } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [dName, setDName] = useState('');
  const [dTotal, setDTotal] = useState('');
  const [dCount, setDCount] = useState('');
  const [dStart, setDStart] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().split('T')[0];
  });

  const previewMonthly = (dTotal && dCount && Number(dCount) > 0)
    ? Number(dTotal) / Number(dCount) : 0;

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!dName || !dTotal || !dCount || !dStart) return;
    const id = `d-${Date.now()}`;
    const totalDebit = Number(dTotal);
    const installmentCount = Math.floor(Number(dCount));
    addDebt({
      id,
      name: dName,
      totalDebit,
      installmentCount,
      startDate: new Date(dStart).toISOString(),
      monthlyAmount: totalDebit / installmentCount,
      active: true,
      // legacy-compat fields (read by older transactions views)
      total: totalDebit,
      monthly: totalDebit / installmentCount
    });
    setDName(''); setDTotal(''); setDCount('');
    setShowForm(false);
  };

  // --- Current-month income impact summary ---------------------
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const monthIncome = transactions.filter(tx => {
    if (tx.type !== 'income') return false;
    const d = new Date(tx.date);
    return d >= monthStart && d < monthEnd;
  }).reduce((s, tx) => s + tx.amount, 0);

  const monthDebtDeduction = transactions.filter(tx =>
    tx.locked && (tx.debtId || tx.parentCategory === 'Debt Payment' || tx.category === 'Debt Payment') &&
    new Date(tx.date) >= monthStart && new Date(tx.date) < monthEnd
  ).reduce((s, tx) => s + tx.amount, 0);

  const netAfterDebts = monthIncome - monthDebtDeduction;
  const deductionPct = monthIncome > 0 ? (monthDebtDeduction / monthIncome) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
         <h2 className="text-2xl font-bold tracking-tight">{t.debts}</h2>
         <button onClick={() => setShowForm(!showForm)}
                 className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest shadow-md transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-lg"
                 style={{ background: COLORS.blue, color: '#fff' }}>
            <Plus size={14}/> {t.addDebt}
         </button>
      </div>

      {/* --- CURRENT-MONTH INCOME IMPACT SUMMARY ---------------- */}
      {debtsState.length > 0 && (
        <GlassCard className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <TrendingDown size={18} color={COLORS.red} />
            <h3 className="text-lg font-bold tracking-tight">This Month · Income Impact</h3>
            <span className="ml-auto text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full"
                  style={{ background: themeTokens.buttonBg, color: themeTokens.textMuted }}>
              {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 auto-rows-fr">
            <div className="p-4 rounded-2xl h-full flex flex-col justify-between" style={{ background: themeTokens.buttonBg }}>
              <Label>Income this month</Label>
              <p className="text-2xl font-black mt-1" style={{ color: COLORS.green }}>{formatBRL(monthIncome)}</p>
            </div>
            <div className="p-4 rounded-2xl h-full flex flex-col justify-between" style={{ background: themeTokens.buttonBg }}>
              <div className="flex items-center justify-between">
                <Label>Debt deduction</Label>
                <span className="text-[10px] font-bold" style={{ color: COLORS.red }}>
                  {deductionPct.toFixed(1)}%
                </span>
              </div>
              <p className="text-2xl font-black mt-1" style={{ color: COLORS.red }}>−{formatBRL(monthDebtDeduction)}</p>
            </div>
            <div className="p-4 rounded-2xl border-2 h-full flex flex-col justify-between" style={{ background: `${COLORS.blue}10`, borderColor: COLORS.blue }}>
              <Label>Net after debts</Label>
              <p className="text-2xl font-black mt-1" style={{ color: netAfterDebts >= 0 ? COLORS.blue : COLORS.red }}>
                {formatBRL(netAfterDebts)}
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="overflow-hidden">
            <GlassCard className="p-6">
              <h3 className="text-lg font-bold mb-4">{t.newDebt}</h3>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <input type="text" value={dName} onChange={e=>setDName(e.target.value)} required placeholder={t.creditorName}
                       className="w-full bg-transparent border rounded-xl px-4 py-3 outline-none text-sm focus:border-blue-500 transition-colors"
                       style={{ borderColor: themeTokens.cardBorder }} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Total Debit (R$)</Label>
                    <input type="number" step="0.01" value={dTotal} onChange={e=>setDTotal(e.target.value)} required placeholder="8500"
                           className="w-full mt-1 bg-transparent border rounded-xl px-4 py-3 outline-none text-sm focus:border-blue-500 transition-colors"
                           style={{ borderColor: themeTokens.cardBorder }} />
                  </div>
                  <div>
                    <Label># of Installments</Label>
                    <input type="number" min="1" value={dCount} onChange={e=>setDCount(e.target.value)} required placeholder="10"
                           className="w-full mt-1 bg-transparent border rounded-xl px-4 py-3 outline-none text-sm focus:border-blue-500 transition-colors"
                           style={{ borderColor: themeTokens.cardBorder }} />
                  </div>
                  <div>
                    <Label>First Payment</Label>
                    <input type="date" value={dStart} onChange={e=>setDStart(e.target.value)} required
                           className="w-full mt-1 bg-transparent border rounded-xl px-4 py-3 outline-none text-sm focus:border-blue-500 transition-colors"
                           style={{ borderColor: themeTokens.cardBorder }} />
                  </div>
                </div>
                {previewMonthly > 0 && (
                  <div className="p-3 rounded-2xl flex items-center justify-between" style={{ background: `${COLORS.blue}15`, border: `1px solid ${COLORS.blue}40` }}>
                    <Label>Monthly installment (auto)</Label>
                    <span className="font-mono font-black text-lg" style={{ color: COLORS.blue }}>
                      {formatBRL(previewMonthly)}
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowForm(false)}
                          className="flex-1 py-3 rounded-full text-sm font-bold border transition-all duration-300 ease-out hover:scale-[1.02]"
                          style={{ borderColor: themeTokens.cardBorder }}>{t.cancel}</button>
                  <button type="submit" disabled={!dName || !dTotal || !dCount}
                          className="flex-1 py-3 rounded-full text-sm font-bold text-white disabled:opacity-50 shadow-md transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-lg"
                          style={{ background: COLORS.blue }}>{t.save}</button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {debtsState.length === 0 && !showForm && (
        <GlassCard className="p-10 text-center">
          <Users size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm" style={{ color: themeTokens.textMuted }}>No debts tracked. Clean slate. Hit ADD DEBT to start an installment plan.</p>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-fr">
         {debtsState.map(debt => {
            // Normalize: support both new (totalDebit/installmentCount/monthlyAmount)
            // and any legacy shape that lingers.
            const totalDebit = Number(debt.totalDebit ?? debt.total ?? 0);
            const installmentCount = Number(debt.installmentCount ?? 0);
            const monthlyAmount = Number(debt.monthlyAmount ?? debt.monthly ?? 0);

            // Derive paid/remaining from actual installment transactions (by debtId).
            const linkedTxs = transactions
              .filter(tx => tx.debtId === debt.id && tx.locked)
              .sort((a, b) => new Date(a.date) - new Date(b.date));
            const paidTxs = linkedTxs.filter(tx => new Date(tx.date) <= now);
            const upcomingTxs = linkedTxs.filter(tx => new Date(tx.date) > now);
            const amountPaid = paidTxs.reduce((s, tx) => s + tx.amount, 0);
            const remainingBalance = Math.max(0, totalDebit - amountPaid);
            const remainingPayments = upcomingTxs.length;
            const nextPayment = upcomingTxs[0];
            const pctPaid = totalDebit > 0 ? (amountPaid / totalDebit) * 100 : 0;
            const isComplete = remainingBalance <= 0.01;

            return (
              <GlassCard key={debt.id} className="p-6 h-full group transition-all duration-300 ease-out hover:shadow-xl">
                <div className="flex items-start justify-between mb-4 gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold truncate">{debt.name}</h3>
                    {installmentCount > 0 && (
                      <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: themeTokens.textMuted }}>
                        {installmentCount} installments · monthly
                        {isComplete && <span className="ml-2 px-1.5 py-0.5 rounded font-bold" style={{ background: `${COLORS.green}20`, color: COLORS.green }}>PAID OFF</span>}
                      </p>
                    )}
                  </div>
                  <button onClick={() => deleteDebt(debt.id)}
                          className="opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out p-2 rounded-full hover:scale-110"
                          style={{ color: COLORS.red, background: `${COLORS.red}15` }}
                          aria-label={`Delete debt ${debt.name}`}>
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* 1. Total Debit */}
                  <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: themeTokens.cardBorder }}>
                    <Label>Total Debit</Label>
                    <span className="font-mono font-bold text-lg">{formatBRL(totalDebit)}</span>
                  </div>

                  {/* 2. Monthly installment (read-only, auto-computed) */}
                  <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: themeTokens.cardBorder }}>
                    <Label>Monthly Installment</Label>
                    <span className="font-mono font-bold text-lg" style={{ color: COLORS.blue }}>{formatBRL(monthlyAmount)}</span>
                  </div>

                  {/* 3. Remaining balance */}
                  <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: themeTokens.cardBorder }}>
                    <Label>Remaining Balance</Label>
                    <span className="font-mono font-bold text-lg" style={{ color: isComplete ? COLORS.green : COLORS.red }}>
                      {formatBRL(remainingBalance)}
                    </span>
                  </div>

                  {/* 4. Number of remaining payments */}
                  <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: themeTokens.cardBorder }}>
                    <Label>Remaining Payments</Label>
                    <div className="text-right">
                      <span className="font-mono font-bold text-lg">{remainingPayments}</span>
                      <span className="font-mono text-sm ml-1" style={{ color: themeTokens.textMuted }}>/ {installmentCount}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="pt-1">
                    <div className="flex justify-between items-center mb-1.5">
                      <Label>Progress</Label>
                      <span className="text-xs font-bold" style={{ color: COLORS.green }}>{pctPaid.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: themeTokens.grid }}>
                      <motion.div initial={{width:0}} animate={{width:`${Math.min(100, pctPaid)}%`}}
                                  transition={{duration: 1, ease: 'easeOut'}}
                                  className="h-full rounded-full"
                                  style={{ background: `linear-gradient(90deg, ${COLORS.blue}, ${COLORS.green})` }} />
                    </div>
                  </div>

                  {/* Next payment row */}
                  {nextPayment && (
                    <div className="flex justify-between items-center p-3 rounded-2xl mt-2" style={{ background: themeTokens.buttonBg }}>
                      <div>
                        <Label>Next Payment</Label>
                        <p className="text-xs mt-0.5" style={{ color: themeTokens.textMuted }}>
                          {new Date(nextPayment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <span className="font-mono font-black" style={{ color: COLORS.yellow }}>
                        {formatBRL(nextPayment.amount)}
                      </span>
                    </div>
                  )}
                </div>
              </GlassCard>
            )
         })}
      </div>
    </div>
  );
};

// =============================================================
// APPLE-STYLE MINI CALENDAR — Theme-Inverted + Page-Flip
// -------------------------------------------------------------
// • Inverts colors relative to the system theme (light↔dark).
// • Premium 3D page-turn animation when changing months.
// • Glassmorphism: soft blur, low-opacity layers, subtle shadows.
// • Tap a date to assign it to the active range button
//   (First Payment / Last Payment) handed in by the parent.
// =============================================================
const enumerateMonths = (start, end) => {
  if (!start || !end) return [];
  let s = new Date(start), e = new Date(end);
  if (s > e) { const tmp = s; s = e; e = tmp; }
  const out = [];
  const cursor = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  while (cursor <= e) {
    out.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
};

const AppleMiniCalendar = ({ firstDate, lastDate, mode, onSelect }) => {
  const { theme } = useAppContext();
  // Inverted theme tokens — opposite of the system theme.
  const inv = theme === 'dark' ? THEME.light : THEME.dark;
  const invSurface = theme === 'dark'
    ? 'rgba(255,255,255,0.78)'
    : 'rgba(28,28,30,0.85)';
  const invDivider = theme === 'dark'
    ? 'rgba(0,0,0,0.08)'
    : 'rgba(255,255,255,0.10)';

  const seed = firstDate || lastDate || new Date();
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(seed);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [direction, setDirection] = useState(0);

  const year  = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDow   = new Date(year, month, 1).getDay();
  const daysInMo   = new Date(year, month + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMo; d++) cells.push(new Date(year, month, d));

  const sameDay = (a, b) => a && b && new Date(a).toDateString() === new Date(b).toDateString();
  const inRange = (d) => {
    if (!firstDate || !lastDate) return false;
    const t = d.getTime();
    const f = new Date(firstDate).getTime();
    const l = new Date(lastDate).getTime();
    return t > Math.min(f, l) && t < Math.max(f, l);
  };

  const goPrev = () => { setDirection(-1); setViewMonth(new Date(year, month - 1, 1)); };
  const goNext = () => { setDirection(1);  setViewMonth(new Date(year, month + 1, 1)); };
  const ymKey = `${year}-${month}`;

  return (
    <div className="rounded-2xl p-3.5 border backdrop-blur-2xl"
         style={{
           background: invSurface,
           borderColor: inv.cardBorder,
           boxShadow: `0 14px 40px ${theme === 'dark' ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.45)'}, inset 0 1px 0 ${invDivider}`,
           color: inv.text,
           WebkitBackdropFilter: 'blur(24px)',
         }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <motion.button type="button" onClick={goPrev}
                whileTap={{ scale: 0.88 }}
                whileHover={{ background: `${COLORS.red}1a` }}
                className="p-1.5 rounded-full transition-colors"
                style={{ color: COLORS.red }}>
          <ChevronLeft size={16}/>
        </motion.button>
        <span className="text-sm font-bold tracking-tight" style={{ color: inv.text }}>{monthLabel}</span>
        <motion.button type="button" onClick={goNext}
                whileTap={{ scale: 0.88 }}
                whileHover={{ background: `${COLORS.red}1a` }}
                className="p-1.5 rounded-full transition-colors"
                style={{ color: COLORS.red }}>
          <ChevronRight size={16}/>
        </motion.button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 mb-1.5 pb-1.5"
           style={{ borderBottom: `1px solid ${invDivider}` }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-[9px] uppercase tracking-[0.18em] font-semibold"
               style={{ color: inv.textMuted }}>{d}</div>
        ))}
      </div>

      {/* 3D Page-Flip Stage — popLayout avoids nested wait-mode deadlocks */}
      <div className="relative" style={{ perspective: 1400 }}>
        <AnimatePresence custom={direction} initial={false} mode="popLayout">
          <motion.div
            key={ymKey}
            custom={direction}
            initial={{ rotateY: direction > 0 ? 78 : direction < 0 ? -78 : 0, opacity: 0, filter: 'blur(2px)' }}
            animate={{ rotateY: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ rotateY: direction > 0 ? -78 : 78, opacity: 0, filter: 'blur(2px)' }}
            transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
            style={{
              transformStyle: 'preserve-3d',
              transformOrigin: 'center center',
              backfaceVisibility: 'hidden',
            }}
            className="grid grid-cols-7 gap-1"
          >
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="aspect-square" />;
              const isFirst  = sameDay(d, firstDate);
              const isLast   = sameDay(d, lastDate);
              const isToday  = sameDay(d, today);
              const between  = inRange(d);
              const selected = isFirst || isLast;
              const bg = isFirst ? COLORS.blue
                       : isLast  ? COLORS.green
                       : between ? `${COLORS.blue}26`
                       : 'transparent';
              return (
                <motion.button
                  key={i}
                  type="button"
                  onClick={() => onSelect(d)}
                  whileTap={{ scale: 0.85 }}
                  whileHover={!selected ? { background: `${COLORS.blue}1a` } : undefined}
                  transition={{ type: 'spring', stiffness: 520, damping: 22 }}
                  className="aspect-square text-xs rounded-full flex items-center justify-center transition-colors duration-200"
                  style={{
                    background: bg,
                    color: selected ? '#fff' : isToday ? COLORS.red : inv.text,
                    fontWeight: selected || isToday ? 700 : 500,
                    boxShadow: selected ? `0 4px 12px ${isFirst ? COLORS.blue : COLORS.green}55` : 'none',
                  }}>
                  {d.getDate()}
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
        {/* Soft fold-edge shadow that pulses with direction */}
        <AnimatePresence>
          {direction !== 0 && (
            <motion.div
              key={`fold-${ymKey}`}
              initial={{ opacity: 0.55 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.32, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-y-0 w-1.5 rounded-full"
              style={{
                left: direction > 0 ? '50%' : 'auto',
                right: direction < 0 ? '50%' : 'auto',
                background: `linear-gradient(${direction > 0 ? '90deg' : '270deg'}, rgba(0,0,0,0.18), transparent)`,
              }} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const TransactionsPage = () => {
  const { t, transactions, addTransaction, deleteTransaction, handleClearHistory, debtsState, themeTokens } = useAppContext();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('General');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Debit/Cash');
  const [debtId, setDebtId] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileRef = useRef(null);

  // — Recurring / installment scheduling UI state (additive, non-intrusive) —
  const [recurring, setRecurring]               = useState(false);
  const [recurringIncome, setRecurringIncome]   = useState(false);
  const [firstPayment, setFirstPayment]         = useState(null);
  const [lastPayment, setLastPayment]           = useState(null);
  const [calendarMode, setCalendarMode]         = useState('first'); // 'first' | 'last'
  const [installments, setInstallments]         = useState(1);

  const handleCalendarSelect = (d) => {
    if (calendarMode === 'first') setFirstPayment(d);
    else setLastPayment(d);
  };
  const isExpense   = type === 'expense';
  const isIncome    = type === 'income';
  const isCash      = paymentMethod === 'Debit/Cash';
  const isCard      = paymentMethod === 'VISA Mercado Pago' || paymentMethod === 'Nubank MasterCard';
  const cashRecurring   = isExpense && isCash && recurring;
  const incomeRecurring = isIncome && recurringIncome;
  const showCalendar    = cashRecurring || (isExpense && isCard) || incomeRecurring;

  const categories = ["General", "Clothing", "Motorcycle", "Uber", "Utilities", "Rent", "Entertainment", "Health", "Salary", "Freelance", "Travel", "Restaurants", "Zaffari", "Debt Payment"];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !description) return;
    const baseAmt = Number(amount);
    const base = {
      description,
      type,
      category,
      paymentMethod: isExpense ? paymentMethod : 'Debit/Cash',
      debtId: category === 'Debt Payment' ? debtId : null,
    };

    // — Recurring (Cash expense OR Income) — distribute across selected month range
    if ((cashRecurring || incomeRecurring) && firstPayment && lastPayment) {
      const dates = enumerateMonths(firstPayment, lastPayment);
      dates.forEach((d, i) => addTransaction({
        ...base,
        amount: baseAmt,
        date: d.toISOString(),
        isRecurring: true,
        recurringGroup: `rec-${Date.now()}-${i}`,
      }));
    }
    // — Card with installments > 1 — split into N monthly charges starting at txDate
    else if (isExpense && isCard && installments > 1) {
      const start = new Date(firstPayment || txDate);
      const per = baseAmt / installments;
      for (let i = 0; i < installments; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
        addTransaction({
          ...base,
          description: `${description} ${i + 1}/${installments}`,
          amount: per,
          date: d.toISOString(),
          installmentIndex: i + 1,
          installmentTotal: installments,
        });
      }
    }
    // — Single transaction (default behavior preserved) —
    else {
      addTransaction({
        ...base,
        amount: baseAmt,
        date: new Date(firstPayment || txDate).toISOString(),
      });
    }

    // Reset form state
    setDescription(''); setAmount('');
    setFirstPayment(null); setLastPayment(null);
    setRecurring(false); setRecurringIncome(false);
    setInstallments(1); setCalendarMode('first');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length <= 1) return;
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

        lines.slice(1).forEach((line, index) => {
          const vals = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/(^"|"$)/g, '').trim()) || line.split(',').map(v => v.trim());
          const row = {};
          headers.forEach((h, j) => { row[h] = vals[j] || ''; });

          if (row.Amount && !isNaN(parseFloat(row.Amount))) {
            addTransaction({
              id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
              description: row.Description || 'Imported',
              amount: parseFloat(row.Amount),
              type: row.Type?.toLowerCase() === 'income' ? 'income' : 'expense',
              category: row.Category || 'General',
              paymentMethod: row['Payment Method'] || 'Debit/Cash',
              date: new Date(row.Date || Date.now()).toISOString()
            });
          }
        });
      } catch (err) {
        console.error("CSV Import Error", err);
      }
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Payment Method'];
    let csv = headers.join(',') + '\n';
    const userTxs = transactions.filter(t => !t.locked);
    if(userTxs.length > 0) {
      userTxs.forEach(tx => { csv += `${new Date(tx.date).toISOString().split('T')[0]},"${tx.description}",${tx.amount},${tx.type},"${tx.category}","${tx.paymentMethod}"\n`; });
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = userTxs.length > 0 ? 'myexpenses_export.csv' : 'template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
         <h2 className="text-2xl font-bold tracking-tight">{t.transactions}</h2>
         <div className="flex gap-2 flex-wrap">
           <input type="file" accept=".csv" ref={fileRef} onChange={handleImport} className="hidden" />
           <button onClick={() => fileRef.current?.click()} className="bg-[#107c41] text-black px-5 py-2.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1.5 transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-lg"><Upload size={14}/> {t.importCsv}</button>
           <button onClick={exportCSV} className="bg-[#107c41] text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1.5 transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-lg"><Download size={14}/> {t.exportCsv}</button>
           <div className="relative">
             <button onClick={() => setShowClearConfirm(true)} className="px-5 py-2.5 rounded-full text-xs font-bold border transition-all duration-300 ease-out flex items-center gap-1.5 hover:bg-red-500 hover:text-white hover:border-red-500 hover:scale-[1.03]" style={{ color: COLORS.red, borderColor: COLORS.red }}>
               <Trash2 size={14}/> {t.clearHistory}
             </button>
             {showClearConfirm && (
               <div className="absolute top-12 right-0 border shadow-2xl rounded-xl p-4 w-56 z-50 backdrop-blur-3xl" style={{ background: themeTokens.card, borderColor: themeTokens.cardBorder }}>
                 <p className="text-xs font-bold text-center mb-1" style={{ color: COLORS.red }}>{t.deleteConfirm}</p>
                 <p className="text-[10px] text-center mb-3" style={{ color: themeTokens.textMuted }}>Locked fixed costs are preserved.</p>
                 <div className="flex gap-2">
                   <button onClick={() => setShowClearConfirm(false)} className="flex-1 rounded-lg py-1.5 text-xs font-bold" style={{ background: themeTokens.buttonBg }}>{t.cancel}</button>
                   <button onClick={() => { handleClearHistory(); setShowClearConfirm(false); }} className="flex-1 text-white rounded-lg py-1.5 text-xs font-bold" style={{ background: COLORS.red }}>{t.delete}</button>
                 </div>
               </div>
             )}
           </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">

          <GlassCard className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <PlusCircle size={18} color={COLORS.blue} /> {t.newEntry}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
               <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.description} className="w-full bg-transparent border rounded-xl px-4 py-3 outline-none text-sm focus:border-blue-500 transition-colors" style={{ borderColor: themeTokens.cardBorder }} />
               <div className="grid grid-cols-2 gap-4">
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t.amount} className="w-full bg-transparent border rounded-xl px-4 py-3 outline-none text-sm focus:border-blue-500 transition-colors" style={{ borderColor: themeTokens.cardBorder }} />
                  <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-transparent border rounded-xl px-4 py-3 outline-none text-sm focus:border-blue-500 transition-colors" style={{ borderColor: themeTokens.cardBorder }}>
                     <option value="expense">Expense</option>
                     <option value="income">Income</option>
                  </select>
               </div>
               <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-transparent border rounded-xl px-4 py-3 outline-none text-sm focus:border-blue-500 transition-colors" style={{ borderColor: themeTokens.cardBorder }}>
                 {categories.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
               {category === 'Debt Payment' && (
                 <select value={debtId} onChange={(e) => setDebtId(e.target.value)} className="w-full bg-transparent border rounded-xl px-4 py-3 outline-none text-sm focus:border-blue-500 transition-colors" style={{ borderColor: themeTokens.cardBorder }} required>
                    <option value="">Select Debt...</option>
                    {debtsState.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                 </select>
               )}
               <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} className="w-full bg-transparent border rounded-xl px-4 py-3 outline-none text-sm focus:border-blue-500 transition-colors" style={{ borderColor: themeTokens.cardBorder }} />
               {type === 'expense' && (
                  <div className="flex gap-2">
                    {['Debit/Cash', 'VISA Mercado Pago', 'Nubank MasterCard'].map(p => (
                       <button key={p} type="button" onClick={()=>setPaymentMethod(p)} className={`flex-1 py-2 text-[10px] rounded-lg font-bold border transition-colors flex flex-col items-center justify-center gap-1 ${paymentMethod === p ? 'text-white border-transparent shadow-md' : ''}`}
                          style={{ background: paymentMethod === p ? (p === 'Nubank MasterCard' ? '#820AD1' : p === 'VISA Mercado Pago' ? '#000' : COLORS.blue) : 'transparent', borderColor: paymentMethod !== p ? themeTokens.cardBorder : 'transparent' }}>
                         {p !== 'Debit/Cash' && <CardIcon size={12}/>}
                         {p === 'Debit/Cash' ? t.cash : p.split(' ')[0]}
                       </button>
                    ))}
                  </div>
               )}

               {/* — Cash + Recurring toggle — */}
               {type === 'expense' && isCash && (
                 <div className="flex items-center justify-between rounded-xl border px-4 py-3"
                      style={{ borderColor: themeTokens.cardBorder, background: themeTokens.buttonBg }}>
                   <span className="text-xs font-semibold tracking-tight">Recurring</span>
                   <button
                     type="button"
                     onClick={() => setRecurring(v => !v)}
                     aria-pressed={recurring}
                     className="relative w-11 h-6 rounded-full transition-colors duration-300"
                     style={{ background: recurring ? COLORS.green : `${themeTokens.cardBorder}` }}>
                     <motion.span
                       layout
                       transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                       className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow"
                       style={{ left: recurring ? 22 : 2 }} />
                   </button>
                 </div>
               )}

               {/* — Income: Recurring Income toggle — */}
               {type === 'income' && (
                 <div className="flex items-center justify-between rounded-xl border px-4 py-3"
                      style={{ borderColor: themeTokens.cardBorder, background: themeTokens.buttonBg }}>
                   <span className="text-xs font-semibold tracking-tight flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS.green }} />
                     Recurring Income
                   </span>
                   <button
                     type="button"
                     onClick={() => setRecurringIncome(v => !v)}
                     aria-pressed={recurringIncome}
                     className="relative w-11 h-6 rounded-full transition-colors duration-300"
                     style={{ background: recurringIncome ? COLORS.green : `${themeTokens.cardBorder}` }}>
                     <motion.span
                       layout
                       transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                       className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow"
                       style={{ left: recurringIncome ? 22 : 2 }} />
                   </button>
                 </div>
               )}

               {/* — Apple-style calendar + range buttons — */}
               <AnimatePresence initial={false}>
                 {showCalendar && (
                   <motion.div
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: 'auto' }}
                     exit={{ opacity: 0, height: 0 }}
                     transition={{ duration: 0.25, ease: 'easeOut' }}
                     className="space-y-3 overflow-hidden">
                     <div className="grid grid-cols-2 gap-2">
                       <button type="button" onClick={() => setCalendarMode('first')}
                               className="rounded-xl px-3 py-2.5 text-[11px] font-bold border transition-all"
                               style={{
                                 background: calendarMode === 'first' ? COLORS.blue : 'transparent',
                                 color: calendarMode === 'first' ? '#fff' : themeTokens.text,
                                 borderColor: calendarMode === 'first' ? 'transparent' : themeTokens.cardBorder,
                               }}>
                         <div className="text-[8px] uppercase tracking-widest opacity-70">First Payment</div>
                         <div className="text-xs font-mono mt-0.5">
                           {firstPayment ? new Date(firstPayment).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'}
                         </div>
                       </button>
                       <button type="button" onClick={() => setCalendarMode('last')}
                               className="rounded-xl px-3 py-2.5 text-[11px] font-bold border transition-all"
                               style={{
                                 background: calendarMode === 'last' ? COLORS.green : 'transparent',
                                 color: calendarMode === 'last' ? '#fff' : themeTokens.text,
                                 borderColor: calendarMode === 'last' ? 'transparent' : themeTokens.cardBorder,
                               }}>
                         <div className="text-[8px] uppercase tracking-widest opacity-70">Last Payment</div>
                         <div className="text-xs font-mono mt-0.5">
                           {lastPayment ? new Date(lastPayment).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'}
                         </div>
                       </button>
                     </div>

                     <AppleMiniCalendar
                       firstDate={firstPayment}
                       lastDate={lastPayment}
                       mode={calendarMode}
                       onSelect={handleCalendarSelect}
                     />

                     {/* — Card-only: Installments dropdown — */}
                     {isCard && (
                       <div>
                         <div className="text-[9px] uppercase tracking-widest mb-1.5 px-1"
                              style={{ color: themeTokens.textMuted }}>Installments</div>
                         <select
                           value={installments}
                           onChange={(e) => setInstallments(Number(e.target.value))}
                           className="w-full bg-transparent border rounded-xl px-4 py-3 outline-none text-sm focus:border-blue-500 transition-colors"
                           style={{ borderColor: themeTokens.cardBorder }}>
                           {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                             <option key={n} value={n}>{n}x</option>
                           ))}
                         </select>
                       </div>
                     )}
                   </motion.div>
                 )}
               </AnimatePresence>
               <button type="submit" disabled={!amount || !description} className="w-full py-3.5 rounded-full text-white font-bold transition-all duration-300 ease-out disabled:opacity-50 shadow-md hover:shadow-xl hover:scale-[1.02]" style={{ background: COLORS.blue }}>
                 {t.addTransaction}
               </button>
            </form>
          </GlassCard>
        </div>

        <GlassCard className="lg:col-span-2 p-6">
          <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scroll pr-2">
            <AnimatePresence>
              {transactions.length === 0 ? (
                <div className="text-center py-10" style={{ color: themeTokens.textMuted }}>No transactions found</div>
              ) : transactions.map(tx => (
                <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} key={tx.id} className="flex justify-between items-center p-3 rounded-xl border transition-all group" style={{ borderColor: themeTokens.cardBorder, background: themeTokens.buttonBg }}>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm flex items-center gap-2 truncate">
                      {tx.locked && <Lock size={10} style={{color: themeTokens.textMuted}} />}
                      <span className="truncate">{tx.description}</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-widest mt-1" style={{ color: themeTokens.textMuted }}>{new Date(tx.date).toLocaleDateString()} · {tx.category} · {tx.paymentMethod}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                     <span className="font-mono font-bold whitespace-nowrap" style={{ color: tx.type === 'income' ? COLORS.green : themeTokens.text }}>
                       {tx.type === 'income' ? '+' : '-'}{formatBRL(tx.amount)}
                     </span>
                     {!tx.locked && (
                       <button onClick={() => deleteTransaction(tx.id)} className="opacity-0 group-hover:opacity-100 transition-colors p-1" style={{ color: COLORS.red }}>
                         <Trash2 size={16} />
                       </button>
                     )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

// =============================================================
// GRAPH PAGE — Apple Stocks-inspired native charts
// -------------------------------------------------------------
// Flat aesthetic: no gridlines, smooth monotone curves, subtle
// drop shadow from shadowDefs, large headline numeric + delta,
// iOS-style segmented timeframe chip row at the bottom.
// Accent colors follow Stocks conventions:
//   • green for positive movement
//   • red   for negative movement
// Background uses the ambient card tone (dark on dark mode,
// bright on light mode), matching the rest of the app.
// =============================================================
// Max value enforced across all Graph-tab charts (BRL).
const GRAPH_MAX = 10000;
const capGraph = (v) => Math.min(GRAPH_MAX, Math.max(0, v || 0));

// Unified 14-month window: prev month → current → next → … → +12 months.
// All 4 graphs share this exact same series so they are always in sync.
const useGraphSeries = (transactions) =>
  useMemo(() => {
    const now = new Date();
    // Window starts 1 month before current month
    const windowStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const TOTAL = 14; // 1 prev + 1 current + 12 forward

    let runningCash = 0;
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (d >= windowStart) return;
      if (tx.type === 'income') runningCash += tx.amount;
      else if (tx.paymentMethod === 'Debit/Cash') runningCash -= tx.amount;
    });

    return Array.from({ length: TOTAL }, (_, i) => {
      const d    = new Date(windowStart.getFullYear(), windowStart.getMonth() + i, 1);
      const next = new Date(windowStart.getFullYear(), windowStart.getMonth() + i + 1, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const isCurrent = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      const isFuture  = d > now;

      const monthTx = transactions.filter(tx => { const td = new Date(tx.date); return td >= d && td < next; });
      const income   = monthTx.filter(x => x.type === 'income').reduce((s, x) => s + x.amount, 0);
      const fixed    = monthTx.filter(x => x.type === 'expense' && (x.isFixed || x.isRecurring || x.locked)).reduce((s, x) => s + x.amount, 0);
      const variable = monthTx.filter(x => x.type === 'expense' && !x.isFixed && !x.isRecurring && !x.locked).reduce((s, x) => s + x.amount, 0);
      const expenses = fixed + variable;
      const cashOut  = monthTx.filter(x => x.type === 'expense' && x.paymentMethod === 'Debit/Cash').reduce((s, x) => s + x.amount, 0);
      runningCash += income - cashOut;

      return {
        name: label, isCurrent, isFuture,
        income:   capGraph(income),
        fixed:    capGraph(fixed),
        variable: capGraph(variable),
        expenses: capGraph(expenses),
        cash:     capGraph(runningCash),
      };
    });
  }, [transactions]);

// Shared tooltip style builder
const gTooltip = (themeTokens) => ({
  background: themeTokens.tooltipBg,
  border: `1px solid ${themeTokens.cardBorder}`,
  borderRadius: 12,
  color: themeTokens.text,
  fontSize: 11,
  boxShadow: themeTokens.shadow,
});

// ── 1. Cash Flow / Income area chart (reused for both) ──────────────────────
const AppleStockChart = ({ title, data, dataKey, accent, positive, headline, delta }) => {
  const { themeTokens } = useAppContext();
  const gradId = `ag-${dataKey}-${accent.replace('#', '')}`;
  return (
    <GlassCard className="p-5 sm:p-7 h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
        <div className="text-right shrink-0">
          <p className="font-mono font-black text-xl sm:text-2xl leading-none">{headline}</p>
          {delta != null && (
            <p className="text-xs font-bold mt-1" style={{ color: positive ? COLORS.green : COLORS.red }}>
              {positive ? '▲' : '▼'} {delta}
            </p>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0" style={{ minHeight: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              {shadowDefs.props.children}
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor={accent} stopOpacity={0.38} />
                <stop offset="100%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" tick={{ fill: themeTokens.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, GRAPH_MAX]} />
            <Tooltip cursor={{ stroke: themeTokens.textMuted, strokeWidth: 1, strokeDasharray: '3 3' }}
                     contentStyle={gTooltip(themeTokens)} formatter={(v) => formatBRL(v)} />
            <Area type="monotone" dataKey={dataKey}
                  stroke={accent} strokeWidth={2.25} strokeLinecap="round"
                  fill={`url(#${gradId})`} filter="url(#chart-shadow)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: themeTokens.bg, fill: accent,
                               style: { transition: 'r 150ms ease-out, opacity 150ms ease-out' } }}
                  isAnimationActive animationDuration={700} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
};

// ── 2. Net Income: grouped bars (Fixed + Variable) + Income line ─────────────
const NetCostComboChart = ({ data }) => {
  const { themeTokens } = useAppContext();
  const lastIncome   = data[data.length - 1]?.income   || 0;
  const lastFixed    = data[data.length - 1]?.fixed    || 0;
  const lastVariable = data[data.length - 1]?.variable || 0;
  return (
    <GlassCard className="p-5 sm:p-7 h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <h3 className="text-lg font-bold tracking-tight">Net Income</h3>
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider shrink-0"
             style={{ color: themeTokens.textMuted }}>
          <span style={{ color: COLORS.red    }}>■ Fixed</span>
          <span style={{ color: COLORS.yellow }}>■ Variable</span>
          <span style={{ color: COLORS.green  }}>— Income</span>
        </div>
      </div>
      <div className="flex-1 min-h-0" style={{ minHeight: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
                         barCategoryGap="28%" barGap={2}>
            <defs>
              {shadowDefs.props.children}
              <linearGradient id="nc-inc-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor={COLORS.green} stopOpacity={0.25} />
                <stop offset="100%" stopColor={COLORS.green} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" tick={{ fill: themeTokens.textMuted, fontSize: 10 }}
                   axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, GRAPH_MAX]} />
            <Tooltip contentStyle={gTooltip(themeTokens)} formatter={(v) => formatBRL(v)}
                     cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            {/* Background income wave */}
            <Area type="monotone" dataKey="income"
                  stroke={COLORS.green} strokeWidth={2} strokeLinecap="round"
                  fill="url(#nc-inc-grad)" dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: themeTokens.bg, fill: COLORS.green }}
                  isAnimationActive animationDuration={700} />
            {/* Foreground grouped bars */}
            <Bar dataKey="fixed" name="Fixed" fill={COLORS.red} radius={[5, 5, 0, 0]}
                 isAnimationActive animationDuration={600}
                 activeBar={{ fill: COLORS.red, opacity: 0.85, style: { transition: 'opacity 150ms ease-out, transform 150ms ease-out', transformOrigin: 'bottom', transform: 'scaleY(1.04)' } }} />
            <Bar dataKey="variable" name="Variable" fill={COLORS.yellow} radius={[5, 5, 0, 0]}
                 isAnimationActive animationDuration={650}
                 activeBar={{ fill: COLORS.yellow, opacity: 0.85, style: { transition: 'opacity 150ms ease-out, transform 150ms ease-out', transformOrigin: 'bottom', transform: 'scaleY(1.04)' } }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-3 mt-4 pt-3 border-t" style={{ borderColor: themeTokens.cardBorder }}>
        <div className="flex-1 text-center">
          <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: themeTokens.textMuted }}>Income</p>
          <p className="font-mono font-black text-sm mt-0.5" style={{ color: COLORS.green }}>{formatCompact(lastIncome)}</p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: themeTokens.textMuted }}>Fixed</p>
          <p className="font-mono font-black text-sm mt-0.5" style={{ color: COLORS.red }}>{formatCompact(lastFixed)}</p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: themeTokens.textMuted }}>Variable</p>
          <p className="font-mono font-black text-sm mt-0.5" style={{ color: COLORS.yellow }}>{formatCompact(lastVariable)}</p>
        </div>
      </div>
    </GlassCard>
  );
};

// ── 3. Expenses Pie — live from transaction categories ───────────────────────
const PIE_PALETTE = [COLORS.red, COLORS.orange, COLORS.yellow, COLORS.blue, COLORS.purple, COLORS.green, COLORS.gray];

const ExpensePieChart = ({ transactions }) => {
  const { themeTokens } = useAppContext();
  const [activeIdx, setActiveIdx] = useState(null);

  const slices = useMemo(() => {
    const now = new Date();
    const windowStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const windowEnd   = new Date(now.getFullYear(), now.getMonth() + 13, 1);
    const buckets = {};
    transactions.forEach(tx => {
      if (tx.type !== 'expense') return;
      const d = new Date(tx.date);
      if (d < windowStart || d >= windowEnd) return;
      const key = tx.category || 'General';
      buckets[key] = (buckets[key] || 0) + tx.amount;
    });
    return Object.entries(buckets)
      .map(([name, value]) => ({ name, value: capGraph(value) }))
      .filter(s => s.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [transactions]);

  const total = slices.reduce((s, x) => s + x.value, 0);

  return (
    <GlassCard className="p-5 sm:p-7 h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <h3 className="text-lg font-bold tracking-tight">Expenses by Category</h3>
        <p className="font-mono font-black text-xl sm:text-2xl leading-none shrink-0">
          {formatCompact(total)}
        </p>
      </div>
      <div className="flex-1 min-h-0" style={{ minHeight: 200 }}>
        {slices.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-center" style={{ color: themeTokens.textMuted }}>
              No expense data in current window.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>{shadowDefs.props.children}</defs>
              <Pie data={slices} dataKey="value" nameKey="name"
                   innerRadius="52%" outerRadius="78%"
                   paddingAngle={3} stroke="none"
                   filter="url(#chart-shadow)"
                   isAnimationActive animationDuration={700}
                   activeIndex={activeIdx}
                   activeShape={(props) => {
                     const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                     return <Sector cx={cx} cy={cy} innerRadius={innerRadius}
                                    outerRadius={outerRadius + 8}
                                    startAngle={startAngle} endAngle={endAngle}
                                    fill={fill} opacity={1} />;
                   }}
                   onMouseEnter={(_, idx) => setActiveIdx(idx)}
                   onMouseLeave={() => setActiveIdx(null)}
                   onTouchStart={(_, idx) => setActiveIdx(idx)}
                   onTouchEnd={() => setActiveIdx(null)}>
                {slices.map((_, i) => (
                  <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]}
                        style={{ cursor: 'pointer', transition: 'opacity 200ms ease-out' }}
                        opacity={activeIdx === null || activeIdx === i ? 1 : 0.45} />
                ))}
              </Pie>
              <Tooltip contentStyle={gTooltip(themeTokens)} formatter={(v, n) => [formatBRL(v), n]} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-1 mt-3 pt-3 border-t" style={{ borderColor: themeTokens.cardBorder }}>
        {slices.map((s, i) => (
          <div key={s.name} className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }} />
            <span className="text-[10px] font-semibold truncate" style={{ color: themeTokens.textMuted }}>{s.name}</span>
            <span className="ml-auto font-mono text-[10px] font-bold shrink-0">{formatCompact(s.value)}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

// ── GraphPage ────────────────────────────────────────────────────────────────
const GraphPage = () => {
  const { t, transactions, themeTokens } = useAppContext();
  const series = useGraphSeries(transactions);

  const lastOf = (key) => series[series.length - 1]?.[key] || 0;
  const delta = (key) => {
    if (series.length < 2) return { pct: 0, positive: true };
    const first = series[0][key] || 0;
    const last  = lastOf(key);
    const pct   = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
    return { pct, positive: last >= first };
  };

  const cashD   = delta('cash');
  const incomeD = delta('income');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t.graph}</h2>
        <p className="text-xs mt-1" style={{ color: themeTokens.textMuted }}>Graphs Overview</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 auto-rows-fr">

        {/* 1 — Cash Flow */}
        <AppleStockChart
          title="Cash Flow"
          data={series}
          dataKey="cash"
          accent={cashD.positive ? COLORS.green : COLORS.red}
          positive={cashD.positive}
          headline={formatCompact(lastOf('cash'))}
          delta={`${cashD.pct >= 0 ? '+' : ''}${cashD.pct.toFixed(1)}%`}
        />

        {/* 2 — Net Income: fixed+variable bars + income line */}
        <NetCostComboChart data={series} />

        {/* 3 — Income area */}
        <AppleStockChart
          title="Income"
          data={series}
          dataKey="income"
          accent={COLORS.green}
          positive={incomeD.positive}
          headline={formatCompact(lastOf('income'))}
          delta={`${incomeD.pct >= 0 ? '+' : ''}${incomeD.pct.toFixed(1)}%`}
        />

        {/* 4 — Expenses pie by category */}
        <ExpensePieChart transactions={transactions} />

      </div>
    </div>
  );
};

// =============================================================
// TIMELINE PAGE — segmented window + chronological ledger view
// -------------------------------------------------------------
// Lets the user re-slice the entire app's cash-flow concept across
// the six pre-defined windows from getTimeframeRange(). The chosen
// window is published on AppContext as cashTimeframe so the
// LiveCashWidget badge also reshapes in lockstep.
// =============================================================
const TimelinePage = () => {
  const { t, transactions, themeTokens, cashTimeframe, setCashTimeframe } = useAppContext();

  const key = cashTimeframe || 'current';
  const { from, to, label } = useMemo(() => getTimeframeRange(key), [key]);

  const windowTxs = useMemo(() => {
    return transactions
      .filter(tx => {
        const d = new Date(tx.date);
        return d >= from && d < to;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [transactions, from, to]);

  const income    = windowTxs.filter(x => x.type === 'income').reduce((s, x) => s + x.amount, 0);
  const expenses  = windowTxs.filter(x => x.type === 'expense').reduce((s, x) => s + x.amount, 0);
  const cashOnly  = computeBankBalance(transactions, { from, to });

  // Monthly breakdown within the window for the chart
  const monthly = useMemo(() => {
    const byMonth = {};
    windowTxs.forEach(tx => {
      const d = new Date(tx.date);
      const k = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      if (!byMonth[k]) byMonth[k] = { key: k, name: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), income: 0, expenses: 0 };
      if (tx.type === 'income') byMonth[k].income += tx.amount;
      else byMonth[k].expenses += tx.amount;
    });
    return Object.values(byMonth).sort((a, b) => a.key.localeCompare(b.key));
  }, [windowTxs]);

  const segments = [
    { id: 'current',   label: 'Current Month' },
    { id: 'lastNext',  label: 'Last + Next' },
    { id: 'next3',     label: 'Next 3M' },
    { id: 'months6',   label: '6M' },
    { id: 'months12',  label: '12M' },
    { id: 'months36',  label: '36M' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t.timeline}</h2>
          <p className="text-xs mt-1" style={{ color: themeTokens.textMuted }}>
            Window: {label} · {from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' → '}
            {new Date(to.getTime() - 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* iOS-style segmented control */}
      <GlassCard className="p-2">
        <div className="flex flex-wrap gap-1">
          {segments.map(seg => {
            const active = seg.id === key;
            return (
              <button key={seg.id}
                onClick={() => setCashTimeframe(seg.id)}
                className="flex-1 min-w-[92px] px-3 py-2 rounded-[10px] text-[11px] font-semibold transition-all"
                style={{
                  background: active ? themeTokens.text : 'transparent',
                  color: active ? themeTokens.bg : themeTokens.textMuted,
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.12)' : 'none'
                }}>
                {seg.label}
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* Headline stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 auto-rows-fr">
        <GlassCard className="p-5 sm:p-6 h-full">
          <Label>Income</Label>
          <p className="text-2xl sm:text-3xl font-black mt-2 break-all" style={{ color: COLORS.green }}>
            {formatBRL(income)}
          </p>
          <p className="text-[10px] mt-1" style={{ color: themeTokens.textMuted }}>within window</p>
        </GlassCard>
        <GlassCard className="p-5 sm:p-6 h-full">
          <Label>Expenses</Label>
          <p className="text-2xl sm:text-3xl font-black mt-2 break-all" style={{ color: COLORS.red }}>
            {formatBRL(expenses)}
          </p>
          <p className="text-[10px] mt-1" style={{ color: themeTokens.textMuted }}>within window</p>
        </GlassCard>
        <GlassCard className="p-5 sm:p-6 h-full">
          <Label>Cash Flow (Debit/Cash)</Label>
          <p className="text-2xl sm:text-3xl font-black mt-2 break-all"
             style={{ color: cashOnly >= 0 ? COLORS.green : COLORS.red }}>
            {formatBRL(cashOnly)}
          </p>
          <p className="text-[10px] mt-1" style={{ color: themeTokens.textMuted }}>drives the Bank Balance badge</p>
        </GlassCard>
      </div>

      {/* Apple-style monthly chart */}
      <GlassCard className="p-5 sm:p-7">
        <h3 className="text-lg font-bold tracking-tight mb-4">Monthly Flow</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={monthly} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <defs>
              {shadowDefs.props.children}
              <linearGradient id="timeline-inc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor={COLORS.green} stopOpacity={0.35} />
                <stop offset="100%" stopColor={COLORS.green} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="timeline-exp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor={COLORS.red} stopOpacity={0.3} />
                <stop offset="100%" stopColor={COLORS.red} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" tick={{ fill: themeTokens.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: themeTokens.tooltipBg, border: `1px solid ${themeTokens.cardBorder}`, borderRadius: 12, color: themeTokens.text, fontSize: 11, boxShadow: themeTokens.shadow }}
              formatter={(v) => formatBRL(v)}
            />
            <Area type="monotone" dataKey="income"   stroke={COLORS.green} strokeWidth={2} fill="url(#timeline-inc)" filter="url(#chart-shadow)" dot={false} />
            <Area type="monotone" dataKey="expenses" stroke={COLORS.red}   strokeWidth={2} fill="url(#timeline-exp)" filter="url(#chart-shadow)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Ledger */}
      <GlassCard className="p-5 sm:p-7">
        <h3 className="text-lg font-bold tracking-tight mb-4">Ledger · {windowTxs.length} entries</h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scroll pr-2">
          {windowTxs.length === 0 && (
            <p className="text-center py-8 text-xs" style={{ color: themeTokens.textMuted }}>
              No transactions in this window.
            </p>
          )}
          {windowTxs.map(tx => (
            <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl border"
                 style={{ borderColor: themeTokens.cardBorder, background: themeTokens.buttonBg }}>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm flex items-center gap-2 truncate">
                  {tx.locked && <Lock size={10} style={{ color: themeTokens.textMuted }} />}
                  <span className="truncate">{tx.description}</span>
                </div>
                <div className="text-[10px] uppercase tracking-widest mt-1" style={{ color: themeTokens.textMuted }}>
                  {new Date(tx.date).toLocaleDateString()} · {tx.category} · {tx.paymentMethod}
                </div>
              </div>
              <span className="font-mono font-bold whitespace-nowrap shrink-0 ml-3"
                    style={{ color: tx.type === 'income' ? COLORS.green : COLORS.red }}>
                {tx.type === 'income' ? '+' : '-'}{formatBRL(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};

const LiveCashWidget = () => {
  const { transactions, themeTokens, cashTimeframe } = useAppContext();
  // Driven by the global cashTimeframe (defaults to 'current'). Same
  // calculation engine that the Timeline tab uses, so the badge and
  // that page always agree.
  const bankBalance = useMemo(
    () => computeBankBalance(transactions, getTimeframeRange(cashTimeframe || 'current')),
    [transactions, cashTimeframe]
  );

  const isNegative = bankBalance < 0;
  const accent = isNegative ? COLORS.red : COLORS.green;
  const tfLabel = (TIMEFRAMES[cashTimeframe || 'current'] || TIMEFRAMES.current).label;

  return (
    <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 pointer-events-none">
      <div className="backdrop-blur-3xl px-4 sm:px-5 py-2.5 sm:py-3 rounded-full shadow-2xl border flex items-center gap-2 sm:gap-3" style={{ background: themeTokens.card, borderColor: themeTokens.cardBorder, WebkitBackdropFilter: 'blur(30px)' }}>
         <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white transition-colors duration-300" style={{ background: accent }}>
           <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
         </div>
         <div>
           <p className="text-[8px] sm:text-[9px] uppercase tracking-widest font-bold mb-0.5" style={{ color: themeTokens.textMuted }}>Bank Balance · {tfLabel}</p>
           <p className="font-mono font-black text-sm sm:text-lg transition-colors duration-300" style={{ color: accent }}>{formatBRL(bankBalance)}</p>
         </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [lang, setLang] = useState('en');
  const [view, setView] = useState('dashboard');

  // Seed transactions with the 36 locked motorcycle installments
  const [transactions, setTransactions] = useState(() => generateMotoInstallments());

  const [savingsTotal, setSavingsTotal] = useState(0);
  const [goalAmount, setGoalAmount] = useState(50000);

  const [goals, setGoals] = useState([]);

  const [netWorthState, setNetWorthState] = useState({
    apartments: [
      { id: 'apt1', name: 'Centro Residence', value: 450000, rent: 2200, dueDate: 5, sqm: 65 },
      { id: 'apt2', name: 'Bela Vista Loft', value: 380000, rent: 1800, dueDate: 10, sqm: 45 }
    ],
    motorcycle: {
      brand: 'Triumph',
      model: 'Street Triple RS',
      segment: 'Supernaked',
      horsepower: 130,
      color: 'Grey',
      value: 72000,
      marketValue: 72000,
      debt: MOTO_INSTALLMENT_AMOUNT * MOTO_INSTALLMENT_COUNT,
      paid: 0,
      fipe: 73000,
      year: '2023'
    }
  });

  // Debts start empty — user adds them dynamically
  const [debtsState, setDebtsState] = useState([]);

  // Global cash-flow window. Timeline tab drives this; LiveCashWidget
  // and anything else that calls computeBankBalance() reads from it.
  const [cashTimeframe, setCashTimeframe] = useState('current');

  const ccStats = useMemo(() => {
    const stats = { 'VISA Mercado Pago': { current: 0, future: 0, total: 0, txs: [] }, 'Nubank MasterCard': { current: 0, future: 0, total: 0, txs: [] } };
    const now = new Date();
    transactions.forEach(tx => {
      if (tx.type === 'expense' && stats[tx.paymentMethod]) {
        const bm = getBillingMonth(tx.date, tx.paymentMethod);
        const cb = getBillingMonth(now.toISOString(), tx.paymentMethod);
        if (bm.getTime() === cb.getTime()) stats[tx.paymentMethod].current += tx.amount;
        else if (bm > cb) stats[tx.paymentMethod].future += tx.amount;
        stats[tx.paymentMethod].total += tx.amount;
        stats[tx.paymentMethod].txs.push(tx);
      }
    });
    stats['VISA Mercado Pago'].txs.sort((a,b) => new Date(b.date) - new Date(a.date));
    stats['Nubank MasterCard'].txs.sort((a,b) => new Date(b.date) - new Date(a.date));
    return stats;
  }, [transactions]);

  const addTransaction = (tx) => {
    setTransactions(prev => {
        const uniqueId = tx.id || `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newTx = { ...tx, id: uniqueId };
        const next = [newTx, ...prev];
        next.sort((a, b) => new Date(b.date) - new Date(a.date));
        return next;
    });
  };

  const deleteTransaction = (id) => setTransactions(prev => prev.filter(t => t.id !== id || t.locked));
  // "Clear History" preserves locked fixed-cost transactions
  const handleClearHistory = () => setTransactions(prev => prev.filter(t => t.locked));
  const addSaving = (amt) => setSavingsTotal(prev => prev + amt);

  const addGoal = (g) => setGoals(prev => [g, ...prev]);
  const deleteGoal = (id) => setGoals(prev => prev.filter(g => g.id !== id));

  const addDebt = (d) => {
    setDebtsState(prev => [...prev, d]);
    // Auto-generate installment transactions (locked/fixed/recurring)
    const installments = generateDebtInstallments(d);
    if (installments.length > 0) {
      setTransactions(prev => {
        const next = [...installments, ...prev];
        next.sort((a, b) => new Date(b.date) - new Date(a.date));
        return next;
      });
    }
  };
  const deleteDebt = (id) => {
    setDebtsState(prev => prev.filter(d => d.id !== id));
    // Remove all linked installment transactions too
    setTransactions(prev => prev.filter(tx => tx.debtId !== id));
  };
  const updateDebt = (id, field, val) => setDebtsState(prev => prev.map(d => d.id === id ? { ...d, [field]: val } : d));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    const style = document.createElement('style');
    style.innerHTML = `
      html, body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "SF Pro", "Helvetica Neue", Helvetica, Arial, sans-serif !important; letter-spacing: -0.01em; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
      *, *::before, *::after { font-family: inherit; }
      input, select, textarea, button { font-family: inherit !important; }
      .font-mono { font-family: "SF Mono", ui-monospace, Menlo, Monaco, "Cascadia Mono", Consolas, monospace !important; }
      .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
      .custom-scroll::-webkit-scrollbar-thumb { background: rgba(134,134,139,0.5); border-radius: 10px; }
      .tabs-scroll::-webkit-scrollbar { display: none; }
      .tabs-scroll { -ms-overflow-style: none; scrollbar-width: none; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, [theme]);

  const themeTokens = THEME[theme];

  const ctxValue = {
    theme, themeTokens, lang, t: T[lang], transactions, addTransaction, deleteTransaction, handleClearHistory,
    ccStats, netWorthState, setNetWorthState,
    debtsState, addDebt, deleteDebt, updateDebt,
    savingsTotal, addSaving, goalAmount, setGoalAmount,
    goals, addGoal, deleteGoal,
    cashTimeframe, setCashTimeframe
  };

  const tabs = [
    { id: 'dashboard', label: T[lang].dashboard, icon: Home },
    { id: 'graph', label: T[lang].graph, icon: BarChart3 },
    { id: 'timeline', label: T[lang].timeline, icon: Clock },
    { id: 'costs', label: T[lang].costs, icon: PieChartIcon },
    { id: 'cards', label: T[lang].cards, icon: CardIcon },
    { id: 'networth', label: T[lang].netWorth, icon: Building2 },
    { id: 'goals', label: T[lang].goals, icon: Flag },
    { id: 'motorcycle', label: T[lang].motorcycle, icon: Bike },
    { id: 'debts', label: T[lang].debts, icon: Users },
    { id: 'transactions', label: T[lang].transactions, icon: Layers }
  ];

  return (
    <AppContext.Provider value={ctxValue}>
      <div className="min-h-screen pb-32 transition-colors duration-500 relative" style={{ background: themeTokens.bg, color: themeTokens.text }}>

        <header className="sticky top-0 z-40 backdrop-blur-3xl border-b shadow-sm" style={{ background: themeTokens.navbar, WebkitBackdropFilter: 'blur(30px)', borderColor: themeTokens.cardBorder }}>
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0" onClick={() => setView('dashboard')}>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-md" style={{ background: COLORS.blue }}>
                <Wallet size={18} />
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight hidden xs:block sm:block">myExpenses</h1>
            </div>

            {/* Tabs — icons only on small, icon+label on md+. Never overflows. */}
            <div className="tabs-scroll flex-1 flex justify-center gap-1 sm:gap-1.5 overflow-x-auto">
              {tabs.map((tab) => {
                const active = view === tab.id;
                return (
                  <button key={tab.id} onClick={() => setView(tab.id)}
                    title={tab.label}
                    className="shrink-0 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap px-2.5 py-2 md:px-3.5"
                    style={{
                       background: active ? themeTokens.text : 'transparent',
                       color: active ? themeTokens.bg : themeTokens.textMuted,
                    }}>
                    <tab.icon size={16} />
                    <span className="hidden md:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button onClick={() => setLang(lang === 'en' ? 'pt' : 'en')} className="font-bold text-[10px] sm:text-xs uppercase px-2 sm:px-3 py-1.5 sm:py-2 rounded-full transition-all border flex items-center gap-1 hover:opacity-80" style={{ borderColor: themeTokens.cardBorder, background: themeTokens.buttonBg }}>
                <Languages size={12}/> {lang === 'en' ? 'PT' : 'EN'}
              </button>
              <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-1.5 sm:p-2 rounded-full transition-all border hover:opacity-80" style={{ borderColor: themeTokens.cardBorder, background: themeTokens.buttonBg }}>
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 relative z-10">
          <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {view === 'dashboard' && <Dashboard />}
            {view === 'graph' && <GraphPage />}
            {view === 'timeline' && <TimelinePage />}
            {view === 'costs' && <CostsPage />}
            {view === 'cards' && <CardsPage />}
            {view === 'networth' && <NetWorthPage />}
            {view === 'goals' && <GoalsPage />}
            {view === 'motorcycle' && <MotorcyclePage />}
            {view === 'debts' && <DebtsPage />}
            {view === 'transactions' && <TransactionsPage />}
          </motion.div>
        </main>

        <LiveCashWidget />
      </div>
    </AppContext.Provider>
  );
}
