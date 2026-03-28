import { SaleEntry } from './supabase';

/**
 * Dummy/seed sales data using realistic catalog prices.
 * Prices match the item-catalog.ts so the AI prompt stays consistent.
 */
export const dummySalesEntries: Omit<SaleEntry, 'id' | 'created_at'>[] = [
  // ── Today: Morning rush ──
  {
    date: new Date().toISOString().split('T')[0],
    items: [
      { name: 'Chai',      qty: 30, price: 10,  total: 300,  type: 'sale' },
      { name: 'Samosa',    qty: 20, price: 25,  total: 500,  type: 'sale' },
      { name: 'Vada Pav',  qty: 15, price: 20,  total: 300,  type: 'sale' },
      { name: 'Pakoda',    qty: 10, price: 20,  total: 200,  type: 'sale' },
      { name: 'Lassi',     qty: 8,  price: 25,  total: 200,  type: 'sale' },
    ],
    total: 1500,
  },
  // ── Today: Expenses ──
  {
    date: new Date().toISOString().split('T')[0],
    items: [
      { name: 'Vegetables', qty: 3,  price: 50,  total: 150,  type: 'expense', category: 'raw_material' },
      { name: 'Milk',       qty: 2,  price: 60,  total: 120,  type: 'expense', category: 'raw_material' },
      { name: 'Petrol',     qty: 1,  price: 100, total: 100,  type: 'expense', category: 'transport' },
    ],
    total: 370,
  },
  // ── Yesterday ──
  {
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    items: [
      { name: 'Chai',        qty: 25, price: 10,  total: 250,  type: 'sale' },
      { name: 'Samosa',      qty: 16, price: 25,  total: 400,  type: 'sale' },
      { name: 'Pav Bhaji',   qty: 8,  price: 50,  total: 400,  type: 'sale' },
      { name: 'Nimbu Pani',  qty: 12, price: 10,  total: 120,  type: 'sale' },
      { name: 'Kachori',     qty: 10, price: 15,  total: 150,  type: 'sale' },
    ],
    total: 1320,
  },
  {
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    items: [
      { name: 'Oil',    qty: 1, price: 180, total: 180, type: 'expense', category: 'raw_material' },
      { name: 'Flour',  qty: 2, price: 35,  total: 70,  type: 'expense', category: 'raw_material' },
    ],
    total: 250,
  },
  // ── 2 days ago ──
  {
    date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
    items: [
      { name: 'Chai',            qty: 35, price: 10,  total: 350,  type: 'sale' },
      { name: 'Samosa',          qty: 24, price: 25,  total: 600,  type: 'sale' },
      { name: 'Vada Pav',        qty: 20, price: 20,  total: 400,  type: 'sale' },
      { name: 'Bread Omelette',  qty: 6,  price: 30,  total: 180,  type: 'sale' },
      { name: 'Poha',            qty: 10, price: 20,  total: 200,  type: 'sale' },
    ],
    total: 1730,
  },
  // ── 3 days ago ──
  {
    date: new Date(Date.now() - 259200000).toISOString().split('T')[0],
    items: [
      { name: 'Chai',      qty: 28, price: 10,  total: 280,  type: 'sale' },
      { name: 'Samosa',    qty: 18, price: 25,  total: 450,  type: 'sale' },
      { name: 'Thali',     qty: 5,  price: 80,  total: 400,  type: 'sale' },
      { name: 'Lassi',     qty: 10, price: 25,  total: 250,  type: 'sale' },
    ],
    total: 1380,
  },
  // ── 4 days ago ──
  {
    date: new Date(Date.now() - 345600000).toISOString().split('T')[0],
    items: [
      { name: 'Chai',      qty: 22, price: 10, total: 220, type: 'sale' },
      { name: 'Vada Pav',  qty: 12, price: 20, total: 240, type: 'sale' },
      { name: 'Pakoda',    qty: 15, price: 20, total: 300, type: 'sale' },
      { name: 'Jalebi',    qty: 8,  price: 30, total: 240, type: 'sale' },
    ],
    total: 1000,
  },
];
