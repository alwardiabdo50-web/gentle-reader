CREATE TABLE public.changelog_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  version text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published entries"
  ON public.changelog_entries FOR SELECT
  TO public
  USING (is_published = true);

INSERT INTO public.changelog_entries (date, version, category, title, description, sort_order) VALUES
  ('2026-03-10', 'v1.4.0', 'feature', 'Pipeline API — chain scrape, extract & transform in one call', 'The new /pipeline endpoint lets you define a multi-step workflow (scrape → extract → transform) and execute it with a single request. Reusable pipeline definitions can be saved and triggered via schedules or webhooks.', 0),
  ('2026-02-22', 'v1.3.1', 'improvement', 'Faster JavaScript rendering for /scrape', 'Upgraded the headless browser pool to reduce median render time by 40 %. The render_javascript option now also supports a wait_for_selector parameter for more reliable page-ready detection.', 0),
  ('2026-02-10', 'v1.3.0', 'feature', 'New /map endpoint for sitemap discovery', 'Retrieve a structured list of all discoverable URLs on a domain — including pages found via sitemap.xml, robots.txt, and link traversal — in a single request.', 0),
  ('2026-01-28', 'v1.2.2', 'fix', 'Crawl depth limit off-by-one fix', 'Fixed a bug where setting max_depth to 1 would sometimes include pages at depth 2. Crawl results are now strictly bounded by the configured depth.', 0),
  ('2026-01-15', 'v1.2.1', 'deprecation', 'Legacy /scrape response field raw_html renamed to html', 'The raw_html field in scrape responses has been renamed to html. The old field will continue to work until April 2026 but is no longer documented. Please update your integrations.', 0),
  ('2026-01-05', 'v1.2.0', 'feature', 'Structured data extraction with /extract', 'Supply a JSON schema and an optional prompt, and the new /extract endpoint will scrape a page and return structured data matching your schema — powered by LLM extraction under the hood.', 0);