-- Create ai_providers table
CREATE TABLE public.ai_providers (
  id text PRIMARY KEY,
  name text NOT NULL,
  base_url text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active providers" ON public.ai_providers
  FOR SELECT TO public USING (is_active = true);

-- Create ai_models table
CREATE TABLE public.ai_models (
  id text PRIMARY KEY,
  provider_id text NOT NULL REFERENCES public.ai_providers(id),
  name text NOT NULL,
  tier text NOT NULL DEFAULT 'free',
  credit_cost integer NOT NULL DEFAULT 0,
  min_plan text NOT NULL DEFAULT 'free',
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active models" ON public.ai_models
  FOR SELECT TO public USING (is_active = true);

-- Seed OpenRouter as default provider
INSERT INTO public.ai_providers (id, name, base_url, is_default, sort_order)
VALUES ('openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1/chat/completions', true, 0);

-- Seed models
INSERT INTO public.ai_models (id, provider_id, name, tier, credit_cost, min_plan, is_default, sort_order) VALUES
  ('google/gemini-2.5-flash-lite', 'openrouter', 'Gemini 2.5 Flash Lite', 'free', 0, 'free', false, 0),
  ('openai/gpt-5-nano', 'openrouter', 'GPT-5 Nano', 'free', 0, 'free', false, 1),
  ('google/gemini-3-flash-preview', 'openrouter', 'Gemini 3 Flash', 'cheaper', 2, 'hobby', true, 10),
  ('google/gemini-2.5-flash', 'openrouter', 'Gemini 2.5 Flash', 'cheaper', 2, 'hobby', false, 11),
  ('openai/gpt-5-mini', 'openrouter', 'GPT-5 Mini', 'cheaper', 2, 'hobby', false, 12),
  ('google/gemini-2.5-pro', 'openrouter', 'Gemini 2.5 Pro', 'expensive', 5, 'standard', false, 20),
  ('google/gemini-3.1-pro-preview', 'openrouter', 'Gemini 3.1 Pro', 'expensive', 5, 'standard', false, 21),
  ('openai/gpt-5', 'openrouter', 'GPT-5', 'expensive', 5, 'standard', false, 22),
  ('openai/gpt-5.2', 'openrouter', 'GPT-5.2', 'expensive', 5, 'standard', false, 23);

-- Add updated_at triggers
CREATE TRIGGER update_ai_providers_updated_at BEFORE UPDATE ON public.ai_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_models_updated_at BEFORE UPDATE ON public.ai_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();