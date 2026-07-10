import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics, Point } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLinePt, drawThickLineXY,
    drawPost, drawDots, drawValues,
} from '../drawutils.js';

/**
 * Relay — electromagnet coil controlling switch contacts.
 * Port of Java RelayElm.
 *
 * Node arrangement:
 *   Per pole p: nSwitch0=3p, nSwitch1=3p+1, nSwitch2=3p+2
 *   Coil: nCoil1=3*poleCount, nCoil2=3*poleCount+1, nCoil3=3*poleCount+2 (internal)
 *   Internal nodes: nCoil3
 */
export class RelayComponent extends CircuitComponent {
    inductance = 0.2;
    rOn = 0.05;
    rOff = 1e6;
    onCurrent = 0.02;
    coilR = 20;
    poleCount = 1;
    coilCurrent = 0;
    switchCurrent: number[] = [];
    dPosition = 0;  // 0=off, 1=on, continuous
    iPosition = 0;  // 0=off, 1=on, 2=transition

    // Inductor companion model for the coil
    private coilResistance = 0;
    private curSourceValue = 0;
    private useTrapezoidal = true;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
        this.switchCurrent = new Array(this.poleCount);
        this.allocNodes();
        this.setPoints();
    }

    override getDumpType(): number | string { return 178; }

    override handleDumpData(tokens: string[], startIndex: number): void {
        if (tokens.length > startIndex) this.poleCount = parseInt(tokens[startIndex]);
        if (tokens.length > startIndex + 1) this.inductance = parseFloat(tokens[startIndex + 1]);
        if (tokens.length > startIndex + 2) this.coilCurrent = parseFloat(tokens[startIndex + 2]);
        if (tokens.length > startIndex + 3) this.rOn = parseFloat(tokens[startIndex + 3]);
        if (tokens.length > startIndex + 4) this.rOff = parseFloat(tokens[startIndex + 4]);
        if (tokens.length > startIndex + 5) this.onCurrent = parseFloat(tokens[startIndex + 5]);
        if (tokens.length > startIndex + 6) this.coilR = parseFloat(tokens[startIndex + 6]);
        this.switchCurrent = new Array(this.poleCount);
        this.allocNodes();
        this.setPoints();
    }

    override dump(): string {
        return super.dump() + ` ${this.poleCount} ${this.inductance} ${this.coilCurrent} ${this.rOn} ${this.rOff} ${this.onCurrent} ${this.coilR}`;
    }

    override getPostCount(): number { return 2 + this.poleCount * 3; }
    override getInternalNodeCount(): number { return 1; } // nCoil3

    private get nCoil1(): number { return 3 * this.poleCount; }
    private get nCoil2(): number { return 3 * this.poleCount + 1; }
    private get nCoil3(): number { return 3 * this.poleCount + 2; }

    override reset(): void {
        super.reset();
        this.coilCurrent = 0;
        this.dPosition = 0;
        this.iPosition = 0;
        this.switchCurrent = new Array(this.poleCount);
    }

    override stamp(context: StampContext): void {
        // Inductor companion model for the coil (between nCoil1 and nCoil3)
        if (context.timeStep === 0) {
            context.stampVoltageSource(this.nodes[this.nCoil1], this.nodes[this.nCoil3], this.voltSource, 0);
        } else {
            this.useTrapezoidal = context.integrationMethod !== 'backwardEuler';
            this.coilResistance = this.useTrapezoidal
                ? 2 * this.inductance / context.timeStep
                : this.inductance / context.timeStep;
            context.stampResistor(this.nodes[this.nCoil1], this.nodes[this.nCoil3], this.coilResistance);
            context.markRightSideChanging(this.nodes[this.nCoil1]);
            context.markRightSideChanging(this.nodes[this.nCoil3]);
        }

        // Coil series resistance
        context.stampResistor(this.nodes[this.nCoil3], this.nodes[this.nCoil2], this.coilR);

        // Switch nodes are nonlinear
        for (let p = 0; p < this.poleCount; p++) {
            context.stampNonLinear(this.nodes[3 * p]);
            context.stampNonLinear(this.nodes[3 * p + 1]);
            context.stampNonLinear(this.nodes[3 * p + 2]);
        }
    }

    override nonLinear(): boolean { return true; }

    override startIteration(): void {
        // Inductor companion current source
        if (this.coilResistance > 0) {
            const vd = this.volts[this.nCoil1] - this.volts[this.nCoil3];
            if (this.useTrapezoidal) {
                this.curSourceValue = vd / this.coilResistance + this.coilCurrent;
            } else {
                this.curSourceValue = this.coilCurrent;
            }
        }

        // Determine relay position from coil current
        const pmult = Math.sqrt(2.3);
        const c = this.coilCurrent * pmult / this.onCurrent;
        this.dPosition = c * c - 1.3;
        if (this.dPosition < 0) this.dPosition = 0;
        if (this.dPosition > 1) this.dPosition = 1;

        if (this.dPosition < 0.1) this.iPosition = 0;
        else if (this.dPosition > 0.9) this.iPosition = 1;
        else this.iPosition = 2;
    }

    override doStep(context: StampContext): void {
        // Inductor current source
        if (this.coilResistance > 0) {
            context.stampCurrentSource(this.nodes[this.nCoil1], this.nodes[this.nCoil3], this.curSourceValue);
        }

        // Stamp switch resistances
        for (let p = 0; p < this.poleCount; p++) {
            const n0 = 3 * p;      // common pole
            const n1 = 3 * p + 1;  // NC (normally closed, position 0)
            const n2 = 3 * p + 2;  // NO (normally open, position 1)

            if (this.iPosition === 0) {
                // Off position: pole connected to NC (n0-n1)
                context.stampResistor(this.nodes[n0], this.nodes[n1], this.rOn);
                context.stampResistor(this.nodes[n0], this.nodes[n2], this.rOff);
            } else if (this.iPosition === 1) {
                // On position: pole connected to NO (n0-n2)
                context.stampResistor(this.nodes[n0], this.nodes[n1], this.rOff);
                context.stampResistor(this.nodes[n0], this.nodes[n2], this.rOn);
            } else {
                // Transition: both contacts disconnected
                context.stampResistor(this.nodes[n0], this.nodes[n1], this.rOff);
                context.stampResistor(this.nodes[n0], this.nodes[n2], this.rOff);
            }
        }
    }

    override calculateCurrent(): void {
        // Coil current from companion model
        const vd = this.volts[this.nCoil1] - this.volts[this.nCoil3];
        if (this.coilResistance > 0) {
            this.coilCurrent = vd / this.coilResistance + this.curSourceValue;
        }

        // Switch currents
        for (let p = 0; p < this.poleCount; p++) {
            const n0 = 3 * p;
            const n1 = 3 * p + 1;
            const n2 = 3 * p + 2;
            if (this.iPosition === 0) {
                this.switchCurrent[p] = (this.volts[n0] - this.volts[n1]) / this.rOn;
            } else if (this.iPosition === 1) {
                this.switchCurrent[p] = (this.volts[n0] - this.volts[n2]) / this.rOn;
            } else {
                this.switchCurrent[p] = 0;
            }
        }
    }

    override getVoltageSourceCount(): number { return 1; }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Inductance (H)', value: this.inductance, min: 0.001, max: 10 };
        if (n === 1) return { name: 'On Resistance (ohm)', value: this.rOn, min: 0.001, max: 100 };
        if (n === 2) return { name: 'Off Resistance (ohm)', value: this.rOff, min: 1000, max: 1e9 };
        if (n === 3) return { name: 'On Current (A)', value: this.onCurrent, min: 0.001, max: 10 };
        if (n === 4) return { name: 'Number of Poles', value: this.poleCount, min: 1, max: 4 };
        if (n === 5) return { name: 'Coil Resistance (ohm)', value: this.coilR, min: 0.1, max: 1000 };
        if (n === 6) {
            return {
                name: 'Swap Coil Direction',
                checkbox: true,
                checkboxState: (this.flags & 1) !== 0,
            };
        }
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined) {
            if (_n === 0) this.inductance = ei.value;
            if (_n === 1) this.rOn = ei.value;
            if (_n === 2) this.rOff = ei.value;
            if (_n === 3) this.onCurrent = ei.value;
            if (_n === 4) {
                this.poleCount = Math.round(ei.value);
                this.switchCurrent = new Array(this.poleCount);
                this.allocNodes();
                this.setPoints();
            }
            if (_n === 5) this.coilR = ei.value;
        }
        if (_n === 6 && ei.checkboxState !== undefined) {
            if (ei.checkboxState) this.flags |= 1;
            else this.flags &= ~1;
        }
    }

    override getInfo(): string[] {
        const stateLabels = ['off', 'on', 'relay'];
        const arr: string[] = [`relay (${stateLabels[this.iPosition]})`];
        for (let p = 0; p < this.poleCount; p++) {
            arr[p + 1] = `I${p} = ${(this.switchCurrent[p] * 1000).toFixed(2)} mA`;
        }
        arr[this.poleCount + 1] = `Icoil = ${(this.coilCurrent * 1000).toFixed(2)} mA`;
        arr[this.poleCount + 2] = `Vcoil = ${(this.volts[this.nCoil1] - this.volts[this.nCoil2]).toFixed(3)} V`;
        return arr;
    }

    override getShortcut(): number { return 'R'.charCodeAt(0); }

    getConnection(n1: number, _n2: number): boolean {
        // Each pole's three terminals are connected to each other
        for (let p = 0; p < this.poleCount; p++) {
            const base = 3 * p;
            if (n1 >= base && n1 < base + 3) {
                return _n2 >= base && _n2 < base + 3;
            }
        }
        return false;
    }

    override draw(g: Graphics): void {
        const hs = 24;
        const vcoil1 = this.volts[this.nCoil1];
        const vcoil2 = this.volts[this.nCoil2];

        this.calcLeads(48);

        // Draw coil (left side)
        setVoltageColor(g, vcoil1, this);
        drawThickLinePt(g, this.point1, this.lead1);

        // Draw coil curves
        const midX = (this.lead1.x + this.lead2.x) * 0.3;
        const midY = (this.lead1.y + this.lead2.y) / 2;
        g.setColor('#808080');
        g.setLineWidth(2);
        const coils = 4;
        for (let i = 0; i < coils; i++) {
            const frac = (i + 0.5) / coils;
            const x = this.lead1.x + (midX - this.lead1.x) * frac;
            g.drawLine(x, midY - 8, x, midY + 8);
        }

        // Draw switch contacts (right side)
        setVoltageColor(g, vcoil2, this);
        drawThickLinePt(g, this.lead2, this.point2);

        // Normally-closed contact (top)
        const ncPos = { x: midX + 30, y: midY - 10 };
        const noPos = { x: midX + 30, y: midY + 10 };
        const polePos = { x: midX + 10, y: midY };

        g.setLineWidth(2);
        g.setColor('#808080');

        if (this.iPosition === 0) {
            // Connected to NC
            g.drawLine(polePos.x, polePos.y, ncPos.x, ncPos.y);
            g.drawLine(ncPos.x, ncPos.y, ncPos.x + 10, ncPos.y);
            g.drawLine(noPos.x, noPos.y, noPos.x + 10, noPos.y);
        } else if (this.iPosition === 1) {
            // Connected to NO
            g.drawLine(polePos.x, polePos.y, noPos.x, noPos.y);
            g.drawLine(noPos.x, noPos.y, noPos.x + 10, noPos.y);
            g.drawLine(ncPos.x, ncPos.y, ncPos.x + 10, ncPos.y);
        } else {
            // Transition
            g.drawLine(polePos.x, polePos.y, polePos.x + 10, polePos.y);
            g.drawLine(ncPos.x, ncPos.y, ncPos.x + 10, ncPos.y);
            g.drawLine(noPos.x, noPos.y, noPos.x + 10, noPos.y);
        }

        g.setLineWidth(1);
        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }
}

registerComponent(178, 'RelayElm', RelayComponent);
