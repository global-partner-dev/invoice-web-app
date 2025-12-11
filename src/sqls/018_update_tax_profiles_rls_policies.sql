-- Update RLS policies for tax_profiles to allow accountants to view linked users' profiles

-- Drop existing SELECT policy to make it more permissive
DROP POLICY IF EXISTS "Users can read their tax profiles" ON tax_profiles;

-- Policy to allow users to read their own tax profiles
CREATE POLICY "Users can read their tax profiles" ON tax_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow accountants to read their linked users' tax profiles
CREATE POLICY "Accountants can read linked users tax profiles" ON tax_profiles
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE related_account = auth.uid()
    )
  );

-- Keep existing INSERT and UPDATE policies - users can only manage their own profiles
-- CREATE POLICY "Users can insert their tax profiles" ON tax_profiles
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
--
-- CREATE POLICY "Users can update their tax profiles" ON tax_profiles
--   FOR UPDATE USING (auth.uid() = user_id);
