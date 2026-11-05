-- =============================================================================
-- SMART GROCERY & BUDGET SAFETY TRACKER - POSTGRESQL DATABASE SCHEMA
-- Production Grade Relational Schema for Household FinTech & Smart Pantry
-- =============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums Definition
DO $$ BEGIN
    CREATE TYPE budget_status_enum AS ENUM ('safe', 'warning', 'critical', 'frozen');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE grocery_category_enum AS ENUM (
        'Sembako',
        'Makanan Instan',
        'Daging & Sayur',
        'Toiletries',
        'Bumbu & Minyak',
        'Minuman',
        'Camilan',
        'Lainnya'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE retailer_enum AS ENUM ('Indomaret', 'Alfamart', 'Hypermart', 'Superindo', 'Pasar Tradisional');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    xp_points INT DEFAULT 120,
    current_level INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. MONTHLY BUDGETS TABLE
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year INT NOT NULL CHECK (period_year >= 2024),
    monthly_limit DECIMAL(12, 2) NOT NULL CHECK (monthly_limit > 0),
    is_frozen BOOLEAN DEFAULT FALSE,
    frozen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_period UNIQUE (user_id, period_month, period_year)
);

-- 3. TRANSACTIONS / DIGITAL RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    merchant_name VARCHAR(150) NOT NULL,
    receipt_image_url TEXT,
    raw_ocr_response JSONB,
    total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0),
    total_savings DECIMAL(12, 2) DEFAULT 0,
    item_count INT NOT NULL DEFAULT 1,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. GROCERY ITEMS TABLE (Item details in receipt/cart)
CREATE TABLE IF NOT EXISTS grocery_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    category grocery_category_enum NOT NULL DEFAULT 'Lainnya',
    quantity DECIMAL(8, 2) NOT NULL DEFAULT 1.0 CHECK (quantity > 0),
    unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    final_price DECIMAL(12, 2) NOT NULL CHECK (final_price >= 0),
    discount_mode VARCHAR(20) DEFAULT 'none',
    discount_details JSONB,
    is_essential BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. PANTRY STOCK & ZERO-WASTE EXPIRY TRACKER
CREATE TABLE IF NOT EXISTS pantry_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grocery_item_id UUID REFERENCES grocery_items(id) ON DELETE SET NULL,
    item_name VARCHAR(200) NOT NULL,
    category grocery_category_enum NOT NULL DEFAULT 'Lainnya',
    quantity DECIMAL(8, 2) NOT NULL DEFAULT 1.0,
    unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
    purchased_date DATE NOT NULL DEFAULT CURRENT_DATE,
    estimated_expiry DATE NOT NULL,
    is_consumed BOOLEAN DEFAULT FALSE,
    consumed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. MULTI-RETAILER PRICE BENCHMARKS (Radar Data)
CREATE TABLE IF NOT EXISTS price_benchmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_name VARCHAR(200) NOT NULL,
    category grocery_category_enum NOT NULL,
    retailer retailer_enum NOT NULL,
    unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_product_retailer UNIQUE (product_name, retailer)
);

-- 7. GAMIFICATION & ACHIEVEMENT BADGES
CREATE TABLE IF NOT EXISTS achievement_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    badge_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon_name VARCHAR(50) NOT NULL,
    xp_reward INT DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_unlocked_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES achievement_badges(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_badge UNIQUE (user_id, badge_id)
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_pantry_user_expiry ON pantry_stock(user_id, estimated_expiry, is_consumed);
CREATE INDEX IF NOT EXISTS idx_benchmarks_prod ON price_benchmarks(product_name);

-- INITIAL SEED DATA FOR BADGES
INSERT INTO achievement_badges (badge_code, title, description, icon_name, xp_reward) VALUES
('BUDGET_MASTER', 'Budget Master', 'Menyelesaikan bulan dengan surplus sisa anggaran minimal 15%', 'shield-check', 250),
('ZERO_WASTE', 'Zero Waste Hero', 'Mengonsumsi seluruh bahan di virtual pantry tanpa ada yang terbuang', 'sparkles', 200),
('SMART_SHOPPER', 'Smart Shopper', 'Rutin membandingkan harga antar ritel dan menghemat minimal Rp 50.000', 'trending-down', 150),
('IMPULSE_SHIELD', 'Impulse Shield', 'Mengaktifkan Emergency Freeze dan sukses menahan belanja camilan impulsif', 'lock', 180)
ON CONFLICT (badge_code) DO NOTHING;

