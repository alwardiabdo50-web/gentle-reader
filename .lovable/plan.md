

## Plan: Fix Admin Direct Navigation Race Condition

### Problem
When navigating directly to `/admin`, there's a race condition:
1. On initial render, `user` is `null`, so `useAdminRole` immediately sets `loading=false, isAdmin=false`
2. Then `onAuthStateChange` fires with the session, updating `user`
3. But for a brief moment, `AdminProtectedRoute` sees `authLoading=false, roleLoading=false, isAdmin=false` → redirects to `/`

### Fix

#### `src/hooks/useAdminRole.ts`
- Reset `loading` to `true` at the start of the effect when `user` changes (before the async query runs), so the guard waits for the role check to complete after auth resolves

```typescript
useEffect(() => {
  if (!user) {
    setIsAdmin(false);
    setLoading(false);
    return;
  }
  setLoading(true); // ← add this line
  const check = async () => { ... };
  check();
}, [user]);
```

Single line addition. This ensures the admin route guard keeps showing "Verifying access…" until the role query finishes after auth resolves.

