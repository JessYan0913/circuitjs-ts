import type { StampContext, EditInfo, Point, Graphics, Polygon } from '@circuitjs/shared';

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

    /** Bounding box for current value label (set during draw) */
    currentLabel: { x: number; y: number; width: number; height: number } | null = null;

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
        this.initBoundingBox();
    }

    /** Initialize bounding box from position */
    initBoundingBox(): void {
        const minX = Math.min(this.x, this.x2);
        const minY = Math.min(this.y, this.y2);
        this.boundingBox = {
            x: minX,
            y: minY,
            width: Math.abs(this.x2 - this.x) + 1,
            height: Math.abs(this.y2 - this.y) + 1,
        };
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

    /** Set position of internal element */
    setPosition(x_: number, y_: number, x2_: number, y2_: number): void {
        this.x = x_;
        this.y = y_;
        this.x2 = x2_;
        this.y2 = y2_;
        this.setPoints();
    }

    // ---- Point interpolation utilities (matching Java CircuitElm.interpPoint) ----

    /** interpPoint: return point fraction f between a and b */
    interpPoint(a: Point, b: Point, f: number): Point {
        const p = { x: 0, y: 0 };
        this.interpPointFill(a, b, p, f);
        return p;
    }

    /** interpPoint: fill existing point c at fraction f between a and b */
    interpPointFill(a: Point, b: Point, c: Point, f: number): void {
        c.x = Math.floor(a.x * (1 - f) + b.x * f + 0.48);
        c.y = Math.floor(a.y * (1 - f) + b.y * f + 0.48);
    }

    /** interpPoint with perpendicular offset g */
    interpPointOffset(a: Point, b: Point, f: number, g: number): Point {
        const p = { x: 0, y: 0 };
        this.interpPointOffsetFill(a, b, p, f, g);
        return p;
    }

    /** interpPoint with perpendicular offset, filling existing point */
    interpPointOffsetFill(a: Point, b: Point, c: Point, f: number, g: number): void {
        const gx = b.y - a.y;
        const gy = a.x - b.x;
        const d = g / Math.sqrt(gx * gx + gy * gy);
        c.x = Math.floor(a.x * (1 - f) + b.x * f + d * gx + 0.48);
        c.y = Math.floor(a.y * (1 - f) + b.y * f + d * gy + 0.48);
    }

    /** interpPoint2: two symmetric points at fraction f with perpendicular offset +/-g */
    interpPoint2(a: Point, b: Point, c: Point, d: Point, f: number, g: number): void {
        const gx = b.y - a.y;
        const gy = a.x - b.x;
        const denom = g / Math.sqrt(gx * gx + gy * gy);
        c.x = Math.floor(a.x * (1 - f) + b.x * f + denom * gx + 0.48);
        c.y = Math.floor(a.y * (1 - f) + b.y * f + denom * gy + 0.48);
        d.x = Math.floor(a.x * (1 - f) + b.x * f - denom * gx + 0.48);
        d.y = Math.floor(a.y * (1 - f) + b.y * f - denom * gy + 0.48);
    }

    // ---- Polygon creation utilities ----

    /** newPointArray: create array of n Points */
    newPointArray(n: number): Point[] {
        const a: Point[] = new Array(n);
        while (n > 0) {
            a[--n] = { x: 0, y: 0 };
        }
        return a;
    }

    /** createPolygon from 3 points */
    createPolygon3(a: Point, b: Point, c: Point): Polygon {
        return {
            npoints: 3,
            xpoints: [a.x, b.x, c.x],
            ypoints: [a.y, b.y, c.y],
        };
    }

    /** createPolygon from 4 points */
    createPolygon4(a: Point, b: Point, c: Point, d: Point): Polygon {
        return {
            npoints: 4,
            xpoints: [a.x, b.x, c.x, d.x],
            ypoints: [a.y, b.y, c.y, d.y],
        };
    }

    /** createPolygon from array of points */
    createPolygonArr(a: Point[]): Polygon {
        const n = a.length;
        const xpoints = new Array<number>(n);
        const ypoints = new Array<number>(n);
        for (let i = 0; i < n; i++) {
            xpoints[i] = a[i].x;
            ypoints[i] = a[i].y;
        }
        return { npoints: n, xpoints, ypoints };
    }

    /** calcArrow: create arrowhead polygon from a to b */
    calcArrow(a: Point, b: Point, al: number, aw: number): Polygon {
        const p1 = { x: 0, y: 0 };
        const p2 = { x: 0, y: 0 };
        const adx = b.x - a.x;
        const ady = b.y - a.y;
        const l = Math.sqrt(adx * adx + ady * ady);
        this.interpPoint2(a, b, p1, p2, 1 - al / l, aw);
        return {
            npoints: 3,
            xpoints: [b.x, p1.x, p2.x],
            ypoints: [b.y, p1.y, p2.y],
        };
    }

    /** Draw an arrow (convenience — creates polygon and fills it) */
    drawArrow(g: Graphics, a: Point, b: Point, al: number, aw: number): void {
        const poly = this.calcArrow(a, b, al, aw);
        CircuitComponent.fillPolygon(g, poly);
    }

    // ---- Bounding box management ----

    /** setBbox: set bounding box from raw coordinates (normalized) */
    setBbox(x1: number, y1: number, x2: number, y2: number): void {
        if (x1 > x2) { const q = x1; x1 = x2; x2 = q; }
        if (y1 > y2) { const q = y1; y1 = y2; y2 = q; }
        this.boundingBox = { x: x1, y: y1, width: x2 - x1 + 1, height: y2 - y1 + 1 };
    }

    /** setBbox from two points with width */
    setBboxPts(p1: Point, p2: Point, w: number): void {
        this.setBbox(p1.x, p1.y, p2.x, p2.y);
        const dpx = this.dpx1 * w;
        const dpy = this.dpy1 * w;
        this.adjustBbox(p1.x + dpx, p1.y + dpy, p1.x - dpx, p1.y - dpy);
    }

    /** adjustBbox: expand current bounding box to contain given rect */
    adjustBbox(x1: number, y1: number, x2: number, y2: number): void {
        if (x1 > x2) { const q = x1; x1 = x2; x2 = q; }
        if (y1 > y2) { const q = y1; y1 = y2; y2 = q; }
        const bx = this.boundingBox.x;
        const by = this.boundingBox.y;
        const bw = this.boundingBox.width;
        const bh = this.boundingBox.height;
        const nx1 = Math.min(bx, x1);
        const ny1 = Math.min(by, y1);
        const nx2 = Math.max(bx + bw, x2);
        const ny2 = Math.max(by + bh, y2);
        this.boundingBox = { x: nx1, y: ny1, width: nx2 - nx1, height: ny2 - ny1 };
    }

    /** adjustBbox from two Points */
    adjustBboxPts(p1: Point, p2: Point): void {
        this.adjustBbox(p1.x, p1.y, p2.x, p2.y);
    }

    /** getBoundingBox: return the bounding box */
    getBoundingBox(): { x: number; y: number; width: number; height: number } {
        return this.boundingBox;
    }

    // ---- Drawing utilities ----

    /** draw2Leads: draw voltage-colored lead wires from posts to lead points */
    draw2Leads(g: Graphics): void {
        this.setVoltageColor(g, this.volts[0]);
        CircuitComponent.drawThickLine(g, this.point1, this.lead1);
        this.setVoltageColor(g, this.volts[1]);
        CircuitComponent.drawThickLine(g, this.lead2, this.point2);
    }

    /** setVoltageColor: set graphics color based on voltage */
    setVoltageColor(g: Graphics, volts: number): void {
        g.setColor(this.getVoltageColor(volts));
    }

    /** getVoltageColor: map voltage to color */
    getVoltageColor(volts: number): string {
        // Simple bipolar color map: negative→red, positive→green, zero→gray
        if (Math.abs(volts) < 0.01) return '#808080';
        const voltageRange = 5;
        const t = Math.max(-1, Math.min(1, volts / voltageRange));
        if (t < 0) {
            const nt = -t;
            const r = Math.round(128 + (255 - 128) * nt);
            const g = Math.round(128 - 128 * nt);
            return `rgb(${r},${g},${g})`;
        } else {
            const g = Math.round(128 + (255 - 128) * t);
            const r = Math.round(128 - 128 * t);
            return `rgb(${r},${g},${r * 0.3})`;
        }
    }

    /** drawDots: draw current dots from pa to pb at position pos */
    drawDots(g: Graphics, pa: Point, pb: Point, pos: number): void {
        if (pos === 0) return;
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        g.setColor('#FFFF00');
        const spacing = 16;
        let p = ((pos % spacing) + spacing) % spacing;
        for (let d = p; d < len; d += spacing) {
            const x = Math.round(pa.x + d * dx / len);
            const y = Math.round(pa.y + d * dy / len);
            g.fillRect(x - 2, y - 2, 4, 4);
        }
    }

    /** isCenteredText: override for text elements that need special centering */
    isCenteredText(): boolean { return false; }

    /** drawCenteredText: draw text centered at (x,y) with bounding box adjustment */
    drawCenteredText(g: Graphics, s: string, x: number, y: number, cx: boolean): void {
        const w = g.measureWidth(s);
        const h2 = 6; // half font size approximation
        g.save();
        g.textBaseline('middle');
        if (cx) {
            g.textAlign('center');
            this.adjustBbox(x - w / 2, y - h2, x + w / 2, y + h2);
        } else {
            this.adjustBbox(x, y - h2, x + w, y + h2);
        }
        g.drawString(s, x, y);
        g.restore();
    }

    /** drawValues: draw component values (ohms, volts, etc.) with offset */
    drawValues(g: Graphics, s: string, hs: number): void {
        if (s == null) return;
        const w = g.measureWidth(s);
        g.setFontSize(12);
        g.setColor('#FFFFFF');
        const xc = (this.x2 + this.x) / 2;
        const yc = (this.y2 + this.y) / 2;
        const dpx = this.dpx1 * hs;
        const dpy = this.dpy1 * hs;
        if (dpx === 0) {
            g.drawString(s, xc - w / 2, yc - Math.abs(dpy) - 2);
        } else {
            const xx = xc + Math.abs(dpx) + 2;
            g.drawString(s, xx, yc + dpy + 6);
        }
    }

    // ---- Selection / Highlight ----

    /** needsHighlight: check if element should be drawn highlighted */
    needsHighlight(): boolean {
        return this.selected || this._hovered;
    }

    /** isSelected: check if element is selected */
    isSelected(): boolean { return this.selected; }

    /** setSelected: mark element as selected */
    setSelected(x: boolean): void { this.selected = x; }

    /** selectRect: check if bounding box intersects a rectangle */
    selectRect(rx: number, ry: number, rw: number, rh: number): boolean {
        const bb = this.boundingBox;
        return !(bb.x + bb.width < rx || rx + rw < bb.x || bb.y + bb.height < ry || ry + rh < bb.y);
    }

    // ---- Static drawing helpers ----

    static drawThickLine(g: Graphics, pa: Point, pb: Point): void {
        g.drawThickLine(pa.x, pa.y, pb.x, pb.y);
    }

    static drawThickCircle(g: Graphics, cx: number, cy: number, r: number): void {
        g.drawThickCircle(cx, cy, r);
    }

    static drawPolygon(g: Graphics, p: Polygon): void {
        g.drawPolygon(p.xpoints, p.ypoints, p.npoints);
    }

    static fillPolygon(g: Graphics, p: Polygon): void {
        g.fillPolygon(p.xpoints, p.ypoints, p.npoints);
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

    /** get (global) node number of nth node */
    getNode(n: number): number { return this.nodes[n]; }

    /** get voltage of nth post */
    getPostVoltage(n: number): number { return this.volts[n]; }

    /** Get current (for one- or two-terminal elements) */
    getCurrent(): number { return this.current; }

    /** Set current for voltage source vn */
    setCurrent(_vn: number, c: number): void { this.current = c; }

    /** Set bounding box for hit detection */
    setBoundingBox(x: number, y: number, width: number, height: number): void {
        this.boundingBox = { x, y, width, height };
    }

    drag(xx: number, yy: number): void {
        if (this.noDiagonal) {
            if (Math.abs(this.x - xx) < Math.abs(this.y - yy)) {
                xx = this.x;
            } else {
                yy = this.y;
            }
        }
        this.x2 = xx;
        this.y2 = yy;
        this.setPoints();
    }

    move(dx: number, dy: number): void {
        this.x += dx;
        this.y += dy;
        this.x2 += dx;
        this.y2 += dy;
        this.boundingBox.x += dx;
        this.boundingBox.y += dy;
        this.setPoints();
    }

    creationFailed(): boolean { return this.x === this.x2 && this.y === this.y2; }

    /** allowMove: check if moving by (dx,dy) won't overlap another component (stub for now) */
    allowMove(_dx: number, _dy: number): boolean { return true; }

    /** flipPosts: swap endpoints */
    flipPosts(): void {
        const oldx = this.x;
        const oldy = this.y;
        this.x = this.x2;
        this.y = this.y2;
        this.x2 = oldx;
        this.y2 = oldy;
        this.setPoints();
    }

    // ---- Serialization helpers ----

    dump(): string {
        const t = this.getDumpType();
        const typeStr = typeof t === 'number' ? `${t}` : String.fromCharCode(t.charCodeAt(0));
        return `${typeStr} ${this.x} ${this.y} ${this.x2} ${this.y2} ${this.flags}`;
    }

    dumpModel(): string | null { return null; }

    /** Return the single-character dump identifier (for use in serialization format) */
    getDumpId(): string {
        const t = this.getDumpType();
        return typeof t === 'number' ? `${t}` : String.fromCharCode(t.charCodeAt(0));
    }

    /** Return the string class identifier (for class-based dump format) */
    getDumpClass(): string {
        return this.constructor.name;
    }

    /** Encapsulation prefix — component label prefix character (e.g. 'R' for resistor) */
    getPrefix(): string { return ''; }
    /** Encapsulation suffix — unit suffix (e.g. 'Ω' for resistor) */
    getSuffix(): string { return ''; }

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
