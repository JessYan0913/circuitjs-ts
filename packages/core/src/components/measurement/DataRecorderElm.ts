import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, Graphics, EditInfo } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { drawPost } from '../drawutils.js';

/** DataRecorderElm — records voltage data over time for data export */
export class DataRecorderElm extends CircuitComponent {
    dataCount = 10240;
    dataPtr = 0;
    dataFull = false;
    data: number[] = [];
    lastTimeStepCount = 0;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.setDataCount(this.dataCount);
    }

    getDumpType(): number | string {
        return 210;
    }

    override getPostCount(): number {
        return 1;
    }

    override stamp(_context: StampContext): void {
        // Data recorder — no MNA stamping needed
    }

    override dump(): string {
        return `${super.dump()} ${this.dataCount}`;
    }

    override handleDumpData(tokens: string[], start: number): void {
        if (tokens.length > start) {
            this.setDataCount(parseInt(tokens[start]) || 10240);
        }
    }

    override reset(): void {
        this.dataPtr = 0;
        this.dataFull = false;
        this.lastTimeStepCount = 0;
    }

    setDataCount(ct: number): void {
        this.dataCount = ct;
        this.data = new Array(this.dataCount);
        this.dataPtr = 0;
        this.dataFull = false;
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

        const s = 'export';
        const textWidth = g.measureWidth(s);
        const f = 1 - (Math.floor(textWidth / 2) + 8) / (this.dn || 1);
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
        if (this.lastTimeStepCount === this.simTime) return;
        this.data[this.dataPtr++] = this.volts[0];
        this.lastTimeStepCount = this.simTime;
        if (this.dataPtr >= this.dataCount) {
            this.dataPtr = 0;
            this.dataFull = true;
        }
    }

    override getInfo(): string[] {
        const count = this.dataFull ? this.dataCount : this.dataPtr;
        return [
            'data export',
            `V = ${this.formatVoltage(this.volts[0])}`,
            `${count}/${this.dataCount}`,
        ];
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) {
            return { name: '# of Data Points', value: this.dataCount, dimensionless: true };
        }
        if (n === 1) {
            // Generate CSV data string for export
            let dataStr = '# voltage data\n';
            if (this.dataFull) {
                for (let i = 0; i < this.dataCount; i++) {
                    dataStr += this.data[(i + this.dataPtr) % this.dataCount] + '\n';
                }
            } else {
                for (let i = 0; i < this.dataPtr; i++) {
                    dataStr += this.data[i] + '\n';
                }
            }
            return { name: 'Export Data', text: dataStr };
        }
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.value !== undefined && ei.value > 0) {
            this.setDataCount(Math.floor(ei.value));
        }
    }

    private formatVoltage(v: number): string {
        if (Math.abs(v) < 1e-3) return `${(v * 1e3).toFixed(2)} mV`;
        return `${v.toFixed(2)} V`;
    }
}

registerComponent(210, 'DataRecorderElm', DataRecorderElm);
