# Implementation Plan - Smart Serial Number Paste

The goal is to allow users to copy multiple serial numbers from a sheet (Excel, Google Sheets) and paste them directly into any "Serial Number" input field in the `CreateRequestDialog`. The system will automatically split the pasted values into individual rows and increase the total quantity as needed.

## Proposed Changes

### Create Request Dialog

#### [MODIFY] [CreateRequestDialog.tsx](file:///C:/Users/gkmec/OneDrive/Desktop/nucleus-inventory/src/components/CreateRequestDialog.tsx)
- Implement `handleSerialPaste` function:
    - Listen for `onPaste` events on the serial number input.
    - Split pasted text by newlines, tabs, commas, or spaces.
    - If multiple values are detected, populate the current row and subsequent rows.
    - Automatically increase the `quantity` state if the number of pasted serials exceeds the current quantity.
- Add the `onPaste` handler to the `Input` component for serial numbers.

## Verification Plan

### Manual Verification
1.  **Single Paste**: Copy one serial number and paste it. Verify it works normally.
2.  **Sheet Paste (Vertical)**: Copy 3 serial numbers from a vertical column in Excel and paste into the first row. Verify 3 rows are created and filled.
3.  **Sheet Paste (Horizontal)**: Copy serials from a horizontal row and paste. Verify they split correctly.
4.  **Quantity Sync**: Paste 10 serials into a form with quantity 1. Verify the quantity automatically updates to 10 and all rows are filled.
