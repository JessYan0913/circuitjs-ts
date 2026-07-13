import { CircuitComponent, WireComponent } from '@circuitjs/core';
import type { CircuitRenderer, RenderTransform } from './CircuitRenderer.js';

const POSTGRABSQ = 100;       // 10-pixel radius for post grabbing
const GRID_SIZE = 8;
const MIDPOINT_GRAB_RADIUS = 16;
const WIRE_DRAG_THRESHOLD = 4; // pixels before wire drag starts
const PASTE_OFFSET = 32;

export enum MouseMode {
    SELECT = 'select',
    ADD_ELM = 'add_elm',
    DRAG_ALL = 'drag_all',
    DRAG_POST = 'drag_post',
    DRAG_SELECTED = 'drag_selected',
    DRAW_WIRE = 'draw_wire',
    DRAG_MIDPOINT = 'drag_midpoint',
    BOX_SELECT = 'box_select',
}

export interface MenuItem {
    label: string;
    action: string;
    enabled: boolean;
}

export interface ContextMenuState {
    x: number;
    y: number;
    items: MenuItem[];
    componentId: number | null;
}

export interface InteractionState {
    mode: MouseMode;
    addType: string | null;
    mouseElm: CircuitComponent | null;
    mousePost: number;
    dragElm: CircuitComponent | null;
    dragStarted: boolean;
    dragScreenX: number;
    dragScreenY: number;
    dragGridX: number;
    dragGridY: number;
    selected: Set<number>;

    // Wire drawing
    wireStartX: number;
    wireStartY: number;

    // Box selection
    selectBoxX1: number;
    selectBoxY1: number;
    selectBoxX2: number;
    selectBoxY2: number;
}

export function createInteractionState(): InteractionState {
    return {
        mode: MouseMode.SELECT,
        addType: null,
        mouseElm: null,
        mousePost: -1,
        dragElm: null,
        dragStarted: false,
        dragScreenX: 0,
        dragGridY: 0,
        dragGridX: 0,
        dragScreenY: 0,
        selected: new Set(),
        wireStartX: 0,
        wireStartY: 0,
        selectBoxX1: 0,
        selectBoxY1: 0,
        selectBoxX2: 0,
        selectBoxY2: 0,
    };
}

/** Inverse transform: screen → grid coordinates */
function screenToGrid(sx: number, sy: number, t: RenderTransform): { x: number; y: number } {
    return {
        x: (sx - t.ox) / t.scale,
        y: (sy - t.oy) / t.scale,
    };
}

/** Grid snapping (matches Java snapGrid) */
function snapGrid(v: number): number {
    return (v + GRID_SIZE / 2 - 1) & ~(GRID_SIZE - 1);
}

/** Distance squared between two points */
function distSq(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy;
}

/** Find the closest component handle (post) to a grid point */
function findClosestHandle(
    comps: CircuitComponent[],
    gx: number, gy: number,
): { elm: CircuitComponent | null; post: number } {
    let best: CircuitComponent | null = null;
    let bestPost = -1;
    let bestDist = POSTGRABSQ;
    for (const c of comps) {
        const pc = c.getPostCount();
        for (let j = 0; j < pc; j++) {
            const pt = c.getPost(j);
            const d = distSq(gx, gy, pt.x, pt.y);
            if (d <= bestDist) {
                bestDist = d;
                best = c;
                bestPost = j;
            }
        }
    }
    return { elm: best, post: bestPost };
}

/** Find component under mouse by bounding box — prefers non-wire components */
function findComponentAt(comps: CircuitComponent[], gx: number, gy: number): CircuitComponent | null {
    let best: CircuitComponent | null = null;
    let bestArea = Infinity;
    let bestIsWire = false;
    for (let i = comps.length - 1; i >= 0; i--) {
        const c = comps[i];
        const halfW = 20;
        if (Math.abs(gx - (c.x + c.x2) / 2) < Math.abs(c.x2 - c.x) / 2 + halfW &&
            Math.abs(gy - (c.y + c.y2) / 2) < Math.abs(c.y2 - c.y) / 2 + halfW) {
            const area = Math.max(1, Math.abs(c.x2 - c.x) * Math.abs(c.y2 - c.y));
            const isWire = c.isWire();
            // Prefer non-wire components over wires (pick priority: component > wire)
            if ((!bestIsWire && area < bestArea) || (isWire && bestIsWire && area < bestArea) || (!isWire && bestIsWire)) {
                bestArea = area;
                best = c;
                bestIsWire = isWire;
            }
        }
    }
    return best;
}

