import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, Graphics, Point, EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { drawPost } from '../drawutils.js';

/** ProbeElm — voltage probe that can be connected to a scope */
export class ProbeElm extends CircuitComponent {
    meter = 0;  // TP_VOL = 0
    scale = 0;  // SCALE_AUTO = 0

    static readonly FLAG_SHOWVOLTAGE = 1;

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

    // Measurement state
    rmsV = 0;
    total = 0;
    count = 0;
    binaryLevel = 0;
    zerocount = 0;
    maxV = 0;
    lastMaxV = 0;
    minV = 0;
    lastMinV = 0;
    frequency = 0;
    period = 0;
    pulseWidth = 0;
    dutyCycle = 0;
    selectedValue = 0;

    increasingV = true;
    decreasingV = true;
    periodStart = 0;
    pulseStart = 0;

    center: Point = { x: 0, y: 0 };

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.flags = args.flags ?? ProbeElm.FLAG_SHOWVOLTAGE;
        this.meter = ProbeElm.TP_VOL;
    }

    getDumpType(): number | string {
        return 'p';
    }

    override dump(): string {
        return `${super.dump()} ${this.meter} ${this.scale}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.meter = parseInt(tokens[start]) || 0;
        if (tokens.length > start + 1) this.scale = parseInt(tokens[start + 1]) || 0;
    }

    override getPostCount(): number {
        return 2;
    }

    override stamp(_context: StampContext): void {
        // Probe is a passive voltage measurement — no MNA stamping needed
    }

    override setPoints(): void {
        super.setPoints();
        this.center = this.interpPoint(this.point1, this.point2, 0.5);
    }

    mustShowVoltage(): boolean {
        return (this.flags & ProbeElm.FLAG_SHOWVOLTAGE) !== 0;
    }

    override draw(g: Graphics): void {
        const hs = 8;
        this.setBbox(this.point1.x, this.point1.y, this.point2.x, this.point2.y);
        this.adjustBbox(this.point1.x, this.point1.y - hs, this.point2.x, this.point2.y + hs);

        const selected = this.needsHighlight();
        const len = (selected || this.mustShowVoltage()) ? 16 : Math.max(0, this.dn - 32);
        this.calcLeads(len);

        this.setVoltageColor(g, this.volts[0]);
        if (selected) g.setColor('#00FFFF');
        CircuitComponent.drawThickLine(g, this.point1, this.lead1);

        this.setVoltageColor(g, this.volts[1]);
        if (selected) g.setColor('#00FFFF');
        CircuitComponent.drawThickLine(g, this.lead2, this.point2);

        g.setFont('SansSerif', 14);

        if (this.mustShowVoltage()) {
            let s = '';
            switch (this.meter) {
                case ProbeElm.TP_VOL:
                    s = this.formatValueWithScale(this.getVoltageDiff(), 'V');
                    break;
                case ProbeElm.TP_RMS:
                    s = this.formatValueWithScale(this.rmsV, 'V(rms)');
                    break;
                case ProbeElm.TP_MAX:
                    s = this.formatValueWithScale(this.lastMaxV, 'Vpk');
                    break;
                case ProbeElm.TP_MIN:
                    s = this.formatValueWithScale(this.lastMinV, 'Vmin');
                    break;
                case ProbeElm.TP_P2P:
                    s = this.formatValueWithScale(this.lastMaxV - this.lastMinV, 'Vp2p');
                    break;
                case ProbeElm.TP_BIN:
                    s = `${this.binaryLevel}`;
                    break;
                case ProbeElm.TP_FRQ:
                    s = this.formatUnit(this.frequency, 'Hz');
                    break;
                case ProbeElm.TP_PWI:
                    s = this.formatUnit(this.pulseWidth, 's');
                    break;
                case ProbeElm.TP_DUT:
                    s = `${(this.dutyCycle * 100).toFixed(1)}%`;
                    break;
            }
            this.drawValues(g, s, 4);
        }

        // Draw the "+" symbol
        g.setColor('#FFFFFF');
        g.setFontSize(11);
        const dsign = Math.sign(this.y2 - this.y) || Math.sign(this.x2 - this.x) || 1;
        const frac = (this.dn / 2 - len / 2 - 4) / (this.dn || 1);
        const plusPoint = this.interpPointOffset(this.point1, this.point2, frac, -10 * dsign);
        if (this.y2 > this.y) plusPoint.y += 4;
        if (this.y > this.y2) plusPoint.y += 3;
        g.textAlign('center');
        g.drawString('+', plusPoint.x, plusPoint.y);

        this.drawPosts(g);
    }

    private drawPosts(g: Graphics): void {
        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }

    override stepFinished(): void {
        this.count++;
        const v = this.getVoltageDiff();
        this.total += v * v;

        this.binaryLevel = (v < 2.5) ? 0 : 1;

        // Track waveform peaks
        if (v > this.maxV && this.increasingV) {
            this.maxV = v;
            this.increasingV = true;
            this.decreasingV = false;
        }
        if (v < this.maxV && this.increasingV) {
            this.lastMaxV = this.maxV;
            this.periodStart = performance.now();
            this.period = this.periodStart;
            this.pulseWidth = performance.now() - this.pulseStart;
            this.dutyCycle = this.pulseWidth / (this.periodStart || 1);
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

    getConnection(_n1: number, _n2: number): boolean {
        return false;
    }

    override getInfo(): string[] {
        return [
            'voltmeter',
            `Vd = ${this.formatVoltage(this.getVoltageDiff())}`,
        ];
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) {
            return { name: 'Show Value', checkbox: true, checkboxState: this.mustShowVoltage() };
        }
        if (n === 1) {
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
        if (n === 2) {
            return {
                name: 'Scale',
                choices: ['Auto', 'V', 'mV', 'µV'],
                selectedIndex: this.scale,
            };
        }
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0) {
            if (ei.checkboxState) this.flags |= ProbeElm.FLAG_SHOWVOLTAGE;
            else this.flags &= ~ProbeElm.FLAG_SHOWVOLTAGE;
        }
        if (_n === 1 && ei.selectedIndex !== undefined) {
            this.meter = ei.selectedIndex;
        }
        if (_n === 2 && ei.selectedIndex !== undefined) {
            this.scale = ei.selectedIndex;
        }
    }

    private formatVoltage(v: number): string {
        if (Math.abs(v) < 1e-3) return `${(v * 1e3).toFixed(2)} mV`;
        return `${v.toFixed(2)} V`;
    }

    private formatValueWithScale(value: number, unit: string): string {
        return `${value.toFixed(2)} ${unit}`;
    }

    private formatUnit(value: number, unit: string): string {
        if (unit === 'Hz') {
            if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MHz`;
            if (value >= 1e3) return `${(value / 1e3).toFixed(2)} kHz`;
            return `${value.toFixed(2)} Hz`;
        }
        if (value >= 1) return `${value.toFixed(2)} ${unit}`;
        if (value >= 1e-3) return `${(value * 1e3).toFixed(2)} m${unit}`;
        if (value >= 1e-6) return `${(value * 1e6).toFixed(2)} µ${unit}`;
        return `${(value * 1e9).toFixed(2)} n${unit}`;
    }

    override getShortcut(): number {
        return 'p'.charCodeAt(0);
    }
}

registerComponent('p'.charCodeAt(0), 'ProbeElm', ProbeElm);
