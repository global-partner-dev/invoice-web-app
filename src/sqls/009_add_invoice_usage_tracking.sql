-- Add invoice usage tracking to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS invoice_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS invoice_limit INTEGER DEFAULT 0;

-- Update existing subscriptions with limits based on their plan
-- First, we need to join with subscription_plans to get the plan names
UPDATE subscriptions s
SET invoice_limit = 
  CASE 
    WHEN sp.name = 'Basic' THEN 50
    WHEN sp.name = 'Standard' THEN 150
    WHEN sp.name = 'Premium' THEN 500
    ELSE 0
  END
FROM subscription_plans sp
WHERE s.plan_id = sp.id
AND s.status = 'active';

-- For users without subscriptions (free tier), we'll handle this in the application logic
-- but we can add an invoice_count column to users table for unsubscribed users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS free_tier_invoice_count INTEGER DEFAULT 0;

-- Create an invoices history table to track all invoice generations
CREATE TABLE IF NOT EXISTS invoice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  invoice_uuid VARCHAR(255),
  client_name VARCHAR(255),
  amount DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_invoice_history_user_id ON invoice_history(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_history_subscription_id ON invoice_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoice_history_created_at ON invoice_history(created_at);

-- Enable RLS on invoice_history
ALTER TABLE invoice_history ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own invoice history
CREATE POLICY "Users can read their own invoice history" ON invoice_history
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to insert their own invoice history
CREATE POLICY "Users can insert their own invoice history" ON invoice_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