/** Check if a point is near the midpoint of a line segment */
function findMidpoint(
    comps: CircuitComponent[],
    gx: number, gy: number,
): CircuitComponent | null {
    const thresholdSq = MIDPOINT_GRAB_RADIUS * MIDPOINT_GRAB_RADIUS;
    for (let i = comps.length - 1; i >= 0; i--) {
        const c = comps[i];
        if (!c.isWire()) continue;
        const mx = (c.x + c.x2) / 2;
        const my = (c.y + c.y2) / 2;
        if (distSq(gx, gy, mx, my) <= thresholdSq) {
            return c;
        }
    }
    return null;
}

export interface InteractionCallbacks {
    onRenderNeeded: () => void;
    onTopologyChanged?: () => void;
    onComponentsChanged?: (components: CircuitComponent[]) => void;
    onUndoSnapshot?: () => void;
    onContextMenu?: (menu: ContextMenuState | null) => void;
    setCursor?: (cursor: string) => void;
    onEditComponent?: (component: CircuitComponent) => void;
}

export interface BoxSelectRect {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export class InteractionHandler {
    state = createInteractionState();
    private callbacks: InteractionCallbacks;
    /** Serialized clipboard data for copy/paste */
    private clipboard: string | null = null;
    /** Pending wire component being created */
    private pendingWire: CircuitComponent | null = null;
    /** Component being split (midpoint drag) */
    private splitWire: CircuitComponent | null = null;
    /** Double-click tracking */
    private lastClickTime = 0;
    private lastClickComponent: CircuitComponent | null = null;

    constructor(
        private renderer: () => CircuitRenderer,
        private components: () => CircuitComponent[],
        callbacks: InteractionCallbacks,
    ) {
        this.callbacks = callbacks;
    }

    // ---- Public API for external callers ----

    /** Get the current box selection rect (for rendering) */
    getBoxSelectRect(): BoxSelectRect | null {
        if (this.state.mode !== MouseMode.BOX_SELECT || !this.state.dragStarted) return null;
        return {
            x1: Math.min(this.state.selectBoxX1, this.state.selectBoxX2),
            y1: Math.min(this.state.selectBoxY1, this.state.selectBoxY2),
            x2: Math.max(this.state.selectBoxX1, this.state.selectBoxX2),
            y2: Math.max(this.state.selectBoxY1, this.state.selectBoxY2),
        };
    }

    /** Get the component being dragged during ADD_ELM (for rendering preview) */
    getDragElm(): CircuitComponent | null {
        return this.state.dragElm;
    }

    /** Get the wire being drawn during DRAW_WIRE (for rendering preview) */
    getPendingWire(): CircuitComponent | null {
        return this.pendingWire;
    }

    /** Open context menu at position (screen coords) */
    private openContextMenu(sx: number, sy: number, component: CircuitComponent | null): void {
        const t = this.renderer().transform;
        const { x: gx, y: gy } = screenToGrid(sx, sy, t);

        if (component) {
            const items: MenuItem[] = [
                { label: 'Delete', action: 'delete', enabled: true },
                { label: 'Flip X', action: 'flip_x', enabled: true },
                { label: 'Flip Y', action: 'flip_y', enabled: true },
                { label: 'Duplicate', action: 'duplicate', enabled: true },
            ];
            // Add edit item if component supports it
            const info = component.getInfo();
            if (info.length > 0) {
                items.unshift({ label: 'Edit...', action: 'edit', enabled: true });
            }
            this.callbacks.onContextMenu?.({
                x: sx, y: sy, items, componentId: component.id,
            });
        } else {
            this.callbacks.onContextMenu?.({
                x: sx, y: sy,
                items: [
                    { label: 'Select All', action: 'select_all', enabled: true },
                ],
                componentId: null,
            });
        }
    }

