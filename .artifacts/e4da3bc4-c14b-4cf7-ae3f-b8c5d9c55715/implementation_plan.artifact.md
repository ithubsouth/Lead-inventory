# Implementation Plan - Draggable Pivot Tables and Restored Delete

This plan restores the Delete button to the `PivotTable` and implements free-form draggability for the pivot cards, including state persistence.

## User Review Required

> [!IMPORTANT]
> **Drag Handle**: The "handle" for moving the card will be the top header area (where the title is).
>
> **Canvas Bounds**: I will set a large minimum height for the workspace container to ensure you have enough room to move cards around.
>
> **Persistence**: I will save the (X, Y) coordinates of each card in `localStorage` so they stay exactly where you moved them, even after a refresh.

## Proposed Changes

### [PivotTable.tsx](file:///C:/Users/DeLL/Desktop/Lead-inventory/src/components/PivotTable.tsx)

#### [MODIFY] [PivotTable.tsx](file:///C:/Users/DeLL/Desktop/Lead-inventory/src/components/PivotTable.tsx)
- **State Management**:
    - Add `position` state: `{ x: number, y: number }`.
    - Update `useEffect` (mount) to load `position` from `localStorage`.
    - Update `useEffect` (auto-save) to include `position`.
- **Restore Delete Button**:
    - Re-add the `Trash2` icon to the action buttons group in the header.
- **Dragging Logic**:
    - Implement mouse event handlers (`onMouseDown`, `onMouseMove`, `onMouseUp`) specifically for the header area.
    - Update `position` state in real-time.
- **Styling**:
    - Apply `position: absolute`, `left: position.x`, and `top: position.y` to the main card.
    - Ensure `z-index` increases while dragging.
    - Add `cursor: grab` and `active:cursor: grabbing` to the header.

### [OrderSummaryTable.tsx](file:///C:/Users/DeLL/Desktop/Lead-inventory/src/components/OrderSummaryTable.tsx)

#### [MODIFY] [OrderSummaryTable.tsx](file:///C:/Users/DeLL/Desktop/Lead-inventory/src/components/OrderSummaryTable.tsx)
- **Layout Update**:
    - Change the `PivotTable` parent `div` from `grid grid-cols-1 gap-8` to `relative min-h-[1200px] w-full`. This turns the container into a "canvas" for the absolute-positioned cards.

## Verification Plan

### Manual Verification
1.  **Delete Check**: Click the Trash icon and verify the pivot is removed from the screen and `localStorage`.
2.  **Move Check**: Drag a card by its header to a new location. It should follow the mouse.
3.  **Persistence Check**: Refresh the page and verify the card is still at its new location.
4.  **Resizing Compatibility**: Verify you can still resize columns/rows/container while the card is in an absolute position.
