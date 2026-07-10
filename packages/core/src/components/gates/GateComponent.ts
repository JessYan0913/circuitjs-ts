import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { setVoltageColor, drawThickLinePt, drawThickPolygon, drawThickCircle, drawPost, interpPoint, interpPointPerp } from '../drawutils.js';

/** Abstract base for all logic gates — extends CircuitComponent directly (not ChipComponent) */
export abstract class GateComponent extends CircuitComponent {
    static readonly FLAG_SMALL = 1;
    static readonly FLAG_SCHMITT = 2;

    inputCount = 2;
    lastOutput = false;
    highVoltage = 5;
    private oscillationCount = 0;
    inputStates: boolean[] = [];

    protected gsize = 2;
    protected gwidth = 14;
    protected gwidth2 = 28;
    protected gheight = 16;
    protected hs2 = 0;
    protected ww = 0;
    protected inPosts: { x: number; y: number }[] = [];
    protected inGates: { x: number; y: number }[] = [];
    protected gatePoly: { npoints: number; xpoints: number[]; ypoints: number[] } = { npoints: 0, xpoints: [], ypoints: [] };
    protected schmittPoly: { npoints: number; xpoints: number[]; ypoints: number[] } | null = null;
    protected pcircle: { x: number; y: number } | null = null;
    protected linePoints: { x: number; y: number }[] | null = null;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number; inputCount?: number; highVoltage?: number }) {
        super(args);
        this.noDiagonal = true;
        this.inputCount = args.inputCount ?? 2;
        this.highVoltage = args.highVoltage ?? 5;
        this.inputStates = [];
        this.allocNodes();
        this.setPoints();
    }

    abstract calcFunction(): boolean;

    isInverting(): boolean { return false; }
    hasBubble(): boolean { return false; }
    abstract getGateName(): string;
    getGateText(): string | null { return null; }

    hasSchmittInputs(): boolean { return (this.flags & GateComponent.FLAG_SCHMITT) !== 0; }

    getInput(x: number): boolean {
        if (!this.hasSchmittInputs()) {
            return this.volts[x] > this.highVoltage * 0.5;
        }
        const res = this.volts[x] > this.highVoltage * (this.inputStates[x] ? 0.35 : 0.55);
        this.inputStates[x] = res;
        return res;
    }

    getDumpType(): number | string { return 0; }

    getPostCount(): number { return this.inputCount + 1; }
    getVoltageSourceCount(): number { return 1; }

    getPost(n: number): { x: number; y: number } {
        if (n === this.inputCount) return this.point2;
        return this.inPosts[n];
    }

    stamp(context: StampContext): void {
        context.stampVoltageSource(0, this.nodes[this.inputCount], this.voltSource);
    }

    doStep(context: StampContext): void {
        let f = this.calcFunction();
        if (this.isInverting()) f = !f;

        if (this.lastOutput === !f) {
            if (this.oscillationCount++ > 50) {
                this.oscillationCount = 0;
                if (Math.random() > 0.5) f = this.lastOutput;
            }
        } else {
            this.oscillationCount = 0;
        }

        this.lastOutput = f;
        const res = f ? this.highVoltage : 0;
        context.updateVoltageSource(0, this.nodes[this.inputCount], this.voltSource, res);
    }

    getConnection(n1: number, n2: number): boolean { return false; }
    hasGroundConnection(n1: number): boolean { return n1 === this.inputCount; }

    getCurrentIntoNode(n: number): number {
        if (n === this.inputCount) return this.current;
        return 0;
    }

    override setPoints(): void {
        super.setPoints();
        if (this.dn > 150) this.setSize(2);

        const hs = this.gheight;
        this.ww = this.gwidth2;
        if (this.ww > this.dn / 2) this.ww = Math.floor(this.dn / 2);
        if (this.hasBubble() && this.ww + 8 > this.dn / 2) {
            this.ww = Math.floor(this.dn / 2 - 8);
        }

        this.calcLeads(this.ww * 2);
        this.inputStates = new Array(this.inputCount);
        this.inPosts = [];
        this.inGates = [];

        let i0 = -Math.floor(this.inputCount / 2);
        for (let i = 0; i < this.inputCount; i++, i0++) {
            if (i0 === 0 && (this.inputCount & 1) === 0) i0++;
            this.inPosts[i] = interpPointPerp(this.point1, this.point2, 0, hs * i0);
            this.inGates[i] = interpPointPerp(this.lead1, this.lead2, 0, hs * i0);
            this.volts[i] = this.lastOutput ? 5 : 0;
        }

        this.hs2 = this.gwidth * (Math.floor(this.inputCount / 2) + 1);
        this.setBbox(this.point1.x, this.point1.y, this.point2.x, this.point2.y);

        this.createGatePolygon();

        if (this.hasBubble()) {
            this.pcircle = interpPoint(this.point1, this.point2, 0.5 + (this.ww + 4) / this.dn);
            this.lead2 = interpPoint(this.point1, this.point2, 0.5 + (this.ww + 8) / this.dn);
        }
    }

    protected createGatePolygon(): void {
        // Default rectangle — subclasses override for gate shapes
        const tl = interpPointPerp(this.lead1, this.lead2, 0, this.hs2);
        const tr = interpPointPerp(this.lead1, this.lead2, 1, this.hs2);
        const br = interpPointPerp(this.lead1, this.lead2, 1, -this.hs2);
        const bl = interpPointPerp(this.lead1, this.lead2, 0, -this.hs2);
        this.gatePoly = {
            npoints: 4,
            xpoints: [tl.x, tr.x, br.x, bl.x],
            ypoints: [tl.y, tr.y, br.y, bl.y],
        };
    }

    setSize(s: number): void {
        this.gsize = s;
        this.gwidth = 7 * s;
        this.gwidth2 = 14 * s;
        this.gheight = 8 * s;
        this.flags &= ~GateComponent.FLAG_SMALL;
        if (s === 1) this.flags |= GateComponent.FLAG_SMALL;
    }

    draw(g: Graphics): void {
        for (let i = 0; i < this.inputCount; i++) {
            setVoltageColor(g, this.volts[i], this);
            drawThickLinePt(g, this.inPosts[i], this.inGates[i]);
        }

        setVoltageColor(g, this.volts[this.inputCount], this);
        drawThickLinePt(g, this.lead2, this.point2);

        g.setColor(this.needsHighlight() ? '#00FFFF' : '#CCCCCC');
        drawThickPolygon(g, this.gatePoly.xpoints, this.gatePoly.ypoints, this.gatePoly.npoints);

        if (this.hasBubble() && this.pcircle) {
            drawThickCircle(g, this.pcircle.x, this.pcircle.y, 3);
        }

        if (this.hasSchmittInputs() && this.schmittPoly) {
            g.setLineWidth(2);
            g.drawPolyline(this.schmittPoly.xpoints, this.schmittPoly.ypoints, this.schmittPoly.npoints);
            g.setLineWidth(1);
        }

        if (this.linePoints) {
            for (let i = 0; i < this.linePoints.length - 1; i++) {
                drawThickLinePt(g, this.linePoints[i], this.linePoints[i + 1]);
            }
        }

        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }

    getInfo(): string[] {
        return [
            this.getGateName(),
            `Vout = ${this.volts[this.inputCount].toFixed(2)} V`,
            `Iout = ${this.current.toFixed(3)} A`,
        ];
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: '# of Inputs', value: this.inputCount, min: 1, max: 8 };
        if (n === 1) return { name: 'High Voltage (V)', value: this.highVoltage };
        if (n === 2) return { name: 'Schmitt Inputs', checkbox: true, checkboxState: this.hasSchmittInputs() };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.value !== undefined && ei.value >= 1) {
            this.inputCount = Math.round(Number(ei.value));
            this.setPoints();
            this.allocNodes();
            return;
        }
        if (_n === 1 && ei.value !== undefined) {
            this.highVoltage = ei.value;
            return;
        }
        if (_n === 2 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= GateComponent.FLAG_SCHMITT;
            else this.flags &= ~GateComponent.FLAG_SCHMITT;
            this.setPoints();
            return;
        }
    }

    override dump(): string {
        return super.dump() + ` ${this.inputCount} ${this.volts[this.inputCount]} ${this.highVoltage}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.inputCount = parseInt(tokens[start]) || 2;
        if (tokens.length > start + 2) this.highVoltage = parseFloat(tokens[start + 2]) || 5;
        this.setPoints();
        this.allocNodes();
    }
}
