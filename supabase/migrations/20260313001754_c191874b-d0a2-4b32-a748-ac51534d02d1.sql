
-- Playground presets table
CREATE TABLE public.playground_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  mode text NOT NULL,
  config_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.playground_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own presets" ON public.playground_presets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own presets" ON public.playground_presets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets" ON public.playground_presets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets" ON public.playground_presets
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Rate limit log table
CREATE TABLE public.rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  hit_at timestamptz NOT NULL DEFAULT now(),
  was_limited boolean NOT NULL DEFAULT false
);

ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limit logs" ON public.rate_limit_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role full access rate_limit_log" ON public.rate_limit_log
  FOR ALL TO service_role USING (true);

CREATE INDEX idx_rate_limit_log_user_hit ON public.rate_limit_log (user_id, hit_at DESC);
CREATE INDEX idx_rate_limit_log_hit_at ON public.rate_limit_log (hit_at DESC);
