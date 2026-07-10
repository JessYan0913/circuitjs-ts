import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import {
    setVoltageColor, drawThickLinePt, drawThickLineXY,
    drawPost, drawDots, drawValues,
} from '../drawutils.js';

/**
 * DC Motor — electrical + mechanical domains using companion models.
 * Port of Java DCMotorElm.
 *
 * Electrical:
 *   nodes[0] = +terminal
 *   nodes[1] = -terminal
 *   nodes[2] = inductor-resistor junction (internal)
 *   nodes[3] = resistor-BEMF junction (internal)
 * Mechanical:
 *   nodes[4] = inertia voltage source (internal)
 *   nodes[5] = inertia-friction junction (internal)
 */
export class DCMotorComponent extends CircuitComponent {
    inductance = 0.5;
    resistance = 1;
    kt = 0.15;     // torque constant (K)
    kb = 0.15;     // back-EMF constant (Kb)
    j = 0.02;      // moment of inertia
    b = 0.05;      // friction coefficient
    gearRatio = 1;
    tau = 0;       // reserved

    angle = Math.PI / 2;
    speed = 0;     // rad/s
    coilCurrent = 0;
    inertiaCurrent = 0;

    // Inductor companion model for armature
    private armResistance = 0;
    private armCurSource = 0;
    // Inductor companion model for inertia
    private inertiaResistance = 0;
    private inertiaCurSource = 0;
    private useTrapezoidal = true;

