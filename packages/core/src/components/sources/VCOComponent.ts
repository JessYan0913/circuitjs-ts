import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import type { StampContext } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';

/** Voltage-Controlled Oscillator — 6-pin chip */
export class VCOComponent extends ChipComponent {
    cResistance = 1e6;
    cDir = 0;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    getChipName(): string { return 'VCO'; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = 4;
        this.pins = [
            createPin(0, SIDE_W, 'Vi'),
            createPin(3, SIDE_W, 'Vo'),
            createPin(0, SIDE_E, 'C'),
            createPin(1, SIDE_E, 'C'),
            createPin(2, SIDE_E, 'R1'),
            createPin(3, SIDE_E, 'R2'),
        ];
        this.pins[1].output = true;
        this.pins[4].output = true;
        this.pins[5].output = true;
    }

    override nonLinear(): boolean { return true; }

    override stamp(context: StampContext): void {
        // Output pin: voltage source between ground and Vo node
        context.stampVoltageSource(0, this.nodes[1], this.pins[1].voltSource);
        // Attach Vi to R1 pin so its current is proportional to Vi: VS between Vi and R1, voltage=0 (current sense)
        context.stampVoltageSource(this.nodes[0], this.nodes[4], this.pins[4].voltSource, 0);
        // Attach 5V to R2 pin: VS between ground and R2, voltage=5
        context.stampVoltageSource(0, this.nodes[5], this.pins[5].voltSource, 5);
        // Resistor across cap pins to give current somewhere to go in case cap is not connected
        context.stampResistor(this.nodes[2], this.nodes[3], this.cResistance);
        context.stampNonLinear(this.nodes[2] > 0 ? this.nodes[2] - 1 : 0);
        context.stampNonLinear(this.nodes[3] > 0 ? this.nodes[3] - 1 : 0);
    }

    override doStep(context: StampContext): void {
        const vc = this.volts[3] - this.volts[2];
        let vo = this.volts[1];
        let dir = (vo < 2.5) ? 1 : -1;

        if (vo < 2.5 && vc > 4.5) {
            vo = 5;
            dir = -1;
        }
        if (vo > 2.5 && vc < 0.5) {
            vo = 0;
            dir = 1;
        }

        // Generate output voltage
        context.updateVoltageSource(0, this.nodes[1], this.pins[1].voltSource, vo);

        // Stamp cap current as proportional to R1 and R2 currents
        const cur1 = context.getVoltageSourceRow(this.pins[4].voltSource);
        const cur2 = context.getVoltageSourceRow(this.pins[5].voltSource);

        context.stampNodeMatrix(this.nodes[2], cur1, dir);
        context.stampNodeMatrix(this.nodes[2], cur2, dir);
        context.stampNodeMatrix(this.nodes[3], cur1, -dir);
        context.stampNodeMatrix(this.nodes[3], cur2, -dir);
        this.cDir = dir;
    }

    // computeCurrent is called by draw()
    computeCurrent(): void {
        if (this.cResistance === 0) return;
        const c = this.cDir * (this.pins[4]?.current ?? 0) + (this.pins[5]?.current ?? 0) +
            (this.volts[3] - this.volts[2]) / this.cResistance;
        this.pins[2].current = -c;
        this.pins[3].current = c;
        this.pins[0].current = -(this.pins[4]?.current ?? 0);
    }

    override execute(): void { /* handled in doStep */ }

    override getDumpType(): number | string { return 158; }

    override draw(g: any): void {
        this.computeCurrent();
        this.drawChip(g);
    }
}

registerComponent(158, 'VCOElm', VCOComponent);
