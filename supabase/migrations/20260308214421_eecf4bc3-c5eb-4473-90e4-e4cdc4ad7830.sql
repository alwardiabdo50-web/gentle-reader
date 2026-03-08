-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  monthly_credits INTEGER NOT NULL DEFAULT 500,
  extra_credits INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- API Keys table
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own API keys" ON public.api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own API keys" ON public.api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own API keys" ON public.api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own API keys" ON public.api_keys FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
CREATE UNIQUE INDEX idx_api_keys_prefix ON public.api_keys(key_prefix);

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Scrape jobs table
CREATE TABLE public.scrape_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'scrape',
  url TEXT NOT NULL,
  final_url TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  http_status_code INTEGER,
  title TEXT,
  markdown TEXT,
  html TEXT,
  metadata_json JSONB,
  links_json JSONB,
  error_code TEXT,
  error_message TEXT,
  credits_used INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own jobs" ON public.scrape_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own jobs" ON public.scrape_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_scrape_jobs_user_id ON public.scrape_jobs(user_id);
CREATE INDEX idx_scrape_jobs_status ON public.scrape_jobs(status);
CREATE INDEX idx_scrape_jobs_created ON public.scrape_jobs(created_at DESC);

CREATE TRIGGER update_scrape_jobs_updated_at BEFORE UPDATE ON public.scrape_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Usage ledger
CREATE TABLE public.usage_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.scrape_jobs(id),
  action TEXT NOT NULL,
  credits INTEGER NOT NULL,
  balance_after INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage" ON public.usage_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own usage" ON public.usage_ledger FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_usage_ledger_user_id ON public.usage_ledger(user_id);
CREATE INDEX idx_usage_ledger_created ON public.usage_ledger(created_at DESC);