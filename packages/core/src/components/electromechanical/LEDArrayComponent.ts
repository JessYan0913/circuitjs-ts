import { ChipComponent, createPin, SIDE_S, SIDE_W } from '../base/ChipComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { DiodeModel } from '../active/DiodeModel.js';
import { setVoltageColor } from '../drawutils.js';

/**
 * LED Array — Matrix of LEDs with row/column addressing.
 * Port of Java LEDArrayElm.
 */
export class LEDArrayComponent extends ChipComponent {
    gridWidth = 8;
    gridHeight = 8;
    private diodes: DiodeModel[] = [];
    private ledCurrents: number[] = [];
    private ledBrightness: number[] = [];

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    override getDumpType(): number | string { return 405; }

    override handleDumpData(tokens: string[], startIndex: number): void {
        if (tokens.length > startIndex) {
            this.gridWidth = parseInt(tokens[startIndex]);
        }
        if (tokens.length > startIndex + 1) {
            this.gridHeight = parseInt(tokens[startIndex + 1]);
        }
        this.setupPins();
        this.setPoints();
    }

    override dump(): string {
        return super.dump() + ` ${this.gridWidth} ${this.gridHeight}`;
    }

    getChipName(): string { return 'LED array'; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = 2;
        this.pins = [];

        // Column pins (anodes) on bottom side
        for (let c = 0; c < this.gridWidth; c++) {
            this.pins.push(createPin(c, SIDE_S, `C${c}`));
        }
        // Row pins (cathodes) on left side
        for (let r = 0; r < this.gridHeight; r++) {
            this.pins.push(createPin(r, SIDE_W, `R${r}`));
        }

        // Allocate diode array
        const total = this.gridWidth * this.gridHeight;
        this.diodes = new Array(total);
        this.ledCurrents = new Array(total);
        this.ledBrightness = new Array(total);
        for (let i = 0; i < total; i++) {
            this.diodes[i] = new DiodeModel();
            // LED model params
            this.diodes[i].saturationCurrent = 1e-14;
            this.diodes[i].emissionCoefficient = 1.0;
        }
    }

    override stamp(context: StampContext): void {
        super.stamp(context);

        const total = this.gridWidth * this.gridHeight;
        for (let i = 0; i < total; i++) {
            const row = Math.floor(i / this.gridWidth);
            const col = i % this.gridWidth;
            const nCol = col;            // column pin: anode
            const nRow = this.gridWidth + row;  // row pin: cathode
            // Diode between col and row (anode on column, cathode on row)
            context.stampNonLinear(this.nodes[nCol]);
            context.stampNonLinear(this.nodes[nRow]);
        }
    }

    override nonLinear(): boolean { return true; }

    override doStep(context: StampContext): void {
        const total = this.gridWidth * this.gridHeight;
        let sub = 0;
        for (let i = 0; i < total; i++) {
            const row = Math.floor(i / this.gridWidth);
            const col = i % this.gridWidth;
            const nCol = col;
            const nRow = this.gridWidth + row;
            const vd = this.volts[nCol] - this.volts[nRow];
            this.diodes[i].doStep(vd, context, this.nodes[nCol], this.nodes[nRow], sub);
            sub++;
        }
    }

    override execute(): void {
        // Compute brightness from currents
        const total = this.gridWidth * this.gridHeight;
        for (let i = 0; i < total; i++) {
            const row = Math.floor(i / this.gridWidth);
            const col = i % this.gridWidth;
            const nCol = col;
            const nRow = this.gridWidth + row;
            const vd = this.volts[nCol] - this.volts[nRow];
            this.ledCurrents[i] = this.diodes[i].getCurrent(vd);
            this.ledBrightness[i] = Math.min(1, Math.max(0, this.ledCurrents[i] / 0.01));

            // Accumulate into pin currents
            this.pins[nCol].current += this.ledCurrents[i];
            this.pins[nRow].current += this.ledCurrents[i];
        }
    }

    override stepFinished(): void {
        // Check for excessively large currents
        for (let i = 0; i < this.ledCurrents.length; i++) {
            if (Math.abs(this.ledCurrents[i]) > 1e12) {
                // sim.stop() would be called here
                break;
            }
        }
    }

    override getPostCount(): number {
        return this.gridWidth + this.gridHeight;
    }

    override getVoltageSourceCount(): number { return 0; }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 2) {
            return { name: 'Grid Width', value: this.gridWidth, min: 2, max: 16 };
        }
        if (n === 3) {
            return { name: 'Grid Height', value: this.gridHeight, min: 2, max: 16 };
        }
        return super.getEditInfo(n);
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 2 && ei.value !== undefined) {
            this.gridWidth = Math.round(ei.value);
            this.setupPins();
            this.setPoints();
        }
        if (_n === 3 && ei.value !== undefined) {
            this.gridHeight = Math.round(ei.value);
            this.setupPins();
            this.setPoints();
        }
        super.setEditValue(_n, ei);
    }

    override getInfo(): string[] {
        return [this.getChipName(), `${this.gridWidth}x${this.gridHeight}`];
    }

    override drawChip(g: Graphics): void {
        // Draw pin wires
        for (let i = 0; i < this.pins.length; i++) {
            const p = this.pins[i];
            setVoltageColor(g, this.volts[i], this);
            g.drawLine(p.post.x, p.post.y, p.stub.x, p.stub.y);
        }

        // Draw chip body
        g.setColor(this.needsHighlight() ? '#00FFFF' : '#404040');
        g.setLineWidth(3);
        g.drawPolyline(this.rectPointsX, this.rectPointsY, 4);
        g.setLineWidth(1);

        // Draw LED matrix inside the chip
        const cx = (this.rectPointsX[0] + this.rectPointsX[2]) / 2;
        const cy = (this.rectPointsY[0] + this.rectPointsY[2]) / 2;
        const w = this.rectPointsX[2] - this.rectPointsX[0] - 10;
        const h = this.rectPointsY[2] - this.rectPointsY[0] - 10;
        const cellW = w / this.gridWidth;
        const cellH = h / this.gridHeight;
        const ledSize = Math.min(cellW, cellH) * 0.7;

        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                const idx = row * this.gridWidth + col;
                const brightness = this.ledBrightness[idx] || 0;
                const x0 = cx - w / 2 + col * cellW + (cellW - ledSize) / 2;
                const y0 = cy - h / 2 + row * cellH + (cellH - ledSize) / 2;

                // Red intensity based on current
                if (brightness > 0.01) {
                    const r = Math.round(255);
                    const gv = Math.round(50 + 50 * (1 - brightness));
                    g.setColor(`rgb(${r}, ${gv}, ${gv})`);
                } else {
                    g.setColor('#331111');
                }
                g.fillOval(x0, y0, ledSize, ledSize);
            }
        }
    }
}

registerComponent(405, 'LEDArrayElm', LEDArrayComponent);
