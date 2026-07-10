import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { interpPoint2 } from '../drawutils.js';

/**
 * SCR (Silicon-Controlled Rectifier / Thyristor).
 * Port of Java SCRElm (dump type 177)
 *
 * Post layout: 0 = anode, 1 = cathode, 2 = gate
 * Internal node: 3 = internal connection between anode resistor and diode
 */
export class SCRComponent extends CircuitComponent {
    triggerI = 0.01;    // Trigger current
    holdingI = 0.0082;  // Holding current
    gresistance = 50;   // Gate-cathode resistance

    private ia = 0;
    private ic = 0;
    private ig = 0;
    private aresistance = 10e5;
    private lastVac = 0;
    private lastVag = 0;

    getDumpType(): number | string { return 177; }
    nonLinear(): boolean { return true; }
    getPostCount(): number { return 3; } // anode(0), cathode(1), gate(2)
    getInternalNodeCount(): number { return 1; } // internal(3)

    // Post 2 is gate
    getPost(n: number): { x: number; y: number } {
        if (n === 0) return this.point1;
        if (n === 1) return this.point2;
        // Gate post - computed during setPoints
        if (this.gate && this.gate.length > 1) return this.gate[1];
        return this.point2;
    }

    // Drawing geometry
    private gate: { x: number; y: number }[] = [];
    private poly: { npoints: number; xpoints: number[]; ypoints: number[] } = { npoints: 0, xpoints: [], ypoints: [] };
    private cathode: { x: number; y: number }[] = [];

    setPoints(): void {
        super.setPoints();
        const hs = 8;
        let dir = 0;
        if (Math.abs(this.dx) > Math.abs(this.dy)) {
            dir = -Math.sign(this.dx) * Math.sign(this.dy);
            this.dn = Math.abs(this.dx);
            this.point2.y = this.point1.y;
        } else {
            dir = Math.sign(this.dy) * Math.sign(this.dx);
            this.dn = Math.abs(this.dy);
            this.point2.x = this.point1.x;
        }
        if (dir === 0) dir = 1;
        this.calcLeads(16);

        this.cathode = new Array(2);
        for (let i = 0; i < 2; i++) this.cathode[i] = { x: 0, y: 0 };
        const pa = new Array(2);
        for (let i = 0; i < 2; i++) pa[i] = { x: 0, y: 0 };
        interpPoint2(this.lead1, this.lead2, pa[0], pa[1], 0, hs);
        interpPoint2(this.lead1, this.lead2, this.cathode[0], this.cathode[1], 1, hs);
        this.poly = {
            npoints: 3,
            xpoints: [pa[0].x, pa[1].x, this.lead2.x],
            ypoints: [pa[0].y, pa[1].y, this.lead2.y],
        };

        // Gate lead
        this.gate = new Array(2);
        for (let i = 0; i < 2; i++) this.gate[i] = { x: 0, y: 0 };
        const leadlen = (this.dn - 16) / 2;
        const gatelen = 8; // ~sim.gridSize
        if (leadlen >= gatelen) {
            this.interpPointOffsetFill(this.lead2, this.point2, this.gate[0], gatelen / leadlen, gatelen * dir);
            this.interpPointOffsetFill(this.lead2, this.point2, this.gate[1], gatelen / leadlen, 16 * dir);
        }
    }

    handleDumpData(tokens: string[], start: number): void {
        // Format: lastvac lastvag triggerI holdingI gresistance
        if (tokens.length > start) this.lastVac = parseFloat(tokens[start]) || 0;
        if (tokens.length > start + 1) this.lastVag = parseFloat(tokens[start + 1]) || 0;
        if (tokens.length > start + 2) this.triggerI = parseFloat(tokens[start + 2]) || 0.01;
        if (tokens.length > start + 3) this.holdingI = parseFloat(tokens[start + 3]) || 0.0082;
        if (tokens.length > start + 4) this.gresistance = parseFloat(tokens[start + 4]) || 50;
    }

    reset(): void {
        for (let i = 0; i < this.volts.length; i++) this.volts[i] = 0;
        this.curcount = 0;
        this.ia = this.ic = this.ig = 0;
        this.lastVac = this.lastVag = 0;
    }

    stamp(context: StampContext): void {
        context.stampNonLinear(this.nodes[0]); // anode
        context.stampNonLinear(this.nodes[1]); // cathode
        context.stampNonLinear(this.nodes[2]); // gate
        context.stampNonLinear(this.nodes[3]); // internal

        // Gate-cathode resistor
        context.stampResistor(this.nodes[2], this.nodes[1], this.gresistance);
    }

