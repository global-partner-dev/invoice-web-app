-- Add tax configuration fields to tax_profiles table
ALTER TABLE tax_profiles
ADD COLUMN IF NOT EXISTS apply_iva BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS apply_isr BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS iva_rate DECIMAL(5,4) DEFAULT 0.16,
ADD COLUMN IF NOT EXISTS isr_rate DECIMAL(5,4) DEFAULT 0.10;

-- Add comment for documentation
COMMENT ON COLUMN tax_profiles.apply_iva IS 'Whether to apply IVA/VAT tax (default: true)';
COMMENT ON COLUMN tax_profiles.apply_isr IS 'Whether to apply ISR tax (default: false)';
COMMENT ON COLUMN tax_profiles.tax_inclusive IS 'Whether prices include taxes (default: true for Mexico)';
COMMENT ON COLUMN tax_profiles.iva_rate IS 'IVA/VAT tax rate (default: 0.16 = 16%)';
COMMENT ON COLUMN tax_profiles.isr_rate IS 'ISR tax rate (default: 0.10 = 10%)';

