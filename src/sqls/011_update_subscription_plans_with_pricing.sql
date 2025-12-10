-- Update subscription_plans with correct pricing and invoice counts
UPDATE subscription_plans
SET 
  price_monthly = CASE 
    WHEN name = 'Basic' THEN 200.00
    WHEN name = 'Standard' THEN 270.00
    WHEN name = 'Premium' THEN 600.00
    ELSE price_monthly
  END,
  features = CASE
    WHEN name = 'Basic' THEN '["50 invoices per month", "Email support"]'::jsonb
    WHEN name = 'Standard' THEN '["100 invoices per month", "Priority support"]'::jsonb
    WHEN name = 'Premium' THEN '["250 invoices per month", "Unlimited clients", "24/7 support"]'::jsonb
    ELSE features
  END,
  updated_at = CURRENT_TIMESTAMP;

-- Create top-up products table
CREATE TABLE IF NOT EXISTS topup_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_product_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  invoice_count INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  user_type VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on stripe_product_id
CREATE INDEX IF NOT EXISTS idx_topup_products_stripe_product_id ON topup_products(stripe_product_id);

-- Enable RLS
ALTER TABLE topup_products ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read top-up products
CREATE POLICY "Anyone can read topup products" ON topup_products
  FOR SELECT USING (true);

-- Insert top-up products
INSERT INTO topup_products (stripe_product_id, name, description, invoice_count, price, user_type, is_active)
VALUES 
  ('prod_Ta3X6viSJkpFCc', 'Top-up 25 Invoices', '25 additional invoices for individual users', 25, 150.00, 'individual', true),
  ('prod_Ta3XNf2tE5BvmA', 'Top-up 50 Invoices', '50 additional invoices for accountant users', 50, 150.00, 'accountant', true)
ON CONFLICT (stripe_product_id) DO NOTHING;