    /** Handle context menu action */
    handleContextAction(action: string, componentId: number | null): void {
        // Ensure right-clicked component is selected before acting on it
        if (componentId !== null && !this.state.selected.has(componentId)) {
            this.clearSelection();
            this.selectComponent(componentId);
        }
        switch (action) {
            case 'delete':
                this.deleteSelected();
                break;
            case 'flip_x':
                this.flipSelected(true, false);
                break;
            case 'flip_y':
                this.flipSelected(false, true);
                break;
            case 'edit': {
                if (componentId !== null) {
                    const comp = this.findComponentById(componentId);
                    if (comp) {
                        this.callbacks.onEditComponent?.(comp);
                    }
                }
                break;
            }
            case 'duplicate':
                this.duplicateSelected();
                break;
            case 'select_all':
                this.selectAll();
                break;
        }
    }

    /** Mouse down on canvas */
    onMouseDown(sx: number, sy: number, button: number, ctrl: boolean, alt: boolean, shift: boolean): void {
        const t = this.renderer().transform;
        const { x: gx, y: gy } = screenToGrid(sx, sy, t);
        this.state.dragStarted = true;
        this.state.dragScreenX = sx;
        this.state.dragScreenY = sy;
        this.state.dragGridX = snapGrid(gx);
        this.state.dragGridY = snapGrid(gy);
        this.state.selectBoxX1 = snapGrid(gx);
        this.state.selectBoxY1 = snapGrid(gy);
        this.state.selectBoxX2 = snapGrid(gx);
        this.state.selectBoxY2 = snapGrid(gy);

        // Right-click: context menu
        if (button === 2) {
            const comps = this.components();
            let { elm } = findClosestHandle(comps, gx, gy);
            if (!elm) elm = findComponentAt(comps, gx, gy);
            this.openContextMenu(sx, sy, elm);
            return;
        }

        // Double-click detection on same component → open editor (skip for toggleable elements like switches)
        const now = Date.now();
        const clickElm = findClosestHandle(this.components(), gx, gy).elm ?? findComponentAt(this.components(), gx, gy);
        const isToggleable = clickElm && typeof (clickElm as any).toggle === 'function';
        if (!isToggleable && clickElm && clickElm === this.lastClickComponent && now - this.lastClickTime < 300) {
            this.lastClickTime = 0;
            this.lastClickComponent = null;
            this.callbacks.onEditComponent?.(clickElm);
            return;
        }
        this.lastClickTime = now;
        this.lastClickComponent = clickElm;

        let mode = this.state.mode;
        if (button === 1 || alt) {
            mode = MouseMode.DRAG_ALL; // middle button or Alt = pan
        }

        const comps = this.components();
        let { elm, post } = findClosestHandle(comps, gx, gy);
        if (!elm) {
            elm = findComponentAt(comps, gx, gy);
        }

        if (mode === MouseMode.SELECT) {
            if (elm) {
                this.state.mouseElm = elm;
                this.state.mousePost = post;

                // Switch toggle on click (matching Java doSwitch)
                if (typeof (elm as any).toggle === 'function' && !shift) {
                    this.callbacks.onUndoSnapshot?.();
                    (elm as any).toggle();
                    this.callbacks.onTopologyChanged?.();
                    this.callbacks.onRenderNeeded();
                    this.state.dragStarted = false;
                    return;
                }

                // Check if clicking on a handle → switch to drag post
                if (post >= 0) {
                    const d = distSq(gx, gy, elm.getPost(post).x, elm.getPost(post).y);
                    if (d <= POSTGRABSQ) {
                        this.callbacks.onUndoSnapshot?.();
                        mode = MouseMode.DRAG_POST;
                    }
                }

                // If clicking on a selected component, prepare to drag selected group
                if (mode === MouseMode.SELECT && this.state.selected.has(elm.id)) {
                    mode = MouseMode.DRAG_SELECTED;
                }

                // Click on non-selected component: select it (clear others unless shift)
                if (mode === MouseMode.SELECT) {
                    if (!shift) {
                        this.clearSelection();
                    }
                    this.selectComponent(elm.id);
                    mode = MouseMode.DRAG_SELECTED;
                }
            } else if (shift) {
                // Shift+drag on empty → box select
                mode = MouseMode.BOX_SELECT;
            } else {
                // Click on empty → clear selection if any, then start wire drawing
                if (this.state.selected.size > 0) {
                    this.clearSelection();
                }
                const midWire = findMidpoint(comps, gx, gy);
                if (midWire) {
                    this.callbacks.onUndoSnapshot?.();
                    this.splitWire = midWire;
                    mode = MouseMode.DRAG_MIDPOINT;
                } else {
                    // Start wire drawing — snap origin to nearest post
                    mode = MouseMode.DRAW_WIRE;
                    const startSnapped = this.snapToPost(snapGrid(gx), snapGrid(gy));
                    this.state.wireStartX = startSnapped.x;
                    this.state.wireStartY = startSnapped.y;
                }
            }
        } else if (mode === MouseMode.ADD_ELM && this.state.addType) {
            // Create new component
            this.callbacks.onUndoSnapshot?.();
            this.createComponent(this.state.addType, snapGrid(gx), snapGrid(gy));
        }

        this.state.mode = mode;
        this.callbacks.onRenderNeeded();
    }

