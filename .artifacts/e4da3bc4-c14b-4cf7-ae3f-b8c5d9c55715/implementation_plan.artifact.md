# Implementation Plan - Pivot Table Refinement (Compact Layout & Robust Resizing)

This plan focuses on making the `PivotTable` more compact, removing unnecessary scrollbars, and ensuring the resizing experience is fast and "edge-to-edge."

## User Review Required

> [!IMPORTANT]
> **Layout Density**: I will reduce the default cell padding and row heights to eliminate the "unwanted spaces" you highlighted.
>
> **Scrollbar Removal**: I will disable the internal `overflow: auto` and scrollbars. You will rely on the overall table resizing (right and bottom edges) to fit more data into view.

## Proposed Changes

### [PivotTable.tsx](file:///C:/Users/DeLL/Desktop/Lead-inventory/src/components/PivotTable.tsx)

#### [MODIFY] [PivotTable.tsx](file:///C:/Users/DeLL/Desktop/Lead-inventory/src/components/PivotTable.tsx)

- **UI Compaction**:
    - Reduce `TableHead` padding from `px-8` to `px-4`.
    - Reduce `TableCell` padding and default row height from `64px` to `40px`.
    - Tighten up the "Main Content Area" padding from `p-12` to `p-6` or less.
- **Scrollbar & Layout**:
    - Remove `overflow-auto` from the inner table wrappers.
    - Set the main table container to `overflow: hidden`.
- **Enhanced Resizing**:
    - **Remove Animations**: Strip `transition-all duration-500` from the main card so it follows the mouse instantly.
    - **Edge Handles**: Position the `table-width` handle to cover the **entire right edge** and the `table-height` handle to cover the **entire bottom edge**.
    - **Global Guides**: Ensure the blue guide lines span the full analysis viewport.
- **Alignment Fixes**:
    - Center the "grab" lines perfectly on the table dividers.
    - Ensure all cell dividers (in both header and body) act as resize handles.

## Verification Plan

### Manual Verification
1.  **Spaces**: Verify the table looks much denser and the "unwanted gaps" are gone.
2.  **Scrollbars**: Verify there is no internal grey scrollbar.
3.  **Resizing Performance**: verify that dragging the edges or dividers feels instant and lag-free.
4.  **Edge Grabbing**: Verify you can grab anywhere on the right edge of the card to change the width.
5.  **Persistence**: Refresh and verify the compact layout and custom sizes are preserved.
