-- Admins table to store administrator information
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_auth_user_id ON admins(auth_user_id);

-- Enable RLS on admins table
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to check if email is admin (for login purposes)
CREATE POLICY "Anyone can read admins" ON admins
  FOR SELECT USING (true);

-- Insert default admin entry (requires manual creation of auth user first)
-- Admin credentials:
-- Email: circleshape1210@gmail.com
-- Password: zxcasdQWE123!@#
-- 
-- To create the admin account:
-- 1. Use Supabase CLI: npx supabase auth admin create-user --email circleshape1210@gmail.com --password "zxcasdQWE123!@#"
-- 2. Or create manually in Supabase Dashboard under Authentication > Users
-- 3. Then get the user_id and insert it into the admins table
--
-- Once auth user is created, uncomment and run:
-- INSERT INTO admins (auth_user_id, email, full_name, is_active)
-- VALUES ('<auth_user_id>', 'circleshape1210@gmail.com', 'Administrator', true)
-- ON CONFLICT (email) DO NOTHING;
