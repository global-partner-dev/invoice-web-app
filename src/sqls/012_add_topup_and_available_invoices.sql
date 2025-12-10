-- Add columns to subscriptions table for tracking available invoices and billing cycles
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS available_invoices INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_cycle_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS billing_cycle_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create topup_purchases table to track top-up purchases
CREATE TABLE IF NOT EXISTS topup_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  topup_product_id UUID NOT NULL REFERENCES topup_products(id),
  stripe_session_id VARCHAR(255),
  invoice_count INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT false,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_topup_purchases_user_id ON topup_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_topup_purchases_subscription_id ON topup_purchases(subscription_id);
CREATE INDEX IF NOT EXISTS idx_topup_purchases_expires_at ON topup_purchases(expires_at);
CREATE INDEX IF NOT EXISTS idx_topup_purchases_stripe_session_id ON topup_purchases(stripe_session_id);

-- Enable RLS
ALTER TABLE topup_purchases ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own top-up purchases
CREATE POLICY "Users can read their own topup purchases" ON topup_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- Create trigger for updated_at on topup_purchases
CREATE OR REPLACE FUNCTION update_topup_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER topup_purchases_updated_at_trigger
BEFORE UPDATE ON topup_purchases
FOR EACH ROW
EXECUTE FUNCTION update_topup_purchases_updated_at();

-- Update invoice_count to be invoice_count_used for tracking (rename semantics)
-- Keep invoice_count as is for now - it tracks how many invoices have been used
-- available_invoices = invoice_limit + active topup_purchases remaining count

-- Create a view to get current available invoices per user
CREATE OR REPLACE VIEW user_available_invoices AS
SELECT 
  u.id as user_id,
  COALESCE(s.invoice_limit, 0) + COALESCE(SUM(tp.invoice_count - tp.used_count), 0) as available_invoices,
  COALESCE(s.invoice_limit, 0) as plan_limit,
  COALESCE(SUM(tp.invoice_count - tp.used_count), 0) as topup_remaining,
  s.id as subscription_id,
  s.status as subscription_status
FROM users u
LEFT JOIN subscriptions s ON u.subscription_id = s.id
LEFT JOIN topup_purchases tp ON u.id = tp.user_id 
  AND tp.expires_at > CURRENT_TIMESTAMP 
  AND tp.is_used = false
GROUP BY u.id, s.invoice_limit, s.id, s.status;

-- Create or replace function to calculate available invoices for a user
CREATE OR REPLACE FUNCTION get_user_available_invoices(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  plan_limit INTEGER;
  topup_remaining INTEGER;
  total_available INTEGER;
BEGIN
  -- Get plan limit
  SELECT COALESCE(s.invoice_limit, 0)
  INTO plan_limit
  FROM subscriptions s
  WHERE s.user_id = user_id_param AND s.status = 'active'
  LIMIT 1;

  -- Get remaining topup invoices
  SELECT COALESCE(SUM(tp.invoice_count - tp.used_count), 0)
  INTO topup_remaining
  FROM topup_purchases tp
  WHERE tp.user_id = user_id_param 
    AND tp.expires_at > CURRENT_TIMESTAMP 
    AND tp.is_used = false;

  total_available := COALESCE(plan_limit, 0) + COALESCE(topup_remaining, 0);
  
  RETURN total_available;
END;
$$ LANGUAGE plpgsql;
