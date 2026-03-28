-- VoiceTrace: Create item_catalog table for price-per-unit lookups
-- Run this SQL in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

CREATE TABLE IF NOT EXISTS item_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  price_per_unit INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'piece',         -- piece, plate, glass, kg, litre, etc.
  category TEXT NOT NULL DEFAULT 'sale',       -- sale or expense
  aliases TEXT[] DEFAULT '{}',                 -- alternate names / Hindi variants
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast name lookups
CREATE INDEX IF NOT EXISTS idx_item_catalog_name ON item_catalog(name);

-- Enable RLS — allow public access for demo
ALTER TABLE item_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous access" ON item_catalog
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════
-- Seed item catalog with realistic street-vendor prices
-- ═══════════════════════════════════════════════════════

INSERT INTO item_catalog (name, price_per_unit, unit, category, aliases) VALUES
  -- Hot beverages
  ('Chai',             10, 'glass',  'sale', ARRAY['tea', 'चाय', 'chai patti']),
  ('Coffee',           15, 'cup',    'sale', ARRAY['कॉफ़ी', 'kaafi']),

  -- Snacks
  ('Samosa',           25, 'piece',  'sale', ARRAY['समोसा', 'samose']),
  ('Vada Pav',         20, 'piece',  'sale', ARRAY['वडा पाव', 'vada paav', 'vadapav']),
  ('Pakoda',           20, 'plate',  'sale', ARRAY['पकोड़ा', 'pakode', 'bhajiya']),
  ('Kachori',          15, 'piece',  'sale', ARRAY['कचोरी', 'kachodi']),
  ('Pav Bhaji',        50, 'plate',  'sale', ARRAY['पाव भाजी']),
  ('Bread Omelette',   30, 'plate',  'sale', ARRAY['ब्रेड आमलेट', 'omelette']),
  ('Poha',             20, 'plate',  'sale', ARRAY['पोहा']),
  ('Upma',             20, 'plate',  'sale', ARRAY['उपमा']),

  -- Drinks
  ('Lassi',            25, 'glass',  'sale', ARRAY['लस्सी']),
  ('Nimbu Pani',       10, 'glass',  'sale', ARRAY['नींबू पानी', 'lemonade', 'shikanji']),
  ('Buttermilk',       10, 'glass',  'sale', ARRAY['छाछ', 'chaas', 'mattha']),
  ('Juice',            30, 'glass',  'sale', ARRAY['जूस']),

  -- Meals
  ('Thali',            80, 'plate',  'sale', ARRAY['थाली']),
  ('Biryani',          60, 'plate',  'sale', ARRAY['बिरयानी']),
  ('Dal Rice',         40, 'plate',  'sale', ARRAY['दाल चावल', 'dal chawal']),

  -- Sweets / Extras
  ('Jalebi',           30, 'plate',  'sale', ARRAY['जलेबी']),
  ('Kulfi',            20, 'piece',  'sale', ARRAY['कुल्फी']),
  ('Paan',             15, 'piece',  'sale', ARRAY['पान']),

  -- Common raw materials (expenses)
  ('Petrol',          100, 'litre',  'expense', ARRAY['पेट्रोल', 'fuel']),
  ('Oil',             180, 'litre',  'expense', ARRAY['तेल', 'tel', 'cooking oil']),
  ('Flour',            35, 'kg',     'expense', ARRAY['आटा', 'aata', 'maida']),
  ('Vegetables',       50, 'kg',     'expense', ARRAY['सब्ज़ी', 'sabzi', 'sabji']),
  ('Milk',             60, 'litre',  'expense', ARRAY['दूध', 'doodh']),
  ('Sugar',            45, 'kg',     'expense', ARRAY['चीनी', 'cheeni']),
  ('Tea Leaves',      300, 'kg',     'expense', ARRAY['चाय पत्ती', 'chai patti']);