    /** Mouse move on canvas */
    onMouseMove(sx: number, sy: number): void {
        const t = this.renderer().transform;
        const { x: gx, y: gy } = screenToGrid(sx, sy, t);

        if (this.state.dragStarted) {
            const dx = sx - this.state.dragScreenX;
            const dy = sy - this.state.dragScreenY;
            const dgx = snapGrid(gx) - this.state.dragGridX;
            const dgy = snapGrid(gy) - this.state.dragGridY;

            switch (this.state.mode) {
                case MouseMode.DRAG_ALL:
                    this.pan(dx, dy);
                    break;
                case MouseMode.DRAG_POST:
                    if (this.state.mouseElm) {
                        this.dragPost(this.state.mouseElm, this.state.mousePost, snapGrid(gx), snapGrid(gy));
                    }
                    break;
                case MouseMode.DRAG_SELECTED:
                    this.dragSelected(dgx, dgy);
                    break;
                case MouseMode.ADD_ELM:
                    if (this.state.dragElm) {
                        this.state.dragElm.drag(snapGrid(gx), snapGrid(gy));
                    }
                    break;
                case MouseMode.DRAW_WIRE:
                    this.dragDrawWire(snapGrid(gx), snapGrid(gy));
                    break;
                case MouseMode.DRAG_MIDPOINT:
                    this.dragMidpoint(snapGrid(gx), snapGrid(gy));
                    break;
                case MouseMode.BOX_SELECT:
                    this.state.selectBoxX2 = snapGrid(gx);
                    this.state.selectBoxY2 = snapGrid(gy);
                    break;
            }

            this.state.dragGridX = snapGrid(gx);
            this.state.dragGridY = snapGrid(gy);

            // Update cursor during drag
            if (this.callbacks.setCursor) {
                switch (this.state.mode) {
                    case MouseMode.DRAW_WIRE:
                    case MouseMode.ADD_ELM:
                        this.callbacks.setCursor('crosshair'); break;
                    case MouseMode.DRAG_ALL:
                        this.callbacks.setCursor('grabbing'); break;
                    default:
                        this.callbacks.setCursor('move'); break;
                }
            }
        } else {
            // Hover detection
            const comps = this.components();
            let { elm } = findClosestHandle(comps, gx, gy);
            if (!elm) {
                elm = findComponentAt(comps, gx, gy);
            }
            this.state.mouseElm = elm;

            // Update cursor based on what's under the mouse
            if (this.callbacks.setCursor) {
                if (elm) {
                    const isHandle = findClosestHandle(comps, gx, gy).elm !== null;
                    if (isHandle) this.callbacks.setCursor('pointer');
                    else this.callbacks.setCursor('move');
                } else if (findMidpoint(comps, gx, gy)) {
                    this.callbacks.setCursor('col-resize');
                } else {
                    this.callbacks.setCursor('crosshair');
                }
            }
        }
        this.callbacks.onRenderNeeded();
        this.state.dragScreenX = sx;
        this.state.dragScreenY = sy;
    }

