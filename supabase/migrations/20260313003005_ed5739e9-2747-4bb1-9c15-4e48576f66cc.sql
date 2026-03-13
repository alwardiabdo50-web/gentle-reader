
-- Create org_role type
CREATE TYPE public.org_role AS ENUM ('owner', 'member', 'viewer');

-- Organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'free',
  monthly_credits integer NOT NULL DEFAULT 500,
  credits_used integer NOT NULL DEFAULT 0,
  extra_credits integer NOT NULL DEFAULT 0,
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Org members table
CREATE TABLE public.org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role org_role NOT NULL DEFAULT 'member',
  invited_by uuid,
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Org invitations table
CREATE TABLE public.org_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role org_role NOT NULL DEFAULT 'member',
  invited_by uuid NOT NULL,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add org_id to api_keys
ALTER TABLE public.api_keys ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Add active_org_id to profiles
ALTER TABLE public.profiles ADD COLUMN active_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Add org_id to subscriptions
ALTER TABLE public.subscriptions ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Security definer functions
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id AND org_id = _org_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_org_role(_user_id uuid, _org_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.org_members
  WHERE user_id = _user_id AND org_id = _org_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id AND org_id = _org_id AND role = 'owner'
  )
$$;

-- RLS for organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their orgs" ON public.organizations
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), id));

CREATE POLICY "Owners can update their orgs" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_org_owner(auth.uid(), id));

CREATE POLICY "Authenticated users can create orgs" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their orgs" ON public.organizations
  FOR DELETE TO authenticated
  USING (public.is_org_owner(auth.uid(), id));

CREATE POLICY "Service role full access organizations" ON public.organizations
  FOR ALL TO service_role USING (true);

-- RLS for org_members
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org members" ON public.org_members
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Owners can insert org members" ON public.org_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_owner(auth.uid(), org_id));

CREATE POLICY "Owners can update org members" ON public.org_members
  FOR UPDATE TO authenticated
  USING (public.is_org_owner(auth.uid(), org_id));

CREATE POLICY "Owners can delete org members" ON public.org_members
  FOR DELETE TO authenticated
  USING (public.is_org_owner(auth.uid(), org_id));

CREATE POLICY "Service role full access org_members" ON public.org_members
  FOR ALL TO service_role USING (true);

-- RLS for org_invitations
ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org invitations" ON public.org_invitations
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Owners can create invitations" ON public.org_invitations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_owner(auth.uid(), org_id));

CREATE POLICY "Owners can delete invitations" ON public.org_invitations
  FOR DELETE TO authenticated
  USING (public.is_org_owner(auth.uid(), org_id));

CREATE POLICY "Invitee can update invitation" ON public.org_invitations
  FOR UPDATE TO authenticated
  USING (email = auth.jwt()->>'email');

CREATE POLICY "Service role full access org_invitations" ON public.org_invitations
  FOR ALL TO service_role USING (true);

-- Additional RLS for api_keys: org members can view org keys
CREATE POLICY "Org members can view org API keys" ON public.api_keys
  FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_member(auth.uid(), org_id));

CREATE POLICY "Org owners can create org API keys" ON public.api_keys
  FOR INSERT TO authenticated
  WITH CHECK (org_id IS NOT NULL AND public.is_org_owner(auth.uid(), org_id));

CREATE POLICY "Org owners can update org API keys" ON public.api_keys
  FOR UPDATE TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_owner(auth.uid(), org_id));

CREATE POLICY "Org owners can delete org API keys" ON public.api_keys
  FOR DELETE TO authenticated
  USING (org_id IS NOT NULL AND public.is_org_owner(auth.uid(), org_id));

-- Updated_at trigger for organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for org tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.organizations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.org_members;
