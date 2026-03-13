CREATE TABLE public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  volume text,
  message text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert" ON public.contact_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "No public reads" ON public.contact_requests FOR SELECT USING (false);