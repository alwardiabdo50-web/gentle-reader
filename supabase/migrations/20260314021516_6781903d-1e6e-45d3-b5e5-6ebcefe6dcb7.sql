
-- Create plans table
CREATE TABLE public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  monthly_price integer NOT NULL DEFAULT 0,
  yearly_price integer NOT NULL DEFAULT 0,
  monthly_credits integer NOT NULL DEFAULT 500,
  max_api_keys integer NOT NULL DEFAULT 2,
  rate_limit_rpm integer NOT NULL DEFAULT 5,
  features_json jsonb NOT NULL DEFAULT '{}',
  description text,
  display_features jsonb NOT NULL DEFAULT '[]',
  cta_text text NOT NULL DEFAULT 'Get Started',
  highlighted boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Public read access (pricing page needs it)
CREATE POLICY "Anyone can read active plans"
ON public.plans FOR SELECT
TO public
USING (true);

-- Seed with current plan definitions
INSERT INTO public.plans (id, name, monthly_price, yearly_price, monthly_credits, max_api_keys, rate_limit_rpm, features_json, description, display_features, cta_text, highlighted, sort_order) VALUES
('free', 'Free', 0, 0, 500, 2, 5,
  '{"webhooks": false, "schedules": false, "pipelines": false, "extract": false, "organizations": false}',
  'For testing and personal projects.',
  '["500 credits/month", "5 req/min rate limit", "Scrape, Crawl & Map", "2 API keys", "Community support"]',
  'Get Started', false, 0),
('hobby', 'Hobby', 900, 7500, 3000, 5, 20,
  '{"webhooks": true, "schedules": false, "pipelines": false, "extract": false, "organizations": false}',
  'For side projects and small apps.',
  '["3,000 credits/month", "20 req/min rate limit", "Scrape, Crawl & Map", "5 API keys", "Email support"]',
  'Start Free Trial', false, 1),
('standard', 'Standard', 4900, 40800, 25000, 10, 100,
  '{"webhooks": true, "schedules": true, "pipelines": true, "extract": true, "organizations": true}',
  'For developers building production apps.',
  '["25,000 credits/month", "100 req/min rate limit", "Scrape, Crawl & Map", "AI Extract included", "10 API keys", "Priority email support"]',
  'Start Free Trial', true, 2),
('growth', 'Growth', 19900, 165800, 150000, 25, 500,
  '{"webhooks": true, "schedules": true, "pipelines": true, "extract": true, "organizations": true}',
  'For teams and high-volume workloads.',
  '["150,000 credits/month", "500 req/min rate limit", "Scrape, Crawl & Map", "AI Extract included", "25 API keys", "Dedicated support"]',
  'Start Free Trial', false, 3),
('scale', 'Scale', 39900, 332500, 500000, -1, 1000,
  '{"webhooks": true, "schedules": true, "pipelines": true, "extract": true, "organizations": true}',
  'For high-scale production workloads with premium support and SLA guarantees.',
  '["500,000 credits/month", "1,000 req/min rate limit", "All features included", "Unlimited crawl depth", "SLA guarantee", "Dedicated account manager"]',
  'Start Free Trial', false, 4);
