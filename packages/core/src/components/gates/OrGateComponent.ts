import { GateComponent } from './GateComponent.js';
import { registerComponent } from '../registry.js';

export class OrGateComponent extends GateComponent {
    override getDumpType(): number | string { return 152; }
    override getGateName(): string { return 'OR gate'; }
    override getGateText(): string | null { return '≥1'; }

    override calcFunction(): boolean {
        for (let i = 0; i < this.inputCount; i++) {
            if (this.getInput(i)) return true;
        }
        return false;
    }

    override setPoints(): void {
        super.setPoints();

        // Arc shape: curved left, pointed right
        const numPts = 8;
        const pts: { x: number; y: number }[] = [];

        // Top curve (left side, inward arc)
        for (let i = numPts; i >= 0; i--) {
            const a = i / numPts;
            const b = Math.sqrt(1 - a * a);
            pts.push(this.interpPt(0.5 - (1 - a) / 2, b * this.hs2));
        }

        // Right point
        pts.push({ x: this.lead2.x, y: this.lead2.y });

        // Bottom curve
        for (let i = 0; i <= numPts; i++) {
            const a = i / numPts;
            const b = Math.sqrt(1 - a * a);
            pts.push(this.interpPt(0.5 - (1 - a) / 2, -b * this.hs2));
        }

        this.gatePoly = {
            npoints: pts.length,
            xpoints: pts.map(p => p.x),
            ypoints: pts.map(p => p.y),
        };
    }

    private interpPt(f: number, g: number): { x: number; y: number } {
        return {
            x: Math.round(this.lead1.x + (this.lead2.x - this.lead1.x) * f - (this.lead2.y - this.lead1.y) * g / this.dn),
            y: Math.round(this.lead1.y + (this.lead2.y - this.lead1.y) * f + (this.lead2.x - this.lead1.x) * g / this.dn),
        };
    }
}

registerComponent(152, 'OrGateElm', OrGateComponent);
