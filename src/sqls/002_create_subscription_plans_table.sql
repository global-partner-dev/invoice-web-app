-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_product_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10, 2),
  price_yearly DECIMAL(10, 2),
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on stripe_product_id
CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_product_id ON subscription_plans(stripe_product_id);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read subscription plans
CREATE POLICY "Anyone can read subscription plans" ON subscription_plans
  FOR SELECT USING (true);

-- Insert subscription plans
INSERT INTO subscription_plans (stripe_product_id, name, description, features, is_active)
VALUES 
  ('prod_TNzwfr5LsNLC9b', 'Basic', 'Basic plan for small teams', '["Feature 1", "Feature 2"]'::jsonb, true),
  ('prod_TO00dJw423j5fk', 'Standard', 'Standard plan for growing teams', '["Feature 1", "Feature 2", "Feature 3", "Feature 4"]'::jsonb, true),
  ('prod_TO01G6FwP0mI9R', 'Premium', 'Premium plan for enterprises', '["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5", "Feature 6"]'::jsonb, true)
ON CONFLICT (stripe_product_id) DO NOTHING;
