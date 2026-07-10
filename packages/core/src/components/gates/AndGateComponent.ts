import { GateComponent } from './GateComponent.js';
import { registerComponent } from '../registry.js';

export class AndGateComponent extends GateComponent {
    override getDumpType(): number | string { return 150; }
    override getGateName(): string { return 'AND gate'; }
    override getGateText(): string | null { return '&'; }

    override calcFunction(): boolean {
        for (let i = 0; i < this.inputCount; i++) {
            if (!this.getInput(i)) return false;
        }
        return true;
    }

    override setPoints(): void {
        super.setPoints();

        // D-shape polygon: flat left, curved right
        const numPts = 10;
        const pts: { x: number; y: number }[] = [];

        // Top-left (start of flat left edge)
        pts.push(this.interpPt(0, this.hs2));

        // Top curve (left to right, upward arc)
        for (let i = 0; i < numPts; i++) {
            const a = i / numPts;
            const b = Math.sqrt(1 - a * a);
            pts.push(this.interpPt(0.5 + a / 2, b * this.hs2));
        }

        // Right point at lead2
        pts.push({ x: this.lead2.x, y: this.lead2.y });

        // Bottom curve (right to left, downward arc)
        for (let i = numPts - 1; i >= 0; i--) {
            const a = i / numPts;
            const b = Math.sqrt(1 - a * a);
            pts.push(this.interpPt(0.5 + a / 2, -b * this.hs2));
        }

        // Bottom-left
        pts.push(this.interpPt(0, -this.hs2));

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

registerComponent(150, 'AndGateElm', AndGateComponent);
