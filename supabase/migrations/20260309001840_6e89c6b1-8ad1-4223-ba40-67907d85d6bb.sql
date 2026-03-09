-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  price_id TEXT,
  product_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create webhook_events table
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'stripe',
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on webhook_events
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (true);

-- RLS policies for webhook_events (service role only)
CREATE POLICY "Service role can manage webhook events"
  ON public.webhook_events
  FOR ALL
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_subscription_id ON public.subscriptions(provider_subscription_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON public.webhook_events(processed);

-- Create trigger for subscriptions updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();