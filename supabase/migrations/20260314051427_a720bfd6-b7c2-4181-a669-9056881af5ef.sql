-- Create site_settings key-value table
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for SEO/maintenance on public pages)
CREATE POLICY "Public can read site settings"
  ON public.site_settings FOR SELECT TO public USING (true);

-- Seed initial rows
INSERT INTO public.site_settings (key, value) VALUES
  ('seo', '{"title": "", "description": "", "keywords": "", "og_image": ""}'::jsonb),
  ('socials', '{"twitter": "", "github": "", "linkedin": "", "discord": "", "youtube": ""}'::jsonb),
  ('branding', '{"favicon_url": "", "logo_url": "", "hero_image_url": ""}'::jsonb),
  ('maintenance', '{"enabled": false, "message": ""}'::jsonb);

-- Create branding storage bucket (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true);

-- Allow authenticated users to upload to branding bucket
CREATE POLICY "Authenticated users can upload branding"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding');

-- Allow public reads from branding bucket
CREATE POLICY "Public can read branding files"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'branding');

-- Allow authenticated users to update/delete branding files
CREATE POLICY "Authenticated users can update branding"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'branding');

CREATE POLICY "Authenticated users can delete branding"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'branding');