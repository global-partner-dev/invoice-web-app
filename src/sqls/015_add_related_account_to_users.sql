-- Add related_account column to users table for accountant-client relationships
-- When an accountant adds a user (client), the client's related_account will store the accountant's UUID
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS related_account UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for faster lookups of users related to a specific accountant
CREATE INDEX IF NOT EXISTS idx_users_related_account ON users(related_account);

-- Update RLS policies to allow accountants to view/manage their linked users
-- This policy allows users to read users where they are the related_account (accountants viewing their clients)
CREATE POLICY "Accountants can read their linked users" ON users
  FOR SELECT USING (
    auth.uid() = id OR 
    related_account = auth.uid()
  );

-- Note: related_account field will store the accountant's UUID
-- For example, when accountant with UUID '123' adds a client with UUID '456',
-- the client's related_account will be set to '123'
