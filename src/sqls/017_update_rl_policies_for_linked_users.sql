-- Update RLS policies for linked user management
-- Allows accountants to manage their linked users

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;

-- Policy to allow users to read their own data
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy to allow accountants to read their linked users
CREATE POLICY "Accountants can read linked users" ON users
  FOR SELECT USING (related_account = auth.uid());

-- Policy to allow users to update their own data
CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Policy to allow accountants to update linked users
-- Currently limited to unlinking users (setting related_account to NULL)
CREATE POLICY "Accountants can manage linked users" ON users
  FOR UPDATE USING (related_account = auth.uid());

-- Policy to allow users to insert their own data
CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Note: Service role (via Supabase functions) can create linked users with related_account set
-- The create-linked-user function will handle user creation with the accountant relationship