    /** Mouse up */
    onMouseUp(): void {
        if (!this.state.dragStarted) return;
        this.state.dragStarted = false;

        switch (this.state.mode) {
            case MouseMode.DRAW_WIRE:
                this.finishWireDraw();
                break;
            case MouseMode.DRAG_MIDPOINT:
                this.finishMidpointDrag();
                break;
            case MouseMode.BOX_SELECT:
                this.finishBoxSelect();
                break;
            case MouseMode.DRAG_POST:
                this.callbacks.onTopologyChanged?.();
                break;
            case MouseMode.DRAG_SELECTED:
                this.callbacks.onTopologyChanged?.();
                break;
            case MouseMode.ADD_ELM:
                this.finishAddElm();
                break;
        }

        this.splitWire = null;
        this.pendingWire = null;

        this.state.mode = MouseMode.SELECT;
        this.callbacks.onRenderNeeded();
    }

    /** Mouse wheel for zoom */
    onMouseWheel(sx: number, sy: number, delta: number): void {
        this.zoom(delta > 0 ? 1.1 : 0.9, sx, sy);
    }

    // ---- Keyboard handling ----

    onKeyDown(e: KeyboardEvent): boolean {
        const key = e.key;
        const ctrl = e.ctrlKey || e.metaKey;

        switch (key) {
            case 'Delete':
            case 'Backspace':
                if (this.state.selected.size > 0) {
                    e.preventDefault();
                    this.deleteSelected();
                }
                return true;

            case 'x':
            case 'X':
                if (!ctrl) {
                    e.preventDefault();
                    this.flipSelected(true, false);
                }
                return true;

            case 'y':
            case 'Y':
                if (!ctrl) {
                    e.preventDefault();
                    this.flipSelected(false, true);
                }
                return true;

            case 'c':
            case 'C':
                if (ctrl) {
                    e.preventDefault();
                    this.copySelected();
                }
                return true;

            case 'v':
            case 'V':
                if (ctrl) {
                    e.preventDefault();
                    this.pasteClipboard();
                }
                return true;

            case 'z':
            case 'Z':
                if (ctrl && e.shiftKey) {
                    // Ctrl+Shift+Z = redo
                    e.preventDefault();
                    this.performRedo();
                } else if (ctrl) {
                    e.preventDefault();
                    this.performUndo();
                }
                return true;

            case 'a':
            case 'A':
                if (ctrl) {
                    e.preventDefault();
                    this.selectAll();
                }
                return true;

            case 'ArrowUp':
                e.preventDefault();
                this.nudgeSelected(0, -GRID_SIZE);
                return true;
            case 'ArrowDown':
                e.preventDefault();
                this.nudgeSelected(0, GRID_SIZE);
                return true;
            case 'ArrowLeft':
                e.preventDefault();
                this.nudgeSelected(-GRID_SIZE, 0);
                return true;
            case 'ArrowRight':
                e.preventDefault();
                this.nudgeSelected(GRID_SIZE, 0);
                return true;

            case 'Escape':
                if (this.state.mode === MouseMode.DRAW_WIRE) {
                    this.pendingWire = null;
                    this.state.dragStarted = false;
                    this.state.mode = MouseMode.SELECT;
                } else if (this.state.mode === MouseMode.ADD_ELM) {
                    this.state.dragElm = null;
                    this.state.addType = null;
                    this.state.mode = MouseMode.SELECT;
                } else {
                    this.clearSelection();
                }
                this.callbacks.onRenderNeeded();
                return true;
        }

        return false;
    }

    // ---- Undo/Redo (delegated callbacks) ----

    private performUndo(): void {
        this.callbacks.onUndoSnapshot?.(); // Save current state as redo target
        // The actual undo is handled by CircuitCanvas which manages the UndoStack
        // We just emit the event
        this.callbacks.onTopologyChanged?.();
        this.callbacks.onRenderNeeded();
    }