    private voltSourceBEMF = -1;
    private voltSourceInertia = -1;
    private timeStep = 0;

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.noDiagonal = true;
    }

    override getDumpType(): number | string { return 415; }

    override handleDumpData(tokens: string[], startIndex: number): void {
        if (tokens.length > startIndex) this.inductance = parseFloat(tokens[startIndex]);
        if (tokens.length > startIndex + 1) this.resistance = parseFloat(tokens[startIndex + 1]);
        if (tokens.length > startIndex + 2) this.kt = parseFloat(tokens[startIndex + 2]);
        if (tokens.length > startIndex + 3) this.kb = parseFloat(tokens[startIndex + 3]);
        if (tokens.length > startIndex + 4) this.j = parseFloat(tokens[startIndex + 4]);
        if (tokens.length > startIndex + 5) this.b = parseFloat(tokens[startIndex + 5]);
        if (tokens.length > startIndex + 6) this.gearRatio = parseFloat(tokens[startIndex + 6]);
        if (tokens.length > startIndex + 7) this.tau = parseFloat(tokens[startIndex + 7]);
    }

    override dump(): string {
        return super.dump() + ` ${this.inductance} ${this.resistance} ${this.kt} ${this.kb} ${this.j} ${this.b} ${this.gearRatio} ${this.tau}`;
    }

    override getPostCount(): number { return 2; }
    override getInternalNodeCount(): number { return 4; } // nodes[2..5]

    override getVoltageSourceCount(): number { return 2; }

    override setVoltageSource(n: number, v: number): void {
        if (n === 0) this.voltSourceBEMF = v;
        else this.voltSourceInertia = v;
    }

    override reset(): void {
        super.reset();
        this.speed = 0;
        this.angle = Math.PI / 2;
        this.coilCurrent = 0;
        this.inertiaCurrent = 0;
    }

    override stamp(context: StampContext): void {
        this.timeStep = context.timeStep;

        // === Electrical Domain ===
        // Armature: inductor (nodes[0]→nodes[2]), resistor (nodes[2]→nodes[3]), BEMF source (nodes[3]→nodes[1])
        if (context.timeStep === 0) {
            // At DC, inductor is open circuit (infinite R = no stamp needed)
        } else {
            this.useTrapezoidal = context.integrationMethod !== 'backwardEuler';
            this.armResistance = this.useTrapezoidal
                ? 2 * this.inductance / context.timeStep
                : this.inductance / context.timeStep;
            context.stampResistor(this.nodes[0], this.nodes[2], this.armResistance);
            context.markRightSideChanging(this.nodes[0]);
            context.markRightSideChanging(this.nodes[2]);
        }
        context.stampResistor(this.nodes[2], this.nodes[3], this.resistance);
        context.stampVoltageSource(this.nodes[3], this.nodes[1], this.voltSourceBEMF, 0);

        // === Mechanical Domain ===
        // Inertia: inductor (nodes[4]→nodes[5]), friction resistor (nodes[5]→ground), torque source (nodes[4]→ground)
        if (context.timeStep === 0) {
            // At DC, inertia inductor is open circuit
        } else {
            this.inertiaResistance = this.useTrapezoidal
                ? 2 * this.j / context.timeStep
                : this.j / context.timeStep;
            context.stampResistor(this.nodes[4], this.nodes[5], this.inertiaResistance);
            context.markRightSideChanging(this.nodes[4]);
            context.markRightSideChanging(this.nodes[5]);
        }
        context.stampResistor(this.nodes[5], 0, this.b);
        context.stampVoltageSource(this.nodes[4], 0, this.voltSourceInertia, 0);
    }

    override startIteration(): void {
        // === Electrical ===
        if (this.armResistance > 0) {
            const vd = this.volts[0] - this.volts[2];
            if (this.useTrapezoidal) {
                this.armCurSource = vd / this.armResistance + this.coilCurrent;
            } else {
                this.armCurSource = this.coilCurrent;
            }
        }

        // === Mechanical ===
        if (this.inertiaResistance > 0) {
            const vd = this.volts[4] - this.volts[5];
            if (this.useTrapezoidal) {
                this.inertiaCurSource = vd / this.inertiaResistance + this.inertiaCurrent;
            } else {
                this.inertiaCurSource = this.inertiaCurrent;
            }
        }

        // Update angle
        this.angle += this.speed * this.timeStep;
    }

    override doStep(context: StampContext): void {
        // === Back-EMF: Vb = kb * speed    (update voltage source)
        context.updateVoltageSource(this.nodes[3], this.nodes[1], this.voltSourceBEMF, this.speed * this.kb);

        // === Torque: T = kt * coilCurrent (update voltage source as torque-equivalent)
        context.updateVoltageSource(this.nodes[4], 0, this.voltSourceInertia, this.coilCurrent * this.kt);

        // === Armature inductor current source ===
        if (this.armResistance > 0) {
            context.stampCurrentSource(this.nodes[0], this.nodes[2], this.armCurSource);
        }

        // === Inertia inductor current source ===
        if (this.inertiaResistance > 0) {
            context.stampCurrentSource(this.nodes[4], this.nodes[5], this.inertiaCurSource);
        }
    }

    override calculateCurrent(): void {
        // Coil current from companion model
        const vdArm = this.volts[0] - this.volts[2];
        if (this.armResistance > 0) {
            this.coilCurrent = vdArm / this.armResistance + this.armCurSource;
        }

        // Inertia current (proportional to speed)
        const vdInertia = this.volts[4] - this.volts[5];
        if (this.inertiaResistance > 0) {
            this.inertiaCurrent = vdInertia / this.inertiaResistance + this.inertiaCurSource;
        }

        // Speed = inertia current
        this.speed = this.inertiaCurrent;

        // Total current from the supply
        this.current = this.coilCurrent;
    }

    override getEditInfo(n: number): EditInfo | null {
        if (n === 0) return { name: 'Armature Inductance (H)', value: this.inductance, min: 0.0001, max: 10 };
        if (n === 1) return { name: 'Armature Resistance (Ω)', value: this.resistance, min: 0.01, max: 100 };
        if (n === 2) return { name: 'Torque Constant (Kt)', value: this.kt, min: 0.001, max: 10 };
        if (n === 3) return { name: 'Back-EMF Constant (Kb)', value: this.kb, min: 0.001, max: 10 };
        if (n === 4) return { name: 'Moment of Inertia (J)', value: this.j, min: 0.0001, max: 10 };
        if (n === 5) return { name: 'Friction Coeff (b)', value: this.b, min: 0, max: 10 };
        if (n === 6) return { name: 'Gear Ratio', value: this.gearRatio, min: 0.01, max: 100 };
        return null;
    }

    override setEditValue(_n: number, ei: EditInfo): void {
        if (ei.value === undefined) return;
        if (_n === 0) this.inductance = ei.value;
        if (_n === 1) this.resistance = ei.value;
        if (_n === 2) this.kt = ei.value;
        if (_n === 3) this.kb = ei.value;
        if (_n === 4) this.j = ei.value;
        if (_n === 5) this.b = ei.value;
        if (_n === 6) this.gearRatio = ei.value;
    }

    override getInfo(): string[] {
        const rpm = this.speed * 9.5493; // rad/s to RPM
        return [
            'DC Motor',
            `V = ${(this.volts[0] - this.volts[1]).toFixed(3)} V`,
            `I = ${(this.current * 1000).toFixed(2)} mA`,
            `ω = ${rpm.toFixed(0)} RPM`,
            `L = ${this.inductance} H`,
            `R = ${this.resistance} Ω`,
            `P = ${this.getPower().toFixed(3)} W`,
        ];
    }

    override draw(g: Graphics): void {
        const hs = 20;
        const v1 = this.volts[0];
        const v2 = this.volts[1];
        this.calcLeads(40);

        setVoltageColor(g, v1, this);
        drawThickLinePt(g, this.point1, this.lead1);
        setVoltageColor(g, v2, this);
        drawThickLinePt(g, this.lead2, this.point2);

        // Motor body: circle with 'M' inside
        const cx = (this.lead1.x + this.lead2.x) / 2;
        const cy = (this.lead1.y + this.lead2.y) / 2;

        g.setColor(this.needsHighlight() ? '#00FFFF' : '#808080');
        g.setLineWidth(3);
        g.drawOval(cx - hs, cy - hs, hs * 2, hs * 2);

        // 'M' letter in center
        g.setLineWidth(2);
        g.setColor('#FFFFFF');
        const ms = 6;
        g.drawLine(cx - ms, cy - ms, cx - ms, cy + ms);       // left vertical
        g.drawLine(cx - ms, cy - ms, cx, cy - 2);              // left diagonal up
        g.drawLine(cx - ms, cy + ms, cx, cy + 2);              // left diagonal down
        g.drawLine(cx + ms, cy - ms, cx + ms, cy + ms);         // right vertical
        g.drawLine(cx + ms, cy - ms, cx, cy - 2);              // right diagonal up
        g.drawLine(cx + ms, cy + ms, cx, cy + 2);              // right diagonal down

        // Brushes / commutator (two arcs)
        g.setLineWidth(1);
        g.setColor('#808080');
        g.drawLine(cx - hs - 5, cy - 5, cx - hs + 5, cy - 5);
        g.drawLine(cx - hs - 5, cy + 5, cx - hs + 5, cy + 5);

        g.setLineWidth(1);
        drawPost(g, this.point1);
        drawPost(g, this.point2);

        const val = `${this.kt.toFixed(3)} Nm/A`;
        drawValues(g, val, 10, this.point1, this.point2);
    }
}

    // Override drawValues inline via the draw method

registerComponent(415, 'DCMotorElm', DCMotorComponent);
