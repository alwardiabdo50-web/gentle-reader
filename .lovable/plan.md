

## Fix: Admin Direct Navigation Race Condition (Take 2)

### Root Cause
The previous fix added `setLoading(true)` when `user` changes, but the real issue is the **initial render**:
1. Auth starts with `loading=true`, then resolves asynchronously
2. `useAdminRole` sees `user=null` on first render and immediately sets `loading=false`
3. There's a brief window where auth's `loading` becomes `false` (from `getSession`) but `user` hasn't propagated yet — or both resolve to `false` simultaneously
4. `AdminProtectedRoute` sees all loading=false + isAdmin=false → redirects to `/app`

### Fix: `src/hooks/useAdminRole.ts`
- Import `useAuth` and check `loading` from auth context
- Keep `loading=true` in `useAdminRole` while auth is still loading (don't prematurely set `false` when user is null due to auth not yet resolved)

```typescript
export function useAdminRole() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Don't resolve until auth itself is done
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const check = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
      setLoading(false);
    };
    check();
  }, [user, authLoading]);

  return { isAdmin, loading };
}
```

Single file change. This ensures the role hook waits for auth to finish before making any decisions.

