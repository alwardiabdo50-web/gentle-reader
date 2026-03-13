
CREATE OR REPLACE FUNCTION public.get_org_owner_credits(_org_id uuid)
RETURNS TABLE(
  plan text,
  monthly_credits integer,
  extra_credits integer,
  credits_used integer,
  current_period_end timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.plan, p.monthly_credits, p.extra_credits, p.credits_used, p.current_period_end
  FROM organizations o
  JOIN profiles p ON p.user_id = o.owner_id
  WHERE o.id = _org_id
    AND is_org_member(auth.uid(), _org_id)
  LIMIT 1;
$$;
