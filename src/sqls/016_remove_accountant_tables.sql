-- Remove accountant_accounts and accountant_clients tables
-- These are being replaced by the related_account field in the users table

-- Drop RLS policies first
DROP POLICY IF EXISTS "Accountants can delete their clients" ON accountant_clients;
DROP POLICY IF EXISTS "Accountants can update their clients" ON accountant_clients;
DROP POLICY IF EXISTS "Accountants can insert clients" ON accountant_clients;
DROP POLICY IF EXISTS "Accountants can read their clients" ON accountant_clients;

DROP POLICY IF EXISTS "Users can update their own accountant account" ON accountant_accounts;
DROP POLICY IF EXISTS "Users can read their own accountant account" ON accountant_accounts;

-- Drop triggers
DROP TRIGGER IF EXISTS accountant_clients_updated_at_trigger ON accountant_clients;
DROP TRIGGER IF EXISTS accountant_accounts_updated_at_trigger ON accountant_accounts;

-- Drop trigger functions
DROP FUNCTION IF EXISTS update_accountant_clients_updated_at();
DROP FUNCTION IF EXISTS update_accountant_accounts_updated_at();

-- Drop the old accountant_account_id column from users if it exists
ALTER TABLE users DROP COLUMN IF EXISTS accountant_account_id;

-- Drop the tables
DROP TABLE IF EXISTS accountant_clients CASCADE;
DROP TABLE IF EXISTS accountant_accounts CASCADE;

-- Note: Invoice counter tracking is now handled through individual tax profiles
-- for each user (accountant or client). The invoice usage is tracked in the
-- subscriptions table via the topup mechanism.
