import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { interpPoint } from '../drawutils.js';

/**
 * VCCS (Voltage-Controlled Current Source) — transconductance amplifier.
 * Port of Java VCCSElm (dump type 213)
 *
 * Post layout: 0 = output+, 1 = output-, 2 = control+, 3 = control-
 * I(output) = gain * (V(control+) - V(control-))
 */
export class VCCSComponent extends CircuitComponent {
    gain = 0.001; // transconductance (A/V)

    getDumpType(): number | string { return 213; }
    getPostCount(): number { return 4; }

    handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.gain = parseFloat(tokens[start]) || 0.001;
    }

    stamp(context: StampContext): void {
        context.stampVCCurrentSource(
            this.nodes[0], this.nodes[1],
            this.nodes[2], this.nodes[3],
            this.gain,
        );
    }

    calculateCurrent(): void {
        const vc = this.volts[2] - this.volts[3];
        this.current = this.gain * vc;
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Gain (A/V)', value: this.gain };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined && _n === 0) this.gain = ei.value;
    }

    getInfo(): string[] {
        return ['VCCS', `G = ${this.gain.toExponential(3)} A/V`, `I = ${this.current.toExponential(3)} A`];
    }

    draw(g: Graphics): void {
        this.calcLeads(20);
        this.setVoltageColor(g, this.volts[0]);
        CircuitComponent.drawThickLine(g, this.point1, this.lead1);
        this.setVoltageColor(g, this.volts[1]);
        CircuitComponent.drawThickLine(g, this.lead2, this.point2);

        // Diamond shape
        const mid = interpPoint(this.lead1, this.lead2, 0.5);
        const hs = 12;
        const top = { x: mid.x, y: mid.y - hs };
        const bot = { x: mid.x, y: mid.y + hs };
        const left = this.lead1;
        const right = this.lead2;

        g.setLineWidth(2);
        this.setVoltageColor(g, (this.volts[0] + this.volts[1]) / 2);
        g.drawPolyline(
            [left.x, top.x, right.x, bot.x, left.x],
            [left.y, top.y, right.y, bot.y, left.y],
            5,
        );

        // Label
        g.setColor('#FFFFFF');
        g.setFontSize(10);
        g.textAlign('center');
        g.textBaseline('middle');
        g.drawString('VCCS', mid.x, mid.y);

        g.setColor('#FFFFFF');
        g.fillOval(this.point1.x - 3, this.point1.y - 3, 7, 7);
        g.fillOval(this.point2.x - 3, this.point2.y - 3, 7, 7);
    }
}

/**
 * VCVS (Voltage-Controlled Voltage Source).
 * Port of Java VCVSElm (dump type 212)
 */
export class VCVSComponent extends CircuitComponent {
    gain = 1;

    getDumpType(): number | string { return 212; }
    getPostCount(): number { return 4; }
    getVoltageSourceCount(): number { return 1; }

    handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.gain = parseFloat(tokens[start]) || 1;
    }

    stamp(context: StampContext): void {
        // Output is a voltage source
        context.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource);
        // Stamp the controlling voltage relationship
        context.stampCCCS(this.nodes[0], this.nodes[1], this.voltSource, -this.gain);
    }

    doStep(context: StampContext): void {
        const vc = this.volts[2] - this.volts[3];
        context.updateVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, this.gain * vc);
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Gain (V/V)', value: this.gain };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined && _n === 0) this.gain = ei.value;
    }

    getInfo(): string[] {
        return ['VCVS', `G = ${this.gain} V/V`];
    }

    draw(g: Graphics): void {
        this.calcLeads(20);
        this.setVoltageColor(g, this.volts[0]);
        CircuitComponent.drawThickLine(g, this.point1, this.lead1);
        this.setVoltageColor(g, this.volts[1]);
        CircuitComponent.drawThickLine(g, this.lead2, this.point2);

        const mid = interpPoint(this.lead1, this.lead2, 0.5);
        const hs = 12;
        const top = { x: mid.x, y: mid.y - hs };
        const bot = { x: mid.x, y: mid.y + hs };

        g.setLineWidth(2);
        this.setVoltageColor(g, (this.volts[0] + this.volts[1]) / 2);
        g.drawPolyline(
            [this.lead1.x, top.x, this.lead2.x, bot.x, this.lead1.x],
            [this.lead1.y, top.y, this.lead2.y, bot.y, this.lead1.y],
            5,
        );

        g.setColor('#FFFFFF');
        g.setFontSize(10);
        g.textAlign('center');
        g.textBaseline('middle');
        g.drawString('VCVS', mid.x, mid.y);

        g.setColor('#FFFFFF');
        g.fillOval(this.point1.x - 3, this.point1.y - 3, 7, 7);
        g.fillOval(this.point2.x - 3, this.point2.y - 3, 7, 7);
    }
}

