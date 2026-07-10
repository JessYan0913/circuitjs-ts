import type { StampContext, EditInfo, Point, Graphics } from '@circuitjs/shared';

let nextId = 1;

interface ComponentCtorArgs {
    x: number;
    y: number;
    x2?: number;
    y2?: number;
    flags?: number;
}

export abstract class CircuitComponent {
    // ---- Identity ----
    id: number;

    // ---- Position ----
    x: number;
    y: number;
    x2: number;
    y2: number;
    dx = 0;
    dy = 0;
    dn = 0;
    dpx1 = 0;
    dpy1 = 0;
    dsign = 0;

    // ---- Nodes ----
    nodes!: Int32Array;
    volts!: Float64Array;
    voltageSourceCount = 0;
    voltSource = -1;

    // ---- State ----
    current = 0;
    curcount = 0;
    simTime = 0;          // simulation time (set by SimulationManager)
    flags: number;
    selected = false;
    noDiagonal = false;

    // ---- Rendering helpers ----
    point1: Point = { x: 0, y: 0 };
    point2: Point = { x: 0, y: 0 };
    lead1: Point = { x: 0, y: 0 };
    lead2: Point = { x: 0, y: 0 };
    boundingBox = { x: 0, y: 0, width: 0, height: 0 };
    _hovered = false;  // set by renderer for hover highlighting

    /** Create for UI drag-out (one point, user drags to second) */
    static create<T extends CircuitComponent>(
        Ctor: new (args: ComponentCtorArgs) => T,
        x: number, y: number,
    ): T {
        return new Ctor({ x, y });
    }

    /** Handle extra dump data (component-specific parameters after flags) */
    handleDumpData(_tokens: string[], _startIndex: number): void {
        // Override in subclasses that have extra dump parameters
    }

    /** Create from serialized dump (two points + flags) */
    static fromDump<T extends CircuitComponent>(
        Ctor: new (args: ComponentCtorArgs) => T,
        x1: number, y1: number, x2: number, y2: number, flags: number,
    ): T {
        return new Ctor({ x: x1, y: y1, x2, y2, flags });
    }

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        this.id = nextId++;
        this.x = args.x;
        this.y = args.y;
        this.x2 = args.x2 ?? args.x;
        this.y2 = args.y2 ?? args.y;
        this.flags = args.flags ?? this.getDefaultFlags();
        this.allocNodes();
    }

    // ---- Abstract interface ----

    abstract getDumpType(): number | string;
    abstract stamp(context: StampContext): void;

    // ---- Optional overrides ----

    doStep(_context: StampContext): void { /* no-op for linear */ }
    startIteration(): void { /* no-op */ }

    /** Called after each time step. No-op: curcount updated per-frame in updateCurcount(). */
    stepFinished(): void {}

    /**
     * Update current dot animation position — call once per render frame.
     * Matches Java: cadd = current * currentMult, cadd %= 8, curcount += cadd
     * where currentMult = 1.7 * frameMs * exp(currentSpeed/3.5 - 14.2)
     */
    updateCurcount(currentMult: number): void {
        let cadd = this.current * currentMult;
        cadd %= 8;
        this.curcount += cadd;
    }

    calculateCurrent(): void { /* no-op */ }
    nonLinear(): boolean { return false; }

    draw(_g: Graphics): void { /* no-op until UI phase */ }

    reset(): void {
        for (let i = 0; i < this.volts.length; i++) this.volts[i] = 0;
        this.curcount = 0;
    }

    setPoints(): void {
        this.dx = this.x2 - this.x;
        this.dy = this.y2 - this.y;
        this.dn = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        if (this.dn > 0) {
            this.dpx1 = this.dy / this.dn;
            this.dpy1 = -this.dx / this.dn;
        } else {
            this.dpx1 = 0;
            this.dpy1 = 0;
        }
        this.dsign = this.dy === 0 ? Math.sign(this.dx) : Math.sign(this.dy);
        this.point1 = { x: this.x, y: this.y };
        this.point2 = { x: this.x2, y: this.y2 };
        this.lead1 = { x: this.x, y: this.y };
        this.lead2 = { x: this.x2, y: this.y2 };
    }

    /** calcLeads(len): inset lead points from the posts */
    calcLeads(len: number): void {
        if (this.dn < len || len === 0) {
            this.lead1 = { x: this.point1.x, y: this.point1.y };
            this.lead2 = { x: this.point2.x, y: this.point2.y };
            return;
        }
        const f1 = (this.dn - len) / (2 * this.dn);
        const f2 = (this.dn + len) / (2 * this.dn);
        this.lead1 = {
            x: Math.floor(this.point1.x * (1 - f1) + this.point2.x * f1 + 0.48),
            y: Math.floor(this.point1.y * (1 - f1) + this.point2.y * f1 + 0.48),
        };
        this.lead2 = {
            x: Math.floor(this.point1.x * (1 - f2) + this.point2.x * f2 + 0.48),
            y: Math.floor(this.point1.y * (1 - f2) + this.point2.y * f2 + 0.48),
        };
    }

    // ---- Default implementations ----

    getDefaultFlags(): number { return 0; }
    getPostCount(): number { return 2; }
    getInternalNodeCount(): number { return 0; }
    getVoltageSourceCount(): number { return this.voltageSourceCount; }

    allocNodes(): void {
        const n = this.getPostCount() + this.getInternalNodeCount();
        this.nodes = new Int32Array(n);
        this.volts = new Float64Array(n);
    }

    setNode(p: number, n: number): void { this.nodes[p] = n; }
    setVoltageSource(_n: number, v: number): void { this.voltSource = v; }
    setNodeVoltage(n: number, v: number): void { this.volts[n] = v; this.calculateCurrent(); }
    getPost(n: number): Point {
        if (n === 0) return this.point1;
        if (n === 1) return this.point2;
        return { x: 0, y: 0 };
    }
    getVoltageDiff(): number { return this.volts[0] - this.volts[1]; }
    getPower(): number { return this.getVoltageDiff() * this.current; }

    drag(xx: number, yy: number): void {
        this.x2 = xx;
        this.y2 = yy;
        this.setPoints();
    }

    move(dx: number, dy: number): void {
        this.x += dx;
        this.y += dy;
        this.x2 += dx;
        this.y2 += dy;
        this.setPoints();
    }

    creationFailed(): boolean { return this.x === this.x2 && this.y === this.y2; }

    // ---- Serialization helpers ----

    dump(): string {
        const t = this.getDumpType();
        const typeStr = typeof t === 'number' ? `${t}` : String.fromCharCode(t.charCodeAt(0));
        return `${typeStr} ${this.x} ${this.y} ${this.x2} ${this.y2} ${this.flags}`;
    }

    dumpModel(): string | null { return null; }
    needsShortcut(): boolean { return this.getShortcut() > 0; }
    getShortcut(): number { return 0; }
    isWire(): boolean { return false; }
    isGraphicElm(): boolean { return false; }

    // ---- Edit interface ----

    getEditInfo(_n: number): EditInfo | null { return null; }
    setEditValue(_n: number, _ei: EditInfo): void { /* no-op */ }
    getInfo(): string[] { return []; }
}

export type ComponentConstructor = new (args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) => CircuitComponent;