    doStep(context: StampContext): void {
        const vac = this.volts[0] - this.volts[1]; // anode-cathode
        const vag = this.volts[0] - this.volts[2]; // anode-gate

        if (Math.abs(vac - this.lastVac) > 0.01 || Math.abs(vag - this.lastVag) > 0.01) {
            context.setConverged(false);
        }
        this.lastVac = vac;
        this.lastVag = vag;

        // Compute trigger condition
        const icmult = 1 / this.triggerI;
        const iamult = 1 / this.holdingI - icmult;

        this.aresistance = (-icmult * this.ic + this.ia * iamult > 1) ? 0.0105 : 10e5;

        // Stamp anode-internal resistor
        context.stampResistor(this.nodes[0], this.nodes[3], this.aresistance);
    }

    calculateCurrent(): void {
        this.ig = (this.volts[2] - this.volts[1]) / this.gresistance;
        this.ia = (this.volts[0] - this.volts[3]) / this.aresistance;
        this.ic = -this.ig - this.ia;
    }

    getCurrentIntoNode(n: number): number {
        if (n === 0) return -this.ia;
        if (n === 1) return -this.ic;
        return -this.ig;
    }

    getPower(): number {
        return (this.volts[0] - this.volts[2]) * this.ia + (this.volts[1] - this.volts[2]) * this.ic;
    }

    draw(g: Graphics): void {
        const hs = 8;
        this.setBboxPts(this.point1, this.point2, hs);
        if (this.gate.length >= 2) {
            this.adjustBboxPts(this.gate[0], this.gate[1]);
        }

        // Leads
        this.setVoltageColor(g, this.volts[0]);
        CircuitComponent.drawThickLine(g, this.point1, this.lead1);

        // Arrow (triangle fill)
        this.setVoltageColor(g, this.volts[0]);
        g.setLineWidth(2);
        g.fillPolygon(this.poly.xpoints, this.poly.ypoints, this.poly.npoints);

        // Cathode bar
        this.setVoltageColor(g, this.volts[1]);
        CircuitComponent.drawThickLine(g, this.lead2, this.point2);
        CircuitComponent.drawThickLine(g, this.cathode[0], this.cathode[1]);

        // Gate lead
        if (this.gate.length >= 2) {
            this.setVoltageColor(g, this.volts[2]);
            CircuitComponent.drawThickLine(g, this.lead2, this.gate[0]);
            CircuitComponent.drawThickLine(g, this.gate[0], this.gate[1]);
        }

        // Current dots
        this.drawDots(g, this.point1, this.lead2, this.curcount);
        this.drawDots(g, this.point2, this.lead2, 0);

        // Posts
        g.setColor('#FFFFFF');
        g.fillOval(this.point1.x - 3, this.point1.y - 3, 7, 7);
        g.fillOval(this.point2.x - 3, this.point2.y - 3, 7, 7);
        if (this.gate.length >= 2) {
            g.fillOval(this.gate[1].x - 3, this.gate[1].y - 3, 7, 7);
        }

        // Pin labels
        if (this.needsHighlight()) {
            g.setColor('#FFFFFF');
            g.setFontSize(10);
            g.drawString('A', this.point1.x + 5, this.point1.y - 4);
            g.drawString('C', this.point2.x + 5, this.point2.y + 4);
            if (this.gate.length >= 2) {
                g.drawString('G', this.gate[0].x, this.gate[0].y + 12);
            }
        }
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Trigger Current (A)', value: this.triggerI };
        if (n === 1) return { name: 'Holding Current (A)', value: this.holdingI };
        if (n === 2) return { name: 'Gate Resistance (ohms)', value: this.gresistance };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined) {
            if (_n === 0 && ei.value > 0) this.triggerI = ei.value;
            if (_n === 1 && ei.value > 0) this.holdingI = ei.value;
            if (_n === 2 && ei.value > 0) this.gresistance = ei.value;
        }
    }

    getInfo(): string[] {
        return [
            'SCR',
            `Ia = ${this.ia.toExponential(2)} A`,
            `Ig = ${this.ig.toExponential(2)} A`,
            `Vac = ${(this.volts[0] - this.volts[1]).toFixed(2)} V`,
            `Vag = ${(this.volts[0] - this.volts[2]).toFixed(2)} V`,
        ];
    }
}

registerComponent(177, 'SCRElm', SCRComponent);
