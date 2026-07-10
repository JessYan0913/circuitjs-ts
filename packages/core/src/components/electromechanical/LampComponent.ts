import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLinePt,
    interpPoint, drawPost, drawValues,
} from '../drawutils.js';

/**
 * Incandescent lamp — resistance varies with temperature.
 * Port of Java LampElm.
 */
export class LampComponent extends CircuitComponent {
    resistance = 100;
    temp = 300;         // roomTemp
    nomPow = 100;       // nominal power (watts)
    nomV = 120;         // nominal voltage
    warmTime = 0.4;     // warmup time constant (seconds)
    coolTime = 0.4;     // cooldown time constant (seconds)
    private readonly roomTemp = 300;
    private lastTimeStep = 0;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    override getDumpType(): number | string { return 181; }

    override handleDumpData(tokens: string[], startIndex: number): void {
        if (tokens.length > startIndex) {
            this.temp = parseFloat(tokens[startIndex]);
            if (isNaN(this.temp)) this.temp = this.roomTemp;
        }
        if (tokens.length > startIndex + 1) {
            this.nomPow = parseFloat(tokens[startIndex + 1]);
        }
        if (tokens.length > startIndex + 2) {
            this.nomV = parseFloat(tokens[startIndex + 2]);
        }
        if (tokens.length > startIndex + 3) {
            this.warmTime = parseFloat(tokens[startIndex + 3]);
        }
        if (tokens.length > startIndex + 4) {
            this.coolTime = parseFloat(tokens[startIndex + 4]);
        }
    }

    override dump(): string {
        return super.dump() + ` ${this.temp} ${this.nomPow} ${this.nomV} ${this.warmTime} ${this.coolTime}`;
    }

    override reset(): void {
        this.temp = this.roomTemp;
        this.resistance = 100;
        super.reset();
    }

    override nonLinear(): boolean { return true; }

    override stamp(context: StampContext): void {
        context.stampNonLinear(this.nodes[0]);
        context.stampNonLinear(this.nodes[1]);
        this.lastTimeStep = context.timeStep;
    }

    override startIteration(): void {
        // Compute resistance from temperature
        const nomR = this.nomV * this.nomV / this.nomPow;
        const tp = this.temp + 273.15;
        // Tungsten filament: R = R_ref * (T/T_ref)^1.2 (matches Java LampElm)
        this.resistance = nomR * Math.pow(tp / (273.15 + this.roomTemp), 1.2);
        const rMin = 0.1 * nomR;
        const rMax = 100 * nomR;
        if (this.resistance < rMin) this.resistance = rMin;
        if (this.resistance > rMax) this.resistance = rMax;

        // Thermal model — update temperature (once per timestep, matches Java LampElm)
        if (this.lastTimeStep > 0) {
            const cap = 1.57e-4 * this.nomPow;
            const capW = cap * this.warmTime / 0.4;
            const capC = cap * this.coolTime / 0.4;
            const cr = this.nomPow > 0 ? 2600 / this.nomPow : 26;

            const power = this.getPower();
            this.temp += power * this.lastTimeStep / capW;
            this.temp -= this.lastTimeStep * (this.temp - this.roomTemp) / (capC * cr);
        }
    }

    override doStep(context: StampContext): void {
        context.stampResistor(this.nodes[0], this.nodes[1], this.resistance);
    }

    override calculateCurrent(): void {
        const vd = this.getVoltageDiff();
        if (this.resistance > 0) {
            this.current = vd / this.resistance;
        } else {
            this.current = 0;
        }
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Nominal Power (W)', value: this.nomPow, min: 0.1, max: 10000 };
        if (n === 1) return { name: 'Nominal Voltage (V)', value: this.nomV, min: 0.1, max: 1000 };
        if (n === 2) return { name: 'Warmup Time (s)', value: this.warmTime, min: 0.01, max: 10 };
        if (n === 3) return { name: 'Cooldown Time (s)', value: this.coolTime, min: 0.01, max: 10 };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value === undefined) return;
        if (_n === 0) this.nomPow = ei.value;
        if (_n === 1) this.nomV = ei.value;
        if (_n === 2) this.warmTime = ei.value;
        if (_n === 3) this.coolTime = ei.value;
    }

    override getInfo(): string[] {
        const arr: string[] = ['lamp'];
        const vd = this.getVoltageDiff();
        arr[1] = `V = ${vd.toFixed(3)} V`;
        arr[2] = `I = ${(this.current * 1000).toFixed(2)} mA`;
        arr[3] = `R = ${this.resistance.toFixed(1)} Ω`;
        arr[4] = `P = ${this.getPower().toFixed(3)} W`;
        arr[5] = `T = ${this.temp.toFixed(0)} K`;
        return arr;
    }

    override draw(g: Graphics): void {
        const hs = 16;
        const v1 = this.volts[0];
        const v2 = this.volts[1];
        this.calcLeads(32);

        setVoltageColor(g, v1, this);
        drawThickLinePt(g, this.point1, this.lead1);
        setVoltageColor(g, v2, this);
        drawThickLinePt(g, this.lead2, this.point2);

        // Lamp body: circle with X inside
        const cx = (this.lead1.x + this.lead2.x) / 2;
        const cy = (this.lead1.y + this.lead2.y) / 2;

        // Brightness based on power relative to nominal
        const brightness = Math.min(1, Math.abs(this.getPower()) / this.nomPow);
        const intensity = Math.round(128 + 127 * brightness);

        // Glow behind the lamp
        if (brightness > 0.05) {
            const glowR = Math.round(255);
            const glowG = Math.round(200 * brightness);
            const glowSize = hs * (0.3 + 0.7 * brightness);
            g.setColor(`rgba(${glowR}, ${glowG}, 0, ${0.2 + 0.5 * brightness})`);
            g.fillOval(cx - glowSize, cy - glowSize, glowSize * 2, glowSize * 2);
        }

        // Circle outline
        g.setColor(`rgb(${intensity}, ${Math.round(intensity * 0.8)}, 0)`);
        g.setLineWidth(3);
        g.drawOval(cx - hs, cy - hs, hs * 2, hs * 2);

        // X inside the circle
        g.setLineWidth(2);
        g.setColor(this.needsHighlight() ? '#00FFFF' : '#FFFFFF');
        g.drawLine(cx - hs + 3, cy - hs + 3, cx + hs - 3, cy + hs - 3);
        g.drawLine(cx + hs - 3, cy - hs + 3, cx - hs + 3, cy + hs - 3);

        g.setLineWidth(1);
        drawPost(g, this.point1);
        drawPost(g, this.point2);

        const val = `${this.nomPow}W ${this.nomV}V`;
        drawValues(g, val, 20, this.point1, this.point2);
    }
}

registerComponent(181, 'LampElm', LampComponent);
