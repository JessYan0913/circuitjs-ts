import type { CircuitComponent } from '@circuitjs/core';
import type { CircuitRenderer, RenderTransform } from './CircuitRenderer.js';

const POSTGRABSQ = 100;     // 10-pixel radius for post grabbing
const MINPOSTGRABSIZE = 256;
const GRID_SIZE = 8;

export enum MouseMode {
    SELECT = 'select',
    ADD_ELM = 'add_elm',
    DRAG_ALL = 'drag_all',
    DRAG_POST = 'drag_post',
    DRAG_SELECTED = 'drag_selected',
}

export interface InteractionState {
    mode: MouseMode;
    addType: string | null;          // component type name for ADD_ELM mode
    mouseElm: CircuitComponent | null;
    mousePost: number;
    dragElm: CircuitComponent | null;   // being created in ADD_ELM
    dragStarted: boolean;
    dragScreenX: number;
    dragScreenY: number;
    dragGridX: number;
    dragGridY: number;
    selected: Set<number>;           // component IDs
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

/** Find component under mouse by bounding box */
function findComponentAt(comps: CircuitComponent[], gx: number, gy: number): CircuitComponent | null {
    // Check in reverse order (topmost first)
    let best: CircuitComponent | null = null;
    let bestArea = Infinity;
    for (let i = comps.length - 1; i >= 0; i--) {
        const c = comps[i];
        const bb = c.boundingBox;
        const halfW = 20;
        if (Math.abs(gx - (c.x + c.x2) / 2) < Math.abs(c.x2 - c.x) / 2 + halfW &&
            Math.abs(gy - (c.y + c.y2) / 2) < Math.abs(c.y2 - c.y) / 2 + halfW) {
            const area = Math.max(1, Math.abs(c.x2 - c.x) * Math.abs(c.y2 - c.y));
            if (area < bestArea) {
                bestArea = area;
                best = c;
            }
        }
    }
    return best;
}

export class InteractionHandler {
    state = createInteractionState();

    constructor(
        private renderer: () => CircuitRenderer,
        private components: () => CircuitComponent[],
        private onRenderNeeded: () => void,
        private onTopologyChanged?: () => void,
    ) {}

    /** Mouse down on canvas */
    onMouseDown(sx: number, sy: number, button: number, ctrl: boolean, alt: boolean, shift: boolean): void {
        const t = this.renderer().transform;
        const { x: gx, y: gy } = screenToGrid(sx, sy, t);
        this.state.dragStarted = true;
        this.state.dragScreenX = sx;
        this.state.dragScreenY = sy;
        this.state.dragGridX = snapGrid(gx);
        this.state.dragGridY = snapGrid(gy);

        // Determine mode
        let mode = this.state.mode;
        if (button === 1 || alt) {
            mode = MouseMode.DRAG_ALL; // middle button or Alt = pan
        }

        // Find component under mouse
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
                if (typeof (elm as any).toggle === 'function') {
                    (elm as any).toggle();
                    this.onTopologyChanged?.();
                    this.onRenderNeeded();
                    return;
                }

                // Check if clicking on a handle → switch to drag post
                if (post >= 0) {
                    const d = distSq(gx, gy, elm.getPost(post).x, elm.getPost(post).y);
                    if (d <= POSTGRABSQ) {
                        mode = MouseMode.DRAG_POST;
                    }
                }
            }
        } else if (mode === MouseMode.ADD_ELM && this.state.addType) {
            // Create new component
            this.createComponent(this.state.addType, snapGrid(gx), snapGrid(gy));
        }

        // Apply mode
        this.state.mode = mode;
        this.onRenderNeeded();
    }

    /** Mouse move on canvas */
    onMouseMove(sx: number, sy: number): void {
        const t = this.renderer().transform;
        const { x: gx, y: gy } = screenToGrid(sx, sy, t);

        if (this.state.dragStarted) {
            // Dragging
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
            }
        } else {
            // Hover detection
            const comps = this.components();
            let { elm } = findClosestHandle(comps, gx, gy);
            if (!elm) {
                elm = findComponentAt(comps, gx, gy);
            }
            this.state.mouseElm = elm;
        }

        this.state.dragScreenX = sx;
        this.state.dragScreenY = sy;
        this.onRenderNeeded();
    }

    /** Mouse up */
    onMouseUp(): void {
        if (!this.state.dragStarted) return;
        this.state.dragStarted = false;

        // Finalize drag
        if (this.state.mode === MouseMode.DRAG_POST) {
            // Wire splitting not yet implemented
        }

        // Reset mode back to base
        this.state.mode = this.state.mode === MouseMode.ADD_ELM ? MouseMode.ADD_ELM : MouseMode.SELECT;
        this.onRenderNeeded();
    }

    /** Mouse wheel for zoom */
    onMouseWheel(sx: number, sy: number, delta: number): void {
        this.zoom(delta > 0 ? 1.1 : 0.9, sx, sy);
    }

    /** Pan by pixel delta */
    pan(dx: number, dy: number): void {
        const t = this.renderer().transform;
        t.ox += dx;
        t.oy += dy;
        this.onRenderNeeded();
    }

    /** Zoom centered on a screen point */
    zoom(factor: number, sx: number, sy: number): void {
        const t = this.renderer().transform;
        const newScale = Math.max(0.2, Math.min(2.5, t.scale * factor));
        // Keep the point under the cursor fixed
        const cx = (sx - t.ox) / t.scale;
        const cy = (sy - t.oy) / t.scale;
        t.scale = newScale;
        t.ox = sx - cx * t.scale;
        t.oy = sy - cy * t.scale;
        this.onRenderNeeded();
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

    /** Select/deselect a component */
    toggleSelection(id: number): void {
        if (this.state.selected.has(id)) {
            this.state.selected.delete(id);
        } else {
            this.state.selected.add(id);
        }
        this.onRenderNeeded();
    }

    /** Set component add mode */
    setAddType(type: string | null): void {
        this.state.mode = type ? MouseMode.ADD_ELM : MouseMode.SELECT;
        this.state.addType = type;
        this.onRenderNeeded();
    }
}
