-- Fix free tier users with 0 invoices
UPDATE users
SET free_tier_invoice_count = 2
WHERE free_tier_invoice_count = 0
  AND subscription_id IS NULL;

-- Fix existing subscriptions with correct invoice_limit and available_invoices
UPDATE subscriptions s
SET 
  invoice_limit = CASE 
    WHEN sp.stripe_product_id = 'prod_TNzwfr5LsNLC9b' THEN 50
    WHEN sp.stripe_product_id = 'prod_TO00dJw423j5fk' THEN 100
    WHEN sp.stripe_product_id = 'prod_TO01G6FwP0mI9R' THEN 250
    ELSE 0
  END,
  available_invoices = CASE 
    WHEN sp.stripe_product_id = 'prod_TNzwfr5LsNLC9b' THEN 50
    WHEN sp.stripe_product_id = 'prod_TO00dJw423j5fk' THEN 100
    WHEN sp.stripe_product_id = 'prod_TO01G6FwP0mI9R' THEN 250
    ELSE 0
  END
FROM subscription_plans sp
WHERE s.plan_id = sp.id
  AND s.status = 'active'
  AND (s.invoice_limit = 0 OR s.available_invoices = 0);

-- Fix all active subscriptions to ensure they have the correct limits (even if > 0)
UPDATE subscriptions s
SET 
  invoice_limit = CASE 
    WHEN sp.stripe_product_id = 'prod_TNzwfr5LsNLC9b' THEN 50
    WHEN sp.stripe_product_id = 'prod_TO00dJw423j5fk' THEN 100
    WHEN sp.stripe_product_id = 'prod_TO01G6FwP0mI9R' THEN 250
    ELSE 0
  END
FROM subscription_plans sp
WHERE s.plan_id = sp.id
  AND s.status = 'active'
  AND s.invoice_limit IS DISTINCT FROM (
    CASE 
      WHEN sp.stripe_product_id = 'prod_TNzwfr5LsNLC9b' THEN 50
      WHEN sp.stripe_product_id = 'prod_TO00dJw423j5fk' THEN 100
      WHEN sp.stripe_product_id = 'prod_TO01G6FwP0mI9R' THEN 250
      ELSE 0
    END
  );
