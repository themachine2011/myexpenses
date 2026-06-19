// Single source of truth for the wallet's payment methods.
//
// Imported by the New Purchase form, the ledger filters, and the file importer
// so nothing keeps its own hardcoded copy of the list. Transactions store the
// `id` string in their `paymentMethod` field.
export const PAYMENT_METHODS = [
  { id: 'Debit/Cash',        label: 'Debit/Cash',  short: 'D/C',  img: null,                  type: 'debit' },
  { id: 'VISA Mercado Pago', label: 'Mercado Pago', short: 'Visa', img: '/assets/visa.png',   type: 'visa' },
  { id: 'Nubank MasterCard', label: 'Nubank',       short: 'Nu',   img: '/assets/nubank.png', type: 'mastercard' },
];

export default PAYMENT_METHODS;