    private performRedo(): void {
        this.callbacks.onTopologyChanged?.();
        this.callbacks.onRenderNeeded();
    }

    // ---- Selection methods ----

    clearSelection(): void {
        for (const id of this.state.selected) {
            const c = this.findComponentById(id);
            if (c) c.selected = false;
        }
        this.state.selected.clear();
    }

    selectComponent(id: number): void {
        this.state.selected.add(id);
        const c = this.findComponentById(id);
        if (c) c.selected = true;
    }

    selectAll(): void {
        for (const c of this.components()) {
            if (c.isWire()) continue;
            this.state.selected.add(c.id);
            c.selected = true;
        }
        this.callbacks.onRenderNeeded();
    }

    getSelection(): Set<number> {
        return this.state.selected;
    }

    /** Toggle selection of a component */
    toggleSelection(id: number): void {
        if (this.state.selected.has(id)) {
            this.state.selected.delete(id);
            const c = this.findComponentById(id);
            if (c) c.selected = false;
        } else {
            this.state.selected.add(id);
            const c = this.findComponentById(id);
            if (c) c.selected = true;
        }
        this.callbacks.onRenderNeeded();
    }

    /** Set component add mode */
    setAddType(type: string | null): void {
        this.state.mode = type ? MouseMode.ADD_ELM : MouseMode.SELECT;
        this.state.addType = type;
        this.callbacks.onRenderNeeded();
    }

    // ---- Wire drawing ----

    private snapToPost(gx: number, gy: number): { x: number, y: number } {
        const SNAP_R_SQ = 225; // 15px radius
        let best: { x: number, y: number } | null = null;
        let bestDist = SNAP_R_SQ;
        for (const c of this.components()) {
            for (let j = 0; j < c.getPostCount(); j++) {
                const pt = c.getPost(j);
                const d = (pt.x - gx) ** 2 + (pt.y - gy) ** 2;
                if (d < bestDist) { bestDist = d; best = { x: pt.x, y: pt.y }; }
            }
        }
        return best ?? { x: gx, y: gy };
    }

    private dragDrawWire(gx: number, gy: number): void {
        const snapped = this.snapToPost(gx, gy);
        if (!this.pendingWire) {
            // Only create wire if we've moved beyond threshold
            const dx = gx - this.state.wireStartX;
            const dy = gy - this.state.wireStartY;
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

            this.pendingWire = new WireComponent({
                x: this.state.wireStartX,
                y: this.state.wireStartY,
                x2: snapped.x,
                y2: snapped.y,
            });
        } else {
            this.pendingWire.x2 = snapped.x;
            this.pendingWire.y2 = snapped.y;
            this.pendingWire.setPoints();
        }
    }

    private finishWireDraw(): void {
        if (!this.pendingWire) return;

        // Discard zero-length wires
        if (this.pendingWire.x === this.pendingWire.x2 && this.pendingWire.y === this.pendingWire.y2) {
            this.pendingWire = null;
            return;
        }

        const comps = [...this.components(), this.pendingWire];
        this.callbacks.onComponentsChanged?.(comps);
        this.callbacks.onTopologyChanged?.();
        this.pendingWire = null;
    }

    // ---- Wire splitting (midpoint drag) ----

    private dragMidpoint(gx: number, gy: number): void {
        if (!this.splitWire) return;
        // Preview: just update position; actual split happens on mouseup
        this.splitWire.x2 = gx;
        this.splitWire.y2 = gy;
        this.splitWire.setPoints();
    }

    private finishMidpointDrag(): void {
        if (!this.splitWire) return;

        const origWire = this.splitWire;
        const mx = snapGrid((origWire.x + origWire.x2) / 2);
        const my = snapGrid((origWire.y + origWire.y2) / 2);

        // Ensure midpoint is not at the same position as endpoints
        if ((mx === origWire.x && my === origWire.y) ||
            (mx === origWire.x2 && my === origWire.y2)) {
            return;
        }

        // Create two new wires and a node point
        const wire1 = new WireComponent({
            x: origWire.x, y: origWire.y,
            x2: mx, y2: my,
        });
        const wire2 = new WireComponent({
            x: mx, y: my,
            x2: origWire.x2, y2: origWire.y2,
        });

        // Replace original wire with two new wires
        const comps = this.components().map((c) =>
            c === origWire ? wire1 : c,
        );
        // Find index of wire1 in the new array, insert wire2 after it
        const idx = comps.indexOf(wire1);
        comps.splice(idx + 1, 0, wire2);

        this.callbacks.onComponentsChanged?.(comps);
        this.callbacks.onTopologyChanged?.();
    }

