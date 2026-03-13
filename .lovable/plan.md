

## Plan: Replace Revoke with Delete + Confirmation Dialog

### Changes

1. **Update `src/pages/ApiKeysPage.tsx`**
   - Replace `handleRevoke` with `handleDelete` that actually deletes the row from `api_keys` instead of soft-revoking
   - Add an `AlertDialog` confirmation with message like "Are you sure you want to delete this API key? This action cannot be undone."
   - Track `deletingKeyId` state to know which key's dialog is open
   - Change button label from "Revoke" to "Delete" with the `Trash2` icon
   - Remove the "Revoked" status badge logic (since deleted keys won't exist in the list anymore)

2. **UI Flow**
   - User clicks "Delete" button on an active key
   - `AlertDialog` appears: "Delete API Key?" / "Are you sure you want to delete this key? This action cannot be undone. Any applications using this key will stop working."
   - Cancel or Confirm → on confirm, delete the row and refresh the list

