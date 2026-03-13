

## Plan: Add Contact/Sales Page

### What
Create a `/contact` page with a sales inquiry form for Enterprise plan prospects. The form collects name, email, company, expected volume, and message — then stores submissions in a `contact_requests` database table.

### Changes

#### 1. Create `src/pages/public/ContactPage.tsx`
- Clean form page matching the public site design
- Fields: Name, Work Email, Company Name, Expected Monthly Volume (dropdown: <100k, 100k-500k, 500k-1M, 1M+), Message
- Submit stores to `contact_requests` table via Supabase insert (no auth required)
- Success state shows confirmation message
- Input validation: required fields, email format

#### 2. Database migration — create `contact_requests` table
```sql
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
```

#### 3. Update `src/App.tsx`
- Add route: `/contact` → `<PublicLayout><ContactPage /></PublicLayout>`

#### 4. Update `src/components/public/PublicNavbar.tsx`
- Add "Contact" link to `navLinks` array

No other files need changes — the pricing page and footer already link to `/contact`.

