CREATE TABLE IF NOT EXISTS tax_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rfc VARCHAR(20),
  tax_regime TEXT,
  first_name VARCHAR(255),
  first_surname VARCHAR(255),
  second_surname VARCHAR(255),
  postal_code VARCHAR(20),
  curp VARCHAR(18),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_profiles_user_id ON tax_profiles(user_id);

ALTER TABLE tax_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their tax profiles" ON tax_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their tax profiles" ON tax_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their tax profiles" ON tax_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_tax_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tax_profiles_updated_at_trigger
BEFORE UPDATE ON tax_profiles
FOR EACH ROW
EXECUTE FUNCTION update_tax_profiles_updated_at();
