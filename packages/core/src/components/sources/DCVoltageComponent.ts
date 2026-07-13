import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLinePt, drawThickLineXY, drawThickCircle,
    drawValues, drawDots, drawPost, interpPoint2, interpPoint,
} from '../drawutils.js';

export const WF_DC = 0;
export const WF_AC = 1;
export const WF_SQUARE = 2;
export const WF_TRIANGLE = 3;
export const WF_SAWTOOTH = 4;
export const WF_PULSE = 5;
export const WF_VAR = 6;
export const WF_NOISE = 7;

export class VoltageComponent extends CircuitComponent {
    waveform = WF_DC;
    frequency = 40;
    maxVoltage = 5;
    bias = 0;
    phaseShift = 0;
    dutyCycle = 0.5;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    getDumpType(): number | string { return 'v'; }
    getVoltageSourceCount(): number { return 1; }

    handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.waveform = parseInt(tokens[start]) || 0;
        if (tokens.length > start + 1) this.frequency = parseFloat(tokens[start + 1]) || 40;
        if (tokens.length > start + 2) this.maxVoltage = parseFloat(tokens[start + 2]) || 5;
        if (tokens.length > start + 3) this.bias = parseFloat(tokens[start + 3]) || 0;
        if (tokens.length > start + 4) this.phaseShift = parseFloat(tokens[start + 4]) || 0;
        if (tokens.length > start + 5) this.dutyCycle = parseFloat(tokens[start + 5]) || 0.5;
    }

    dump(): string {
        return super.dump() + ` ${this.waveform} ${this.frequency} ${this.maxVoltage} ${this.bias} ${this.phaseShift} ${this.dutyCycle}`;
    }

    stamp(context: StampContext): void {
        if (this.waveform === WF_DC) {
            context.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, this.getVoltage());
        } else {
            context.stampVoltageSource(this.nodes[0], this.nodes[1], this.voltSource);
        }
    }

    doStep(context: StampContext): void {
        if (this.waveform !== WF_DC) {
            context.updateVoltageSource(this.nodes[0], this.nodes[1], this.voltSource, this.getVoltage());
        }
    }

    getVoltage(): number {
        if (this.waveform === WF_DC) return this.maxVoltage;
        const t = this.simTime;
        const phase = 2 * Math.PI * this.frequency * t + this.phaseShift;
        switch (this.waveform) {
            case WF_AC: return this.bias + this.maxVoltage * Math.sin(phase);
            case WF_SQUARE: return this.bias + (Math.sin(phase) >= 0 ? this.maxVoltage : -this.maxVoltage);
            case WF_TRIANGLE: {
                const period = 1 / this.frequency;
                const tp = ((t % period) + period) % period;
                const half = period / 2;
                return this.bias + (tp < half
                    ? 2 * this.maxVoltage * tp / half - this.maxVoltage
                    : 2 * this.maxVoltage * (period - tp) / half - this.maxVoltage);
            }
            case WF_SAWTOOTH: {
                const period = 1 / this.frequency;
                const tp = ((t % period) + period) % period;
                return this.bias + this.maxVoltage * (2 * tp / period - 1);
            }
            case WF_PULSE: {
                const period = 1 / this.frequency;
                const tp = ((t % period) + period) % period;
                return tp < period * this.dutyCycle ? this.maxVoltage + this.bias : this.bias;
            }
            case WF_VAR:
            case WF_NOISE:
            default: return this.bias;
        }
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Voltage', value: this.maxVoltage };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value !== undefined) this.maxVoltage = ei.value;
    }

    getInfo(): string[] {
        return [`${this.waveform === WF_DC ? 'DC' : 'AC'} Voltage: ${this.maxVoltage} V`];
    }

    getShortcut(): number { return 'v'.charCodeAt(0); }

    setPoints(): void {
        super.setPoints();
        const leadLen = (this.waveform === WF_DC || this.waveform === WF_VAR) ? 8 : 32;
        this.calcLeads(leadLen);
    }

    draw(g: Graphics): void {
        const v1 = this.volts[0];
        const v2 = this.volts[1];

        // Draw voltage-colored leads (draw2Leads equivalent)
        setVoltageColor(g, v1, this);
        drawThickLinePt(g, this.point1, this.lead1);
        setVoltageColor(g, v2, this);
        drawThickLinePt(g, this.lead2, this.point2);

        if (this.waveform === WF_DC) {
            // Battery symbol: narrow plate at lead1, wide plate at lead2
            const hs1 = 10;
            const hs2 = 16;
            const p1a = { x: 0, y: 0 }, p1b = { x: 0, y: 0 };
            const p2a = { x: 0, y: 0 }, p2b = { x: 0, y: 0 };
            interpPoint2(this.lead1, this.lead2, p1a, p1b, 0, hs1);
            interpPoint2(this.lead1, this.lead2, p2a, p2b, 1, hs2);

            setVoltageColor(g, v1, this);
            drawThickLineXY(g, p1a.x, p1a.y, p1b.x, p1b.y);
            setVoltageColor(g, v2, this);
            drawThickLineXY(g, p2a.x, p2a.y, p2b.x, p2b.y);
        } else {
            // AC/other: circle with waveform symbol at center
            const circleSize = 16;
            const mid = interpPoint(this.lead1, this.lead2, 0.5);
            setVoltageColor(g, (v1 + v2) / 2, this);
            drawThickCircle(g, mid.x, mid.y, circleSize);

            // Draw waveform symbol inside circle
            g.setLineWidth(2);
            g.setColor('#FFFFFF');
            const wl = 8;
            if (this.waveform === WF_AC) {
                // Sine wave
                const ctx = g.getContext();
                ctx.beginPath();
                for (let i = -wl; i <= wl; i++) {
                    const yy = mid.y + Math.round(0.95 * Math.sin(i * Math.PI / wl) * (wl - 2));
                    if (i === -wl) ctx.moveTo(mid.x + i, yy);
                    else ctx.lineTo(mid.x + i, yy);
                }
                ctx.stroke();
            } else {
                // Generic waveform: just show label
                g.setFontSize(11);
                g.textAlign('center');
                g.textBaseline('middle');
                g.drawString('~', mid.x, mid.y);
            }
        }

        drawDots(g, this.point1, this.lead1, this.curcount);
        drawDots(g, this.lead2, this.point2, this.curcount);
        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }
}

export { VoltageComponent as DCVoltageComponent };
registerComponent('v'.charCodeAt(0), 'VoltageElm', VoltageComponent);
registerComponent('v'.charCodeAt(0), 'DCVoltageElm', VoltageComponent);
