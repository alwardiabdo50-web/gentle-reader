
-- Add unique constraint on subscriptions.provider_subscription_id for upsert support
ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_provider_subscription_id_key 
UNIQUE (provider_subscription_id);
