
CREATE TABLE public.api_credit_costs (
  id text PRIMARY KEY,
  label text NOT NULL,
  base_cost integer NOT NULL DEFAULT 1,
  plan_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_addon boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.api_credit_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active credit costs"
  ON public.api_credit_costs
  FOR SELECT
  TO public
  USING (true);

INSERT INTO public.api_credit_costs (id, label, base_cost, plan_overrides, is_addon, sort_order) VALUES
  ('scrape', 'Scrape', 1, '{}', false, 0),
  ('crawl', 'Crawl (per page)', 2, '{}', false, 1),
  ('map', 'Map', 1, '{}', false, 2),
  ('extract', 'AI Extract', 5, '{"free":0,"hobby":0}', false, 3),
  ('screenshot', 'Screenshot', 2, '{"free":0,"hobby":0}', false, 4),
  ('js_rendering', 'JS Rendering', 1, '{}', true, 5);
