-- Create accountant accounts table for Premium plan users
CREATE TABLE IF NOT EXISTS accountant_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  accountant_account_number VARCHAR(50) UNIQUE NOT NULL,
  client_invoice_count INTEGER DEFAULT 0,
  max_client_invoices INTEGER DEFAULT 500,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create clients table for Premium plan accountants
CREATE TABLE IF NOT EXISTS accountant_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  client_rfc VARCHAR(20),
  client_email VARCHAR(255),
  client_phone VARCHAR(20),
  invoice_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add accountant_account_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS accountant_account_id UUID REFERENCES accountant_accounts(id) ON DELETE SET NULL;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_accountant_accounts_user_id ON accountant_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accountant_accounts_account_number ON accountant_accounts(accountant_account_number);
CREATE INDEX IF NOT EXISTS idx_accountant_clients_accountant_id ON accountant_clients(accountant_id);
CREATE INDEX IF NOT EXISTS idx_users_accountant_account_id ON users(accountant_account_id);

-- Enable RLS on accountant_accounts
ALTER TABLE accountant_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own accountant account" ON accountant_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own accountant account" ON accountant_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable RLS on accountant_clients
ALTER TABLE accountant_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accountants can read their clients" ON accountant_clients
  FOR SELECT USING (auth.uid() = accountant_id);

CREATE POLICY "Accountants can insert clients" ON accountant_clients
  FOR INSERT WITH CHECK (auth.uid() = accountant_id);

CREATE POLICY "Accountants can update their clients" ON accountant_clients
  FOR UPDATE USING (auth.uid() = accountant_id);

CREATE POLICY "Accountants can delete their clients" ON accountant_clients
  FOR DELETE USING (auth.uid() = accountant_id);

-- Create trigger for updated_at on accountant_accounts
CREATE OR REPLACE FUNCTION update_accountant_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accountant_accounts_updated_at_trigger
BEFORE UPDATE ON accountant_accounts
FOR EACH ROW
EXECUTE FUNCTION update_accountant_accounts_updated_at();

-- Create trigger for updated_at on accountant_clients
CREATE OR REPLACE FUNCTION update_accountant_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accountant_clients_updated_at_trigger
BEFORE UPDATE ON accountant_clients
FOR EACH ROW
EXECUTE FUNCTION update_accountant_clients_updated_at();