/**
 * CCCS (Current-Controlled Current Source).
 * Port of Java CCCSElm (dump type 215)
 */
export class CCCSComponent extends CircuitComponent {
    gain = 1;

    getDumpType(): number | string { return 215; }
    getPostCount(): number { return 4; }

    handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.gain = parseFloat(tokens[start]) || 1;
    }

    stamp(context: StampContext): void {
        // Use the voltage source index for current sensing
        context.stampCCCS(this.nodes[0], this.nodes[1], this.voltSource, this.gain);
    }

    getVoltageSourceCount(): number { return 1; }

    calculateCurrent(): void {
        // Current is set through the CCCS mechanism
    }

    setCurrent(vn: number, c: number): void {
        this.current = c * this.gain;
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Gain (A/A)', value: this.gain };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined && _n === 0) this.gain = ei.value;
    }

    getInfo(): string[] {
        return ['CCCS', `G = ${this.gain} A/A`];
    }

    draw(g: Graphics): void {
        this.calcLeads(20);
        this.setVoltageColor(g, this.volts[0]);
        CircuitComponent.drawThickLine(g, this.point1, this.lead1);
        this.setVoltageColor(g, this.volts[1]);
        CircuitComponent.drawThickLine(g, this.lead2, this.point2);

        const mid = interpPoint(this.lead1, this.lead2, 0.5);
        const hs = 12;
        const top = { x: mid.x, y: mid.y - hs };
        const bot = { x: mid.x, y: mid.y + hs };

        g.setLineWidth(2);
        this.setVoltageColor(g, (this.volts[0] + this.volts[1]) / 2);
        g.drawPolyline(
            [this.lead1.x, top.x, this.lead2.x, bot.x, this.lead1.x],
            [this.lead1.y, top.y, this.lead2.y, bot.y, this.lead1.y],
            5,
        );

        g.setColor('#FFFFFF');
        g.setFontSize(10);
        g.textAlign('center');
        g.textBaseline('middle');
        g.drawString('CCCS', mid.x, mid.y);

        g.setColor('#FFFFFF');
        g.fillOval(this.point1.x - 3, this.point1.y - 3, 7, 7);
        g.fillOval(this.point2.x - 3, this.point2.y - 3, 7, 7);
    }
}

/**
 * CCVS (Current-Controlled Voltage Source).
 * Port of Java CCVSElm (dump type 214)
 */
export class CCVSComponent extends CircuitComponent {
    gain = 1;

    getDumpType(): number | string { return 214; }
    getPostCount(): number { return 4; }
    getVoltageSourceCount(): number { return 1; }

    handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.gain = parseFloat(tokens[start]) || 1;
    }

    stamp(context: StampContext): void {
        // Output voltage source
        context.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource);
        // Current sensing
        context.stampCCCS(this.nodes[0], this.nodes[1], this.voltSource, -1);
    }

    doStep(context: StampContext): void {
        // Vout = gain * Icontrol
        // Icontrol is sensed through the voltage source
    }

    setCurrent(vn: number, c: number): void {
        this.current = c;
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Gain (V/A)', value: this.gain };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined && _n === 0) this.gain = ei.value;
    }

    getInfo(): string[] {
        return ['CCVS', `G = ${this.gain} V/A`];
    }

    draw(g: Graphics): void {
        this.calcLeads(20);
        this.setVoltageColor(g, this.volts[0]);
        CircuitComponent.drawThickLine(g, this.point1, this.lead1);
        this.setVoltageColor(g, this.volts[1]);
        CircuitComponent.drawThickLine(g, this.lead2, this.point2);

        const mid = interpPoint(this.lead1, this.lead2, 0.5);
        const hs = 12;
        const top = { x: mid.x, y: mid.y - hs };
        const bot = { x: mid.x, y: mid.y + hs };

        g.setLineWidth(2);
        this.setVoltageColor(g, (this.volts[0] + this.volts[1]) / 2);
        g.drawPolyline(
            [this.lead1.x, top.x, this.lead2.x, bot.x, this.lead1.x],
            [this.lead1.y, top.y, this.lead2.y, bot.y, this.lead1.y],
            5,
        );

        g.setColor('#FFFFFF');
        g.setFontSize(10);
        g.textAlign('center');
        g.textBaseline('middle');
        g.drawString('CCVS', mid.x, mid.y);

        g.setColor('#FFFFFF');
        g.fillOval(this.point1.x - 3, this.point1.y - 3, 7, 7);
        g.fillOval(this.point2.x - 3, this.point2.y - 3, 7, 7);
    }
}

registerComponent(213, 'VCCSElm', VCCSComponent);
registerComponent(212, 'VCVSElm', VCVSComponent);
registerComponent(215, 'CCCSElm', CCCSComponent);
registerComponent(214, 'CCVSElm', CCVSComponent);
