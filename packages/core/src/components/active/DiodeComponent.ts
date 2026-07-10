import { CircuitComponent } from '../base/CircuitComponent.js';
import type { StampContext, EditInfo, Graphics } from '@circuitjs/shared';
import { registerComponent } from '../registry.js';
import { DiodeModel } from './DiodeModel.js';
import { escape } from '../../util/textEscape.js';
import {
    setVoltageColor, drawThickLinePt, drawThickLineXY,
    interpPoint, interpPointPerpOut, drawPost,
} from '../drawutils.js';

export class DiodeComponent extends CircuitComponent {
    model = new DiodeModel();
    /** Name of shared DiodeModel (empty for inline/default model) */
    modelName = '';
    private subIterations = 0;

    getDumpType(): number | string { return 'd'; }
    nonLinear(): boolean { return true; }

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
        this.setup();
    }

    /** Resolve model from modelName, falling back to default */
    setup(): void {
        if (this.modelName) {
            const newModel = DiodeModel.getModelWithNameOrCreate(this.modelName, this.model);
            if (newModel !== this.model) {
                // Copy breakdown voltage from existing model (used by Zener)
                newModel.breakdownVoltage = this.model.breakdownVoltage;
                this.model = newModel;
                this.modelName = newModel.name;
            }
        }
    }

    /** Emit model dump line when a named model is referenced */
    override dumpModel(): string | null {
        if (!this.modelName) return null;
        if (this.model.dumped) return null;
        this.model.dumped = true;
        return this.model.dump();
    }

    override dump(): string {
        return `${super.dump()} ${escape(this.modelName || 'default')}`;
    }

    handleDumpData(tokens: string[], startIndex: number): void {
        if (tokens.length > startIndex) {
            this.modelName = tokens[startIndex];
        }
        this.setup();
    }

    stamp(context: StampContext): void {
        context.stampNonLinear(this.nodes[0]);
        context.stampNonLinear(this.nodes[1]);
    }

    doStep(context: StampContext): void {
        this.model.doStep(this.volts[0] - this.volts[1], context,
            this.nodes[0], this.nodes[1], this.subIterations);
        this.subIterations++;
    }

    stepFinished(): void {
        this.subIterations = 0;
    }

    calculateCurrent(): void {
        this.current = this.model.getCurrent(this.volts[0] - this.volts[1]);
    }

    getEditInfo(n: number): EditInfo | null {
        if (n === 0) {
            const models = DiodeModel.getModelList();
            const idx = models.indexOf(this.model);
            return {
                name: 'Model',
                value: 0,
                choices: models.map(m => m.getDescription()),
                selectedIndex: Math.max(0, idx),
            };
        }
        if (n === 1) return { name: 'Saturation current (Is)', value: this.model.saturationCurrent };
        if (n === 2) return { name: 'Emission coefficient (N)', value: this.model.emissionCoefficient };
        return null;
    }

    setEditValue(_n: number, ei: EditInfo): void {
        if (_n === 0 && ei.selectedIndex !== undefined) {
            const models = DiodeModel.getModelList();
            const newModel = models[ei.selectedIndex];
            if (newModel && newModel !== this.model) {
                // Preserve breakdown voltage (used by Zener)
                const savedBv = this.model.breakdownVoltage;
                this.model = newModel;
                this.model.breakdownVoltage = savedBv;
                this.modelName = this.model.name;
            }
            return;
        }
        if (ei.value !== undefined) {
            if (_n === 1) this.model.saturationCurrent = ei.value;
            if (_n === 2) this.model.emissionCoefficient = ei.value;
        }
    }

    getInfo(): string[] {
        return [`Diode`, `Vd = ${this.getVoltageDiff().toFixed(3)} V`];
    }

    getShortcut(): number { return 'd'.charCodeAt(0); }

    draw(g: Graphics): void {
        const hs = 12;
        this.calcLeads(24);
        setVoltageColor(g, this.volts[0], this);
        drawThickLinePt(g, this.point1, this.lead1);
        setVoltageColor(g, this.volts[1], this);
        drawThickLinePt(g, this.lead2, this.point2);

        // Triangle (arrow) - filled
        const triBase = interpPoint(this.lead1, this.lead2, 0.35);
        const triTip = interpPoint(this.lead1, this.lead2, 0.6);
        const p1: { x: number; y: number } = { x: 0, y: 0 };
        const p2: { x: number; y: number } = { x: 0, y: 0 };
        interpPointPerpOut(this.lead1, this.lead2, p1, 0.35, hs);
        interpPointPerpOut(this.lead1, this.lead2, p2, 0.35, -hs);

        g.setLineWidth(2);
        setVoltageColor(g, this.volts[0], this);
        g.fillPolygon(
            [triBase.x, triTip.x, triBase.x],
            [p1.y, triTip.y, p2.y],
            3,
        );

        // Cathode bar
        const bar = interpPoint(this.lead1, this.lead2, 0.65);
        setVoltageColor(g, this.volts[1], this);
        drawThickLineXY(g, bar.x, bar.y + hs, bar.x, bar.y - hs);

        drawPost(g, this.point1);
        drawPost(g, this.point2);
    }
}

registerComponent('d'.charCodeAt(0), 'DiodeElm', DiodeComponent);
