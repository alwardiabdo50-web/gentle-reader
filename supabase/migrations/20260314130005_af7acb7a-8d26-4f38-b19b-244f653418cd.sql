
-- Extraction templates table
CREATE TABLE public.extraction_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  description text,
  prompt text,
  schema_json jsonb,
  model text NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  version integer NOT NULL DEFAULT 1,
  is_public boolean NOT NULL DEFAULT false,
  tags text[] DEFAULT '{}',
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Version history table
CREATE TABLE public.extraction_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.extraction_templates(id) ON DELETE CASCADE,
  version integer NOT NULL,
  prompt text,
  schema_json jsonb,
  model text NOT NULL,
  change_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, version)
);

-- Enable RLS
ALTER TABLE public.extraction_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraction_template_versions ENABLE ROW LEVEL SECURITY;

-- RLS for extraction_templates
CREATE POLICY "Users can view own templates" ON public.extraction_templates
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public templates" ON public.extraction_templates
  FOR SELECT TO authenticated USING (is_public = true);

CREATE POLICY "Users can create own templates" ON public.extraction_templates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON public.extraction_templates
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON public.extraction_templates
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS for extraction_template_versions
CREATE POLICY "Users can view own template versions" ON public.extraction_template_versions
  FOR SELECT TO authenticated
  USING (template_id IN (SELECT id FROM public.extraction_templates WHERE user_id = auth.uid() OR is_public = true));

CREATE POLICY "Users can insert own template versions" ON public.extraction_template_versions
  FOR INSERT TO authenticated
  WITH CHECK (template_id IN (SELECT id FROM public.extraction_templates WHERE user_id = auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_extraction_templates_updated_at
  BEFORE UPDATE ON public.extraction_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed starter templates
INSERT INTO public.extraction_templates (user_id, name, description, prompt, schema_json, model, is_public, tags) VALUES
(NULL, 'Product Data', 'Extract product information from e-commerce pages', 'Extract the product details from this page', '{"type":"object","properties":{"name":{"type":"string"},"price":{"type":"number"},"currency":{"type":"string"},"rating":{"type":"number"},"availability":{"type":"string"}},"required":["name"]}', 'google/gemini-3-flash-preview', true, ARRAY['ecommerce', 'product']),
(NULL, 'Article / Blog', 'Extract article metadata and content summary', 'Extract the article metadata from this page', '{"type":"object","properties":{"title":{"type":"string"},"author":{"type":"string"},"published_date":{"type":"string"},"summary":{"type":"string"},"tags":{"type":"array","items":{"type":"string"}}},"required":["title"]}', 'google/gemini-3-flash-preview', true, ARRAY['content', 'blog']),
(NULL, 'Contact Info', 'Extract contact information from any page', 'Extract all contact information from this page', '{"type":"object","properties":{"name":{"type":"string"},"email":{"type":"string"},"phone":{"type":"string"},"address":{"type":"string"},"company":{"type":"string"}},"required":["name"]}', 'google/gemini-3-flash-preview', true, ARRAY['contact', 'lead-gen']),
(NULL, 'Job Listing', 'Extract job posting details', 'Extract the job listing details from this page', '{"type":"object","properties":{"title":{"type":"string"},"company":{"type":"string"},"location":{"type":"string"},"salary_range":{"type":"string"},"requirements":{"type":"array","items":{"type":"string"}},"description":{"type":"string"}},"required":["title","company"]}', 'google/gemini-3-flash-preview', true, ARRAY['jobs', 'recruiting']);
