# Implementation Plan - Fix Blank Screen Crash

Identify and resolve the runtime error causing the application to crash (blank screen) when opening the "New Request" dialog.

## Root Cause Analysis
The crash is caused by two main issues in `CreateRequestDialog.tsx`:
1.  **Missing Import**: The `Trash2` icon is used in the code but not imported from `lucide-react`.
2.  **Unsupported Function**: The code calls `toast.info()`, but the `sonner` library does not provide an `.info` method, causing a runtime error during the initial render.

## Proposed Changes

### Create Request Dialog

#### [MODIFY] [CreateRequestDialog.tsx](file:///C:/Users/gkmec/OneDrive/Desktop/nucleus-inventory/src/components/CreateRequestDialog.tsx)
- Update `lucide-react` imports to include `Trash2`.
- Change `toast.info` to `toast` for the draft restoration message.
- Remove unused `X` icon import.

## Verification Plan

### Manual Verification
- Click the **"+ New Request"** button. The dialog should now open correctly without crashing.
- Verify that the **"Delete Draft"** button correctly displays the trash icon.
- Verify that entering data, closing the dialog, and reopening it restores the data and shows a notification.
