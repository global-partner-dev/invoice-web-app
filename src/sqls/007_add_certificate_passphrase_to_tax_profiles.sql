ALTER TABLE tax_profiles
ADD COLUMN IF NOT EXISTS certificate_passphrase VARCHAR(255);
