import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, Graphics, EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { drawPost } from '../drawutils.js';

/** AudioOutputElm — records voltage data for audio playback */
export class AudioOutputElm extends CircuitComponent {
    duration = 1;
    samplingRate = 8000;
    labelNum = 0;
    data: number[] = [];
    dataCount = 0;
    dataPtr = 0;
    dataFull = false;
    sampleStep = 0;
    nextDataSample = 0;
    dataSample = 0;
    dataSampleCount = 0;
    dataStart = 0;
    static lastSamplingRate = 8000;
    static nextLabelCounter = 1;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.labelNum = AudioOutputElm.nextLabelCounter++;
        this.setDataCount();
    }

    getDumpType(): number | string {
        return 211;
    }

    override getPostCount(): number {
        return 1;
    }

    override stamp(_context: StampContext): void {
        // Audio output records voltage — no MNA stamping
    }

    override dump(): string {
        return `${super.dump()} ${this.duration} ${this.samplingRate} ${this.labelNum}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) this.duration = parseFloat(tokens[start]) || 1;
        if (tokens.length > start + 1) this.samplingRate = parseInt(tokens[start + 1]) || 8000;
        if (tokens.length > start + 2) this.labelNum = parseInt(tokens[start + 2]) || 0;
        this.setDataCount();
    }

    override reset(): void {
        this.dataPtr = 0;
        this.dataFull = false;
        this.dataSampleCount = 0;
        this.nextDataSample = 0;
        this.dataSample = 0;
    }

    setDataCount(): void {
        this.dataCount = Math.floor(this.samplingRate * this.duration);
        this.data = new Array(this.dataCount);
        this.sampleStep = 1 / this.samplingRate;
        this.reset();
    }

    override setPoints(): void {
        super.setPoints();
        this.lead1 = { x: this.point1.x, y: this.point1.y };
    }

    override draw(g: Graphics): void {
        const selected = this.needsHighlight();
        const s = this.labelNum > 1 ? `Audio ${this.labelNum}` : 'Audio Out';

        g.setFont('SansSerif', 14);
        g.setFontSize(14);
        const textWidth = g.measureWidth(s);

        // Draw progress bar
        g.setColor('#404040');
        const pct = this.dataFull ? textWidth : Math.floor(textWidth * this.dataPtr / (this.dataCount || 1));
        g.fillRect(this.x2 - Math.floor(textWidth / 2), this.y2 - 10, pct, 20);

        g.setColor(selected ? '#00FFFF' : '#FFFFFF');

        const f = 1 - (textWidth / 2 + 8) / (this.dn || 1);
        this.lead1 = {
            x: Math.floor(this.point1.x * (1 - f) + this.point2.x * f + 0.48),
            y: Math.floor(this.point1.y * (1 - f) + this.point2.y * f + 0.48),
        };
        this.setBbox(this.point1.x, this.point1.y, this.lead1.x, this.lead1.y);

        g.textAlign('center');
        g.textBaseline('middle');
        g.drawString(s, this.x2, this.y2);

        this.setVoltageColor(g, this.volts[0]);
        if (selected) g.setColor('#00FFFF');
        CircuitComponent.drawThickLine(g, this.point1, this.lead1);
        this.drawPosts(g);
    }

    private drawPosts(g: Graphics): void {
        drawPost(g, this.point1);
    }

    override getVoltageDiff(): number {
        return this.volts[0];
    }

    override stepFinished(): void {
        this.dataSample += this.volts[0];
        this.dataSampleCount++;
        // Access sim time — we don't have direct sim reference, use simTime from base class
        if (this.simTime >= this.nextDataSample) {
            this.nextDataSample = this.simTime + this.sampleStep;
            this.data[this.dataPtr++] = this.dataSample / (this.dataSampleCount || 1);
            this.dataSampleCount = 0;
            this.dataSample = 0;
            if (this.dataPtr >= this.dataCount) {
                this.dataPtr = 0;
                this.dataFull = true;
            }
        }
    }

    override getInfo(): string[] {
        const ct = this.dataFull ? this.dataCount : this.dataPtr;
        const dur = this.sampleStep * ct;
        return [
            'audio output',
            `V = ${this.formatVoltage(this.volts[0])}`,
            `samples = ${ct}${this.dataFull ? '' : `/${this.dataCount}`}`,
            `dur = ${this.formatTime(dur)}`,
        ];
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Duration (s)', value: this.duration, min: 0, max: 5 };
        if (n === 1) {
            return {
                name: 'Sampling Rate',
                value: 0,
                choices: ['8000', '11025', '16000', '22050', '44100'],
                selectedIndex: [8000, 11025, 16000, 22050, 44100].indexOf(this.samplingRate),
            };
        }
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.value !== undefined && ei.value > 0) {
            this.duration = ei.value;
            this.setDataCount();
        }
        if (_n === 1 && ei.selectedIndex !== undefined) {
            const rates = [8000, 11025, 16000, 22050, 44100];
            const nsr = rates[ei.selectedIndex] || 8000;
            if (nsr !== this.samplingRate) {
                this.samplingRate = nsr;
                AudioOutputElm.lastSamplingRate = nsr;
                this.setDataCount();
            }
        }
    }

    private formatVoltage(v: number): string {
        if (Math.abs(v) < 1e-3) return `${(v * 1e3).toFixed(2)} mV`;
        return `${v.toFixed(2)} V`;
    }

    private formatTime(t: number): string {
        if (t >= 1) return `${t.toFixed(2)} s`;
        if (t >= 1e-3) return `${(t * 1e3).toFixed(2)} ms`;
        return `${(t * 1e6).toFixed(2)} µs`;
    }
}

registerComponent(211, 'AudioOutputElm', AudioOutputElm);
