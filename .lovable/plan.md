

## Plan: Extraction Templates

### Overview
Add a reusable extraction templates system where users can save, version, and reuse extraction configurations (prompt + schema + model). Templates are accessible from the dashboard sidebar and can be applied in the Playground extract/pipeline modes.

### 1. Database

**Table: `extraction_templates`**
```sql
CREATE TABLE public.extraction_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
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
```

RLS: Users CRUD own templates, public SELECT on `is_public = true` templates.

**Table: `extraction_template_versions`**
```sql
CREATE TABLE public.extraction_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES extraction_templates(id) ON DELETE CASCADE,
  version integer NOT NULL,
  prompt text,
  schema_json jsonb,
  model text NOT NULL,
  change_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, version)
);
```

RLS: Users can read versions of their own templates + public templates.

Seed starter templates (inserted as `is_public = true` with a system user ID or null user):
- **Product Data** — extracts name, price, currency, rating, availability
- **Article/Blog** — extracts title, author, date, summary, tags
- **Contact Info** — extracts name, email, phone, address, company
- **Job Listing** — extracts title, company, location, salary, requirements

### 2. New Page: `src/pages/TemplatesPage.tsx`

Dashboard page at `/app/templates` showing:
- Grid/list of user's templates + public starter templates
- Each card shows name, description, tags, version, use count
- Actions: Use (loads into Playground), Edit, Duplicate, Delete
- Create button opens a form dialog with name, description, prompt, schema editor, model selector, tags
- Version history panel (expandable) showing previous versions with restore capability

### 3. Template Detail/Edit Dialog

- Edit name, description, prompt, schema, model, tags
- Save creates a new version automatically (bumps version, inserts into `extraction_template_versions`)
- Show diff between versions

### 4. Playground Integration

In `PlaygroundPage.tsx`, for extract and pipeline modes:
- Add a "Load Template" dropdown/button next to the prompt/schema fields
- When selected, populates prompt, schema, and model from the template
- After a successful extraction, offer "Save as Template" if no template was used
- Increment `use_count` on the template when used

### 5. Sidebar Update

Add "Templates" nav item in `AppSidebar.tsx` under Platform group, between Pipelines and Docs, using `FileText` icon.

### 6. Route

Add `/app/templates` route in `App.tsx`.

### Files Changed
- DB migration (2 tables + RLS + seed starter templates)
- `src/pages/TemplatesPage.tsx` (new)
- `src/pages/PlaygroundPage.tsx` (add template loader + save-as-template)
- `src/components/AppSidebar.tsx` (add nav item)
- `src/App.tsx` (add route)