-- Seed sample sales entries with items that use catalog prices
-- (These go into the existing "sales" table)
INSERT INTO sales (date, items, total) VALUES
  -- Today
  (CURRENT_DATE, '[
    {"name": "Chai",      "qty": 30, "price": 10,  "total": 300,  "type": "sale", "category": ""},
    {"name": "Samosa",    "qty": 20, "price": 25,  "total": 500,  "type": "sale", "category": ""},
    {"name": "Vada Pav",  "qty": 15, "price": 20,  "total": 300,  "type": "sale", "category": ""},
    {"name": "Pakoda",    "qty": 10, "price": 20,  "total": 200,  "type": "sale", "category": ""},
    {"name": "Lassi",     "qty": 8,  "price": 25,  "total": 200,  "type": "sale", "category": ""}
  ]'::jsonb, 1500),

  -- Today's expenses
  (CURRENT_DATE, '[
    {"name": "Vegetables","qty": 3,  "price": 50,  "total": 150,  "type": "expense", "category": "raw_material"},
    {"name": "Milk",      "qty": 2,  "price": 60,  "total": 120,  "type": "expense", "category": "raw_material"},
    {"name": "Petrol",    "qty": 1,  "price": 100, "total": 100,  "type": "expense", "category": "transport"}
  ]'::jsonb, 370),

  -- Yesterday
  (CURRENT_DATE - INTERVAL '1 day', '[
    {"name": "Chai",        "qty": 25, "price": 10,  "total": 250,  "type": "sale", "category": ""},
    {"name": "Samosa",      "qty": 16, "price": 25,  "total": 400,  "type": "sale", "category": ""},
    {"name": "Pav Bhaji",   "qty": 8,  "price": 50,  "total": 400,  "type": "sale", "category": ""},
    {"name": "Nimbu Pani",  "qty": 12, "price": 10,  "total": 120,  "type": "sale", "category": ""},
    {"name": "Kachori",     "qty": 10, "price": 15,  "total": 150,  "type": "sale", "category": ""}
  ]'::jsonb, 1320),

  (CURRENT_DATE - INTERVAL '1 day', '[
    {"name": "Oil",         "qty": 1,  "price": 180, "total": 180,  "type": "expense", "category": "raw_material"},
    {"name": "Flour",       "qty": 2,  "price": 35,  "total": 70,   "type": "expense", "category": "raw_material"}
  ]'::jsonb, 250),

  -- 2 days ago
  (CURRENT_DATE - INTERVAL '2 days', '[
    {"name": "Chai",        "qty": 35, "price": 10,  "total": 350,  "type": "sale", "category": ""},
    {"name": "Samosa",      "qty": 24, "price": 25,  "total": 600,  "type": "sale", "category": ""},
    {"name": "Vada Pav",    "qty": 20, "price": 20,  "total": 400,  "type": "sale", "category": ""},
    {"name": "Bread Omelette","qty": 6,"price": 30,  "total": 180,  "type": "sale", "category": ""},
    {"name": "Poha",        "qty": 10, "price": 20,  "total": 200,  "type": "sale", "category": ""}
  ]'::jsonb, 1730),

  -- 3 days ago
  (CURRENT_DATE - INTERVAL '3 days', '[
    {"name": "Chai",      "qty": 28, "price": 10,  "total": 280,  "type": "sale", "category": ""},
    {"name": "Samosa",    "qty": 18, "price": 25,  "total": 450,  "type": "sale", "category": ""},
    {"name": "Thali",     "qty": 5,  "price": 80,  "total": 400,  "type": "sale", "category": ""},
    {"name": "Lassi",     "qty": 10, "price": 25,  "total": 250,  "type": "sale", "category": ""}
  ]'::jsonb, 1380),

  -- 4 days ago
  (CURRENT_DATE - INTERVAL '4 days', '[
    {"name": "Chai",      "qty": 22, "price": 10,  "total": 220,  "type": "sale", "category": ""},
    {"name": "Vada Pav",  "qty": 12, "price": 20,  "total": 240,  "type": "sale", "category": ""},
    {"name": "Pakoda",    "qty": 15, "price": 20,  "total": 300,  "type": "sale", "category": ""},
    {"name": "Jalebi",    "qty": 8,  "price": 30,  "total": 240,  "type": "sale", "category": ""}
  ]'::jsonb, 1000);