    // ---- Component placement (add from Draw menu) ----

    private finishAddElm(): void {
        if (!this.state.dragElm) return;

        // Discard zero-size components (click without meaningful drag)
        if (this.state.dragElm.x === this.state.dragElm.x2 && this.state.dragElm.y === this.state.dragElm.y2) {
            this.state.dragElm = null;
            return;
        }

        const comps = [...this.components(), this.state.dragElm];
        this.callbacks.onComponentsChanged?.(comps);
        this.callbacks.onTopologyChanged?.();
        this.state.dragElm = null;
    }

    // ---- Box selection ----

    private finishBoxSelect(): void {
        const x1 = Math.min(this.state.selectBoxX1, this.state.selectBoxX2);
        const y1 = Math.min(this.state.selectBoxY1, this.state.selectBoxY2);
        const x2 = Math.max(this.state.selectBoxX1, this.state.selectBoxX2);
        const y2 = Math.max(this.state.selectBoxY1, this.state.selectBoxY2);
        const w = x2 - x1;
        const h = y2 - y1;

        if (w < GRID_SIZE && h < GRID_SIZE) return; // Too small

        this.clearSelection();
        for (const c of this.components()) {
            if (c.selectRect(x1, y1, w, h)) {
                this.state.selected.add(c.id);
                c.selected = true;
            }
        }
        this.callbacks.onRenderNeeded();
    }

    // ---- Delete ----

    private deleteSelected(): void {
        if (this.state.selected.size === 0) return;
        this.callbacks.onUndoSnapshot?.();
        const ids = new Set(this.state.selected);
        const comps = this.components().filter((c) => !ids.has(c.id));
        this.state.selected.clear();
        this.callbacks.onComponentsChanged?.(comps);
        this.callbacks.onTopologyChanged?.();
        this.callbacks.onRenderNeeded?.();
    }

    // ---- Flip ----

    private flipSelected(flipX: boolean, flipY: boolean): void {
        if (this.state.selected.size === 0) return;
        this.callbacks.onUndoSnapshot?.();
        for (const c of this.components()) {
            if (this.state.selected.has(c.id)) {
                if (flipX) {
                    // Mirror around component center
                    const cx = (c.x + c.x2) / 2;
                    const oldx = c.x;
                    c.x = Math.round(2 * cx - c.x2);
                    c.x2 = Math.round(2 * cx - oldx);
                }
                if (flipY) {
                    const cy = (c.y + c.y2) / 2;
                    const oldy = c.y;
                    c.y = Math.round(2 * cy - c.y2);
                    c.y2 = Math.round(2 * cy - oldy);
                }
                c.setPoints();
                c.initBoundingBox();
            }
        }
        this.callbacks.onTopologyChanged?.();
        this.callbacks.onRenderNeeded();
    }

    // ---- Copy / Paste ----

    private copySelected(): void {
        if (this.state.selected.size === 0) return;
        const lines: string[] = [];
        for (const c of this.components()) {
            if (this.state.selected.has(c.id)) {
                lines.push(c.dump());
            }
        }
        this.clipboard = lines.join('\n');
    }

