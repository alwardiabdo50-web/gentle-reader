

## Team / Organization Support

This is a significant feature that introduces multi-user organizations with shared billing, API keys, usage quotas, and role-based access control. Here is the plan broken into phases.

### Data Model

New tables:

```text
organizations
├── id (uuid PK)
├── name (text)
├── owner_id (uuid → auth.users)
├── plan (text, default 'free')        -- billing lives here now
├── monthly_credits (int)
├── credits_used (int)
├── extra_credits (int)
├── current_period_start (timestamptz)
├── current_period_end (timestamptz)
├── created_at (timestamptz)
└── updated_at (timestamptz)

org_members
├── id (uuid PK)
├── org_id (uuid → organizations)
├── user_id (uuid → auth.users)
├── role (text: 'owner' | 'member' | 'viewer')
├── invited_by (uuid)
├── joined_at (timestamptz)
└── created_at (timestamptz)

org_invitations
├── id (uuid PK)
├── org_id (uuid → organizations)
├── email (text)
├── role (text)
├── invited_by (uuid)
├── accepted_at (timestamptz, nullable)
├── expires_at (timestamptz)
└── created_at (timestamptz)
```

Modifications to existing tables:
- **api_keys**: Add `org_id uuid` (nullable). When set, the key belongs to the org and is shared.
- **profiles**: Add `active_org_id uuid` (nullable) to track the user's currently selected org context.
- **subscriptions**: Add `org_id uuid` (nullable) so billing attaches to the org.

### RLS Strategy

- `organizations`: Owners/members can SELECT their own orgs via a `is_org_member(auth.uid(), org_id)` security definer function.
- `org_members`: Members can SELECT members of their own orgs. Only owners can INSERT/UPDATE/DELETE.
- `org_invitations`: Only owners can create. Invitee can accept (matched by email from `auth.jwt()->>'email'`).
- `api_keys`: Existing user-scoped policies remain. Add org-scoped policies: members can SELECT org keys, owners can INSERT/DELETE org keys.

Security definer functions:
- `is_org_member(user_id, org_id)` — returns boolean
- `get_org_role(user_id, org_id)` — returns role text
- `is_org_owner(user_id, org_id)` — returns boolean

### Backend (Edge Functions)

**`org-manage`** — CRUD for organizations:
- POST: Create org (auto-add creator as owner)
- GET: List user's orgs
- PATCH: Update org name
- DELETE: Delete org (owner only)

**`org-members-manage`** — Member management:
- POST: Invite member (sends invitation, creates `org_invitations` row)
- GET: List members
- PATCH: Change member role
- DELETE: Remove member

**`org-invitations-accept`** — Accept invitation:
- POST: Accept by invitation ID (validates email match, creates `org_members` row)

Modify existing edge functions (`scrape`, `extract`, `crawl`, `pipeline`, etc.):
- When an API key has `org_id`, deduct credits from `organizations` table instead of `profiles`.
- Rate limits based on org plan instead of user plan.

### Frontend

**New pages:**
- `/settings/team` — Team management page showing members, invite form, pending invitations, role management. Accessible from Settings or sidebar.

**Modified pages:**
- **AppSidebar** — Add org switcher dropdown in the header. Show current org name. Allow switching between personal account and org accounts.
- **ApiKeysPage** — When in org context, show org-shared keys. Owners can create/revoke org keys. Members see them read-only.
- **BillingPage** — When in org context, show org plan and credits. Only owners can manage subscription.
- **UsagePage** — When in org context, show org-wide usage aggregated across all members.
- **SettingsPage** — Add "Team" tab/link to navigate to team management.

**New components:**
- `OrgSwitcher` — Dropdown in sidebar header to switch between personal and org contexts.
- `TeamPage` — Member list, invite dialog, role management, pending invitations list.
- `InviteDialog` — Email + role picker to invite new members.

### Auth Context Changes

Extend `AuthContext` to include:
- `activeOrg: { id, name, role } | null`
- `setActiveOrg(orgId | null)`
- `orgs: Array<{ id, name, role }>`

All data-fetching hooks check `activeOrg` to scope queries appropriately.

### Files Changed

| File | Action |
|------|--------|
| Migration | Create `organizations`, `org_members`, `org_invitations` tables + security definer functions + alter `api_keys` and `profiles` |
| `supabase/functions/org-manage/index.ts` | New — org CRUD |
| `supabase/functions/org-members-manage/index.ts` | New — member/invite management |
| `src/contexts/AuthContext.tsx` | Add org context (activeOrg, orgs, switcher) |
| `src/pages/TeamPage.tsx` | New — team management UI |
| `src/components/OrgSwitcher.tsx` | New — org switcher dropdown |
| `src/components/AppSidebar.tsx` | Add OrgSwitcher, add Team nav item |
| `src/pages/ApiKeysPage.tsx` | Org-scoped key listing |
| `src/pages/BillingPage.tsx` | Org-scoped billing |
| `src/pages/UsagePage.tsx` | Org-scoped usage |
| `src/App.tsx` | Add `/settings/team` route |
| `supabase/functions/_shared/billing.ts` | Support org-level credit deduction |
| `supabase/functions/_shared/api-key-auth.ts` | Resolve org plan when key has org_id |
| `supabase/config.toml` | Add new edge functions |

### Implementation Order

1. Database migration (tables, functions, RLS)
2. Edge functions for org + member management
3. AuthContext org support + OrgSwitcher component
4. TeamPage UI
5. Update ApiKeys, Billing, Usage pages for org context
6. Update billing/api-key-auth shared code for org-level credits

