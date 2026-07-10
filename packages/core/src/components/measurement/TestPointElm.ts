import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, Graphics, EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { drawPost } from '../drawutils.js';

/** TestPointElm — single-post test point with multi-function voltage measurement */
export class TestPointElm extends CircuitComponent {
    meter = 0;

    static readonly TP_VOL = 0;
    static readonly TP_RMS = 1;
    static readonly TP_MAX = 2;
    static readonly TP_MIN = 3;
    static readonly TP_P2P = 4;
    static readonly TP_BIN = 5;
    static readonly TP_FRQ = 6;
    static readonly TP_PER = 7;
    static readonly TP_PWI = 8;
    static readonly TP_DUT = 9;

    zerocount = 0;
    rmsV = 0;
    total = 0;
    count = 0;
    maxV = 0;
    lastMaxV = 0;
    minV = 0;
    lastMinV = 0;
    frequency = 0;
    period = 0;
    binaryLevel = 0;
    pulseWidth = 0;
    dutyCycle = 0;
    selectedValue = 0;
    lastStepCount = -1;

    increasingV = true;
    decreasingV = true;
    periodStart = 0;
    periodLength = 0;
    pulseStart = 0;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.meter = TestPointElm.TP_VOL;
    }

    getDumpType(): number | string {
        return 368;
    }

    override getPostCount(): number {
        return 1;
    }

    override stamp(_context: StampContext): void {
        // Test point — no MNA stamping needed
    }

    override dump(): string {
        return `${super.dump()} ${this.meter}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.meter = parseInt(tokens[start]) || 0;
    }

    override setPoints(): void {
        super.setPoints();
        this.lead1 = { x: this.point1.x, y: this.point1.y };
    }

    override draw(g: Graphics): void {
        const selected = this.needsHighlight();
        g.setFont('SansSerif', selected ? 14 : 12);
        g.setFontSize(selected ? 14 : 12);
        g.setColor(selected ? '#00FFFF' : '#FFFFFF');

        // Draw "TP" label
        const s = 'TP';
        const textWidth = g.measureWidth(s);
        const f = 1 - (Math.floor(textWidth / 2) + 8) / (this.dn || 1);
        this.lead1 = {
            x: Math.floor(this.point1.x * (1 - f) + this.point2.x * f + 0.48),
            y: Math.floor(this.point1.y * (1 - f) + this.point2.y * f + 0.48),
        };
        this.setBbox(this.point1.x, this.point1.y, this.lead1.x, this.lead1.y);
        this.adjustBbox(this.point1.x, this.point1.y - 12, this.point2.x, this.point2.y + 12);

        g.textAlign('center');
        g.textBaseline('middle');
        g.drawString(s, this.x2, this.y2);

        // Draw measurement value below
        let valStr = '';
        switch (this.meter) {
            case TestPointElm.TP_VOL:
                valStr = this.formatValue(this.volts[0], 'V');
                break;
            case TestPointElm.TP_RMS:
                valStr = this.formatValue(this.rmsV, 'V(rms)');
                break;
            case TestPointElm.TP_MAX:
                valStr = this.formatValue(this.lastMaxV, 'Vpk');
                break;
            case TestPointElm.TP_MIN:
                valStr = this.formatValue(this.lastMinV, 'Vmin');
                break;
            case TestPointElm.TP_P2P:
                valStr = this.formatValue(this.lastMaxV - this.lastMinV, 'Vp2p');
                break;
            case TestPointElm.TP_BIN:
                valStr = `${this.binaryLevel}`;
                break;
            case TestPointElm.TP_FRQ:
                valStr = this.formatUnit(this.frequency, 'Hz');
                break;
            case TestPointElm.TP_PWI:
                valStr = this.formatUnit(this.pulseWidth, 's');
                break;
            case TestPointElm.TP_DUT:
                valStr = `${(this.dutyCycle * 100).toFixed(1)}%`;
                break;
        }
        if (valStr) {
            g.drawString(valStr, this.x2, this.y2 + 14);
        }

        this.setVoltageColor(g, this.volts[0]);
        if (selected) g.setColor('#00FFFF');
        CircuitComponent.drawThickLine(g, this.point1, this.lead1);
        this.drawPosts(g);
    }

    private drawPosts(g: Graphics): void {
        drawPost(g, this.point1);
    }

    override stepFinished(): void {
        if (this.simTime === this.lastStepCount) return;
        this.lastStepCount = this.simTime;

        this.count++;
        this.total += this.volts[0] * this.volts[0];
        const v = this.volts[0];

        this.binaryLevel = (v < 2.5) ? 0 : 1;

        if (v > this.maxV && this.increasingV) {
            this.maxV = v;
            this.increasingV = true;
            this.decreasingV = false;
        }
        if (v < this.maxV && this.increasingV) {
            this.lastMaxV = this.maxV;
            this.periodLength = performance.now() - this.periodStart;
            this.periodStart = performance.now();
            this.period = this.periodLength;
            this.pulseWidth = performance.now() - this.pulseStart;
            this.dutyCycle = (this.periodLength > 0) ? this.pulseWidth / this.periodLength : 0;
            this.minV = v;
            this.increasingV = false;
            this.decreasingV = true;

            this.total = this.total / this.count;
            this.rmsV = Math.sqrt(this.total);
            if (isNaN(this.rmsV)) this.rmsV = 0;
            this.count = 0;
            this.total = 0;
        }
        if (v < this.minV && this.decreasingV) {
            this.minV = v;
            this.increasingV = false;
            this.decreasingV = true;
        }
        if (v > this.minV && this.decreasingV) {
            this.lastMinV = this.minV;
            this.pulseStart = performance.now();
            this.maxV = v;
            this.increasingV = true;
            this.decreasingV = false;

            this.total = this.total / this.count;
            this.rmsV = Math.sqrt(this.total);
            if (isNaN(this.rmsV)) this.rmsV = 0;
            this.count = 0;
            this.total = 0;
        }
        if (v === 0) {
            this.zerocount++;
            if (this.zerocount > 5) {
                this.total = 0;
                this.rmsV = 0;
                this.maxV = 0;
                this.minV = 0;
            }
        } else {
            this.zerocount = 0;
        }
    }

    override getVoltageDiff(): number {
        return this.volts[0];
    }

    override getInfo(): string[] {
        const info = ['Test Point'];
        switch (this.meter) {
            case TestPointElm.TP_VOL:
                info[1] = `V = ${this.formatValue(this.volts[0], 'V')}`;
                break;
            case TestPointElm.TP_RMS:
                info[1] = `V(rms) = ${this.formatValue(this.rmsV, 'V')}`;
                break;
            case TestPointElm.TP_MAX:
                info[1] = `Vmax = ${this.formatValue(this.lastMaxV, 'Vpk')}`;
                break;
            case TestPointElm.TP_MIN:
                info[1] = `Vmin = ${this.formatValue(this.lastMinV, 'Vmin')}`;
                break;
            case TestPointElm.TP_P2P:
                info[1] = `Vp2p = ${this.formatValue(this.lastMaxV - this.lastMinV, 'Vp2p')}`;
                break;
            case TestPointElm.TP_BIN:
                info[1] = `Binary: ${this.binaryLevel}`;
                break;
            case TestPointElm.TP_FRQ:
                info[1] = `Freq = ${this.formatUnit(this.frequency, 'Hz')}`;
                break;
            case TestPointElm.TP_PWI:
                info[1] = `Pulse width = ${this.formatUnit(this.pulseWidth, 's')}`;
                break;
            case TestPointElm.TP_DUT:
                info[1] = `Duty cycle = ${(this.dutyCycle * 100).toFixed(1)}%`;
                break;
        }
        return info;
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) {
            return {
                name: 'Value',
                value: this.selectedValue,
                choices: [
                    'Voltage', 'RMS Voltage', 'Max Voltage', 'Min Voltage',
                    'P2P Voltage', 'Binary Value',
                ],
                selectedIndex: this.meter,
            };
        }
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.selectedIndex !== undefined) {
            this.meter = ei.selectedIndex;
        }
    }

    private formatValue(v: number, _unit: string): string {
        if (Math.abs(v) < 1e-3) return `${(v * 1e3).toFixed(2)} mV`;
        if (Math.abs(v) < 1) return `${(v * 1e3).toFixed(2)} mV`;
        return `${v.toFixed(2)} V`;
    }

    private formatUnit(value: number, unit: string): string {
        if (value >= 1e6) return `${(value / 1e6).toFixed(2)} M${unit}`;
        if (value >= 1e3) return `${(value / 1e3).toFixed(2)} k${unit}`;
        if (value >= 1) return `${value.toFixed(2)} ${unit}`;
        if (value >= 1e-3) return `${(value * 1e3).toFixed(2)} m${unit}`;
        return `${(value * 1e6).toFixed(2)} µ${unit}`;
    }
}

registerComponent(368, 'TestPointElm', TestPointElm);
