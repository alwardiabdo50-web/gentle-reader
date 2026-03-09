-- Create function to get user by Stripe customer ID
CREATE OR REPLACE FUNCTION public.get_user_by_stripe_customer(stripe_customer_id TEXT)
RETURNS TABLE (user_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT s.user_id
  FROM public.subscriptions s
  WHERE s.provider_customer_id = stripe_customer_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;