    private async pasteClipboard(): Promise<void> {
        if (!this.clipboard) return;

        try {
            const { Serializer } = await import('@circuitjs/core');
            // Wrap clipboard data in a minimal circuit dump for parser
            const header = '$ 1 5e-6 10 50 5 50 1e-12';
            const text = `${header}\n${this.clipboard}`;
            const parsed = Serializer.parseCircuit(text);
            if (parsed.components.length === 0) return;

            this.callbacks.onUndoSnapshot?.();
            this.clearSelection();

            const comps = [...this.components()];
            for (const comp of parsed.components) {
                // Offset by PASTE_OFFSET
                comp.x += PASTE_OFFSET;
                comp.y += PASTE_OFFSET;
                comp.x2 += PASTE_OFFSET;
                comp.y2 += PASTE_OFFSET;
                comp.setPoints();
                comp.initBoundingBox();
                comps.push(comp);
                this.state.selected.add(comp.id);
                comp.selected = true;
            }

            this.callbacks.onComponentsChanged?.(comps);
            this.callbacks.onTopologyChanged?.();
        } catch (e) {
            console.error('Paste failed:', e);
        }
    }

    private duplicateSelected(): void {
        if (this.state.selected.size === 0) return;

        this.callbacks.onUndoSnapshot?.();
        const comps = [...this.components()];
        const newIds: number[] = [];

        for (const c of this.components()) {
            if (this.state.selected.has(c.id)) {
                // Create duplicate using constructor
                const Cls = c.constructor as new (args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) => CircuitComponent;
                const dup = new Cls({
                    x: c.x + PASTE_OFFSET,
                    y: c.y + PASTE_OFFSET,
                    x2: c.x2 + PASTE_OFFSET,
                    y2: c.y2 + PASTE_OFFSET,
                    flags: c.flags,
                });
                // Copy component-specific data if available
                if (typeof (c as any).undump === 'function') {
                    const dumpStr = c.dump();
                    const tokens = dumpStr.split(/\s+/);
                    if (tokens.length > 6) {
                        dup.handleDumpData?.(tokens, 6);
                    }
                }
                dup.setPoints();
                dup.initBoundingBox();
                comps.push(dup);
                newIds.push(dup.id);
            }
        }

        // Select the new duplicates
        this.clearSelection();
        for (const id of newIds) {
            this.state.selected.add(id);
            const c = this.components().find((comp) => comp.id === id);
            if (c) c.selected = true;
        }

        this.callbacks.onComponentsChanged?.(comps);
        this.callbacks.onTopologyChanged?.();
    }

    // ---- Nudge (arrow keys) ----

    private nudgeSelected(dx: number, dy: number): void {
        if (this.state.selected.size === 0) return;
        this.callbacks.onUndoSnapshot?.();
        this.dragSelected(dx, dy);
        this.callbacks.onTopologyChanged?.();
        this.callbacks.onRenderNeeded();
    }

    // ---- Pan ----

    pan(dx: number, dy: number): void {
        const t = this.renderer().transform;
        t.ox += dx;
        t.oy += dy;
        this.callbacks.onRenderNeeded();
    }

    // ---- Zoom ----

    zoom(factor: number, sx: number, sy: number): void {
        const t = this.renderer().transform;
        const newScale = Math.max(0.2, Math.min(2.5, t.scale * factor));
        const cx = (sx - t.ox) / t.scale;
        const cy = (sy - t.oy) / t.scale;
        t.scale = newScale;
        t.ox = sx - cx * t.scale;
        t.oy = sy - cy * t.scale;
        this.callbacks.onRenderNeeded();
    }

    // ---- Internal helpers ----

    private findComponentById(id: number): CircuitComponent | null {
        return this.components().find((c) => c.id === id) ?? null;
    }

    /** Create a new component at grid position */
    private async createComponent(type: string, gx: number, gy: number): Promise<void> {
        try {
            const mod = await import('@circuitjs/core');
            const comp = mod.createComponentByName(type, gx, gy);
            if (comp) {
                this.state.dragElm = comp;
            }
        } catch (e) {
            console.error('Failed to create component:', e);
        }
    }

    /** Move a component's post */
    private dragPost(c: CircuitComponent, post: number, gx: number, gy: number): void {
        if (post === 0) {
            c.x = gx;
            c.y = gy;
        } else {
            c.x2 = gx;
            c.y2 = gy;
        }
        c.setPoints();
    }

    /** Move selected components */
    private dragSelected(dgx: number, dgy: number): void {
        for (const c of this.components()) {
            if (this.state.selected.has(c.id)) {
                c.move(dgx, dgy);
            }
        }
    }
}
