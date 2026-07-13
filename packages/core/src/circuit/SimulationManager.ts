import { MNAMatrix } from '../matrix/MNAMatrix.js';
import { CircuitComponent } from '../components/base/CircuitComponent.js';
import { StampContextImpl } from './StampContextImpl.js';

/** One half of a wire: the neighbor list we use to calculate wire current.
    Matches Java CirSim.WireInfo. */
interface WireInfo {
    wire: CircuitComponent;
    neighbors: CircuitComponent[];
    post: number; // 0 or 1 — which post we have neighbor info for
}

export interface SimulationConfig {
    maxTimeStep: number;
    minTimeStep: number;
    timeStep: number;
    adjustTimeStep: boolean;
    voltageRange: number;
}

const DEFAULT_CONFIG: SimulationConfig = {
    maxTimeStep: 5e-6,
    minTimeStep: 50e-12,
    timeStep: 5e-6,
    adjustTimeStep: true,
    voltageRange: 5,
};

export class SimulationManager {
    config: SimulationConfig;
    components: CircuitComponent[] = [];
    matrix!: MNAMatrix;
    nodeCount = 0;
    voltageSourceCount = 0;

    t = 0;                       // simulation time
    timeStepCount = 0;
    timeStepAccum = 0;
    circuitNonLinear = false;

    running = false;
    stopMessage: string | null = null;

    private ctx!: StampContextImpl;
    private lastNodeVoltages: Float64Array = new Float64Array(0);
    private subIterCount = 100;   // max Newton iterations
    private goodIterations = 0;
    private lastIterTime = 0;

    // Voltage source tracking
    private voltageSources: CircuitComponent[] = [];

    // Wire tracking (Union-Find optimization — wires don't use VS rows, matched Java)
    private wireInfoList: WireInfo[] = [];

    constructor(config?: Partial<SimulationConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // ---- Load / Reset ----

    loadComponents(components: CircuitComponent[]): void {
        this.components = components;
        this.t = 0;
        this.timeStepCount = 0;
        this.timeStepAccum = 0;
        this.config.timeStep = this.config.maxTimeStep;
        this.stopMessage = null;
    }

    reset(): void {
        for (const c of this.components) c.reset();
        this.t = 0;
        this.timeStepCount = 0;
        this.timeStepAccum = 0;
        this.config.timeStep = this.config.maxTimeStep;
    }

    // ---- Analyze (call after loading components) ----

    analyzeCircuit(): boolean {
        this.stopMessage = null;

        // Count voltage sources (wires are handled by Union-Find, not VS rows)
        this.voltageSourceCount = 0;
        for (const c of this.components) {
            c.voltSource = -1;
            if (!c.isWire()) {
                this.voltageSourceCount += c.getVoltageSourceCount();
            }
        }

        // Count nodes: each component's posts reference circuit nodes
        // Node 0 = ground. Other nodes start at 1.
        // We need to assign node numbers. In the full version, this involves
        // wire closure optimization. For now, simpler approach:
        this.nodeCount = 0;
        this.circuitNonLinear = false;

        // Assign node numbers to each component post
        // For simple 2-terminal components, nodes[0] and nodes[1] reference
        // distinct circuit nodes. Multiple components sharing a post (same x,y)
        // should share a node number.
        //
        // For Phase 1, we give each component post a unique node number.
        // This is correct for isolated components but won't connect them.
        //
        // Instead, use a point-based hash map like the Java code does.

        // Build node map from (x,y) pairs
        this.assignNodeNumbers();

        // Determine if circuit is nonlinear
        for (const c of this.components) {
            if (c.nonLinear()) this.circuitNonLinear = true;
        }

        // Allocate voltage sources (skip wires — Union-Find handles them)
        let vsCount = 0;
        this.voltageSources = [];
        for (const c of this.components) {
            if (c.isWire()) continue;
            const vsc = c.getVoltageSourceCount();
            for (let j = 0; j < vsc; j++) {
                c.setVoltageSource?.(j, vsCount);
                this.voltageSources[vsCount] = c;
                vsCount++;
            }
        }

        // Build and stamp matrix
        const matrixSize = (this.nodeCount - 1) + this.voltageSourceCount;
        const numNodeRows = this.nodeCount - 1;
        this.matrix = new MNAMatrix(matrixSize, numNodeRows);
        this.ctx = new StampContextImpl(this.matrix, this.config.timeStep, true);
        this.matrix.circuitNonLinear = this.circuitNonLinear;

        // Stamp all components (skip wires; they are handled by Union-Find)
        for (const c of this.components) {
            if (c.isWire()) continue;
            c.simTime = this.t;
            c.stamp(this.ctx);
        }

        // Connect unconnected nodes to ground with large resistor
        // Scan node rows in the matrix for all-zero rows (floating nodes)
        const nnr = numNodeRows;
        for (let node = 1; node <= nnr; node++) {
            const row = node - 1; // 0-based matrix row for this node
            let allZero = true;
            for (let col = 0; col < matrixSize; col++) {
                if (this.matrix.data[row * matrixSize + col] !== 0) {
                    allZero = false;
                    break;
                }
            }
            if (allZero) {
                // Connect floating node to ground with 100M resistor
                this.matrix.stampResistor(node, 0, 1e8);
            }
        }

        // Save original matrix for nonlinear iteration
        this.matrix.saveOrig();

        // Simplify matrix (eliminate ROW_CONST rows)
        if (this.matrix.size > 1) {
            this.matrix.simplify();
        }
        // If matrix is now 0, extract ROW_CONST values
        if (!this.circuitNonLinear && this.matrix.size > 0) {
            if (!this.matrix.luFactor()) {
                this.stopMessage = 'Singular matrix';
                return false;
            }
        }

        // Apply solved voltages (either from ROW_CONST or from matrix solve)
        this.applySolvedVoltages();

        // Allocate lastNodeVoltages
        this.lastNodeVoltages = new Float64Array(this.nodeCount);
        this.saveNodeVoltages();

        // Build wire neighbor lists for current calculation
        this.buildWireNeighbors();

        return true;
    }

    /**
     * Build neighbor lists for wire current calculation.
     * Matches Java CirSim.calcWireInfo() exactly:
     * - Uses node-based lookup (like Java's cn1.links)
     * - Allows already-resolved wires as neighbors (hasWireInfo flag)
     * - Requeues wires whose neighbors aren't resolved yet (dependency order)
     */
    private buildWireNeighbors(): void {
        // Build node → [{elm, postIndex}] map — equivalent to Java's CircuitNode.links
        const nodeLinks = new Map<number, Array<{ elm: CircuitComponent; num: number }>>();
        for (const c of this.components) {
            for (let j = 0; j < c.getPostCount(); j++) {
                const n = c.nodes[j];
                if (!nodeLinks.has(n)) nodeLinks.set(n, []);
                nodeLinks.get(n)!.push({ elm: c, num: j });
            }
        }

        // Tracks which wires have resolved current — matches Java WireElm.hasWireInfo
        const hasWireInfo = new Set<CircuitComponent>();

        let moved = 0;
        let i = 0;
        while (i < this.wireInfoList.length) {
            const wi = this.wireInfoList[i];
            const wire = wi.wire;
            // Both posts of a wire share the same node (Union-Find merged them)
            const wireNode = wire.nodes[0];

            const neighbors0: CircuitComponent[] = [];
            const neighbors1: CircuitComponent[] = [];
            let isReady0 = true;
            let isReady1 = true;

            for (const link of (nodeLinks.get(wireNode) ?? [])) {
                const ce = link.elm;
                if (ce === wire) continue;
                const pt = ce.getPost(link.num);

                // A wire neighbor is only usable if its current is already resolved
                const notReady = ce.isWire() && !hasWireInfo.has(ce);

                if (pt.x === wire.x && pt.y === wire.y) {
                    neighbors0.push(ce);
                    if (notReady) isReady0 = false;
                } else if (pt.x === wire.x2 && pt.y === wire.y2) {
                    neighbors1.push(ce);
                    if (notReady) isReady1 = false;
                }
            }

            // Prefer a ready post that actually has neighbors; fall back to any ready post
            const usePost0 = isReady0 && (neighbors0.length > 0 || !isReady1);
            const usePost1 = !usePost0 && isReady1;

            if (usePost0) {
                wi.neighbors = neighbors0;
                wi.post = 0;
                hasWireInfo.add(wire);
                moved = 0;
                i++;
            } else if (usePost1) {
                wi.neighbors = neighbors1;
                wi.post = 1;
                hasWireInfo.add(wire);
                moved = 0;
                i++;
            } else {
                // Both posts have unresolved wire deps — move to end and retry (matches Java)
                this.wireInfoList.push(this.wireInfoList.splice(i, 1)[0]);
                moved++;
                if (moved > this.wireInfoList.length * 2) {
                    // Wire loop — use best available neighbors
                    wi.neighbors = neighbors0.length > 0 ? neighbors0 : neighbors1;
                    wi.post = neighbors0.length > 0 ? 0 : 1;
                    hasWireInfo.add(wire);
                    moved = 0;
                    i++;
                }
            }
        }
    }

    /** Assign node numbers using Union-Find for wire-connected coordinates.
        Matches Java CirSim.calculateWireClosure() + makeNodeList(). */
    private assignNodeNumbers(): void {
        // Union-Find: merge wire-connected posts into the same set
        const uf = new Map<string, string>();
        const find = (k: string): string => {
            let p = uf.get(k);
            if (p === undefined) { uf.set(k, k); return k; }
            while (p !== uf.get(p)) {
                uf.set(p, uf.get(uf.get(p)!)!);
                p = uf.get(p)!;
            }
            uf.set(k, p);
            return p;
        };
        const union = (a: string, b: string): void => {
            const ra = find(a), rb = find(b);
            if (ra !== rb) uf.set(ra, rb);
        };

        // Register all post coordinates and build wireInfoList
        this.wireInfoList = [];
        for (const c of this.components) {
            c.setPoints();
            for (let j = 0; j < c.getPostCount(); j++) {
                const pt = c.getPost(j);
                find(`${pt.x},${pt.y}`);
            }
            if (c.isWire()) {
                this.wireInfoList.push({ wire: c, neighbors: [], post: 0 });
            }
        }

        // Merge wire-connected nodes (like Java calculateWireClosure)
        for (const c of this.components) {
            if (c.isWire() && c.getPostCount() >= 2) {
                const p1 = c.getPost(0);
                const p2 = c.getPost(1);
                union(`${p1.x},${p1.y}`, `${p2.x},${p2.y}`);
            }
        }

        // Ground: map GroundElm's post root to node 0
        const rootToNode = new Map<string, number>();
        for (const c of this.components) {
            if (c.getDumpType() !== 'g') continue;
            const pt = c.getPost(0);
            const root = find(`${pt.x},${pt.y}`);
            rootToNode.set(root, 0);
        }

        // Assign node numbers
        let nextNode = 1;
        for (const c of this.components) {
            c.setPoints();
            const pc = c.getPostCount();
            const ic = c.getInternalNodeCount();
            const newNodes = new Int32Array(pc + ic);

            for (let j = 0; j < pc; j++) {
                const pt = c.getPost(j);
                const root = find(`${pt.x},${pt.y}`);
                let n = rootToNode.get(root);
                if (n === undefined) {
                    n = nextNode++;
                    rootToNode.set(root, n);
                }
                newNodes[j] = n;
            }

            for (let j = 0; j < ic; j++) {
                newNodes[pc + j] = nextNode++;
            }

            c.nodes = newNodes;
        }

        this.nodeCount = nextNode;
    }

    // ---- Simulation Run Loop ----

    /** Called every animation frame (~16ms) */
    update(): void {
        if (!this.running || this.components.length === 0) return;
        if (this.stopMessage) { this.running = false; return; }

        this.runCircuit();
    }

    /** Run the simulation for a specified number of steps */
    runSteps(steps: number): void {
        this.analyzeCircuit();
        for (let i = 0; i < steps; i++) {
            if (this.stopMessage) break;
            this.runOneStep();
        }
    }

    /** Run simulation for a specified duration in seconds */
    runForDuration(duration: number): void {
        this.analyzeCircuit();
        const targetTime = this.t + duration;
        let safety = 0;
        while (this.t < targetTime && !this.stopMessage && safety < 1000000) {
            this.runOneStep();
            safety++;
        }
    }

    /** Run one outer iteration step */
    private runOneStep(): void {
        // Adaptive timestep increase
        if (this.goodIterations >= 3 &&
            this.config.timeStep < this.config.maxTimeStep) {
            this.config.timeStep = Math.min(this.config.timeStep * 2, this.config.maxTimeStep);
            this.goodIterations = 0;
            // Re-stamp with new timestep (components that depend on timestep need this)
            this.reStamp();
        }

        // Start iteration: companion model pre-computation (skip wires — Union-Find)
        for (const c of this.components) {
            if (c.isWire()) continue;
            c.simTime = this.t;
            c.startIteration();
        }

        // Newton-Raphson inner loop
        let subiter: number;
        for (subiter = 0; subiter < this.subIterCount; subiter++) {
            this.ctx = new StampContextImpl(this.matrix, this.config.timeStep, true);

            // Reset matrix to original
            this.matrix.resetToOrig();

            // Do step for all components (skip wires — Union-Find).
            // Nonlinear elements update their contributions and check convergence.
            for (const c of this.components) {
                if (c.isWire()) continue;
                c.doStep(this.ctx);
            }

            // NaN/Infinity check (matches Java CirSim lines 2680-2688)
            if (this.stopMessage) return;
            const d = this.matrix.data;
            const sz = this.matrix.size;
            for (let j = 0; j < sz; j++) {
                for (let i = 0; i < sz; i++) {
                    const x = d[i * sz + j];
                    if (isNaN(x) || !isFinite(x)) {
                        this.stopMessage = 'nan/infinite matrix!';
                        return;
                    }
                }
            }

            // Solve
            if (this.circuitNonLinear) {
                if (this.ctx.converged && subiter > 0) break;
                if (!this.matrix.luFactor()) {
                    this.stopMessage = 'Singular matrix in nonlinear iteration';
                    return;
                }
            }
            this.matrix.luSolve();

            // Apply solved voltages to components
            this.applySolvedVoltages();

            // Linear circuits: one iteration is enough
            if (!this.circuitNonLinear) break;
        }

        // Convergence check
        if (subiter >= this.subIterCount) {
            // Convergence failure — halve timestep
            this.config.timeStep /= 2;
            this.restoreNodeVoltages();
            this.reStamp();
            this.goodIterations = 0;
            return;
        }

        // Advance time
        this.t += this.config.timeStep;
        this.timeStepAccum += this.config.timeStep;
        if (this.timeStepAccum >= this.config.maxTimeStep) {
            this.timeStepCount++;
            this.timeStepAccum -= this.config.maxTimeStep;
        }

        // Post-step
        for (const c of this.components) {
            if (c.isWire()) continue;
            c.stepFinished();
        }
        // Calculate wire currents (needed for display; wires have no VS row)
        this.calcWireCurrents();

        // Save node voltages for potential rollback
        this.saveNodeVoltages();

        // Track convergence quality for adaptive timestepping
        this.goodIterations++;
    }

    /** Full runCircuit loop (multiple steps per frame) */
    private runCircuit(): void {
        // Check if we need to analyze first
        // Determine iteration count based on speed setting
        const iterCount = Math.max(1, Math.floor(160 * 0.1 * Math.exp((50 - 61) / 24)));

        for (let i = 0; i < iterCount; i++) {
            if (this.stopMessage) break;
            this.runOneStep();
        }
    }

    private reStamp(): void {
        // Rebuild and stamp the entire matrix
        const matrixSize = (this.nodeCount - 1) + this.voltageSourceCount;
        const numNodeRows = this.nodeCount - 1;
        this.matrix = new MNAMatrix(matrixSize, numNodeRows);
        this.ctx = new StampContextImpl(this.matrix, this.config.timeStep, true);
        this.matrix.circuitNonLinear = this.circuitNonLinear;

        for (const c of this.components) {
            if (c.isWire()) continue;
            c.stamp(this.ctx);
        }

        // Connect floating nodes (same as in analyzeCircuit)
        for (let node = 1; node <= numNodeRows; node++) {
            const row = node - 1;
            let allZero = true;
            for (let col = 0; col < matrixSize; col++) {
                if (this.matrix.data[row * matrixSize + col] !== 0) { allZero = false; break; }
            }
            if (allZero) { this.matrix.stampResistor(node, 0, 1e8); }
        }

        this.matrix.saveOrig();

        if (this.matrix.size > 0) {
            this.matrix.simplify();
            if (!this.circuitNonLinear) {
                if (!this.matrix.luFactor()) {
                    this.stopMessage = 'Singular matrix';
                    return;
                }
            }
        }
    }

    /** Copy solved rightSide vector back to component node voltages and VS currents.
        After this, wire currents are stale — call calcWireCurrents() to update them. */
    private applySolvedVoltages(): void {
        const n = this.matrix.rightSide.length;
        const nodeCount = this.nodeCount;

        for (const c of this.components) {
            for (let j = 0; j < c.nodes.length; j++) {
                const node = c.nodes[j];
                if (node === 0) {
                    c.volts[j] = 0; // Ground
                } else if (node <= nodeCount) {
                    let idx = node - 1;
                    // Check if this node was simplified to ROW_CONST
                    if (idx < this.matrix.rowInfo.length &&
                        this.matrix.rowInfo[idx]?.type === 1) { // ROW_CONST
                        c.volts[j] = this.matrix.rowInfo[idx].value;
                    } else {
                        // Map through matrix simplification if needed
                        if (this.matrix.needsMap && idx < this.matrix.rowInfo.length) {
                            idx = this.matrix.rowInfo[idx].mapCol;
                        }
                        if (idx >= 0 && idx < n) {
                            c.volts[j] = this.matrix.rightSide[idx];
                        }
                    }
                }
            }
            c.calculateCurrent();

            // Read back voltage-source branch current from the solution vector
            if (c.voltSource >= 0) {
                const rawRow = this.matrix.numNodeRows + c.voltSource; // 0-based row in original matrix
                if (this.matrix.needsMap && rawRow < this.matrix.rowInfo.length) {
                    const mappedRow = this.matrix.rowInfo[rawRow]?.mapRow;
                    if (mappedRow !== undefined && mappedRow >= 0) {
                        c.current = this.matrix.rightSide[mappedRow];
                    }
                } else if (rawRow < this.matrix.rightSide.length) {
                    c.current = this.matrix.rightSide[rawRow];
                }
            }
        }
    }

    private saveNodeVoltages(): void {
        for (const c of this.components) {
            for (let j = 0; j < c.nodes.length; j++) {
                if (c.nodes[j] > 0 && c.nodes[j] <= this.nodeCount) {
                    this.lastNodeVoltages[c.nodes[j] - 1] = c.volts[j];
                }
            }
        }
    }

    private restoreNodeVoltages(): void {
        for (const c of this.components) {
            for (let j = 0; j < c.nodes.length; j++) {
                const node = c.nodes[j];
                if (node > 0 && node <= this.nodeCount) {
                    c.volts[j] = this.lastNodeVoltages[node - 1];
                } else if (node === 0) {
                    c.volts[j] = 0;
                }
            }
            c.calculateCurrent();
        }
    }

    /**
     * Calculate wire currents from neighbor element currents.
     * Since wires don't have MNA voltage source rows (Union-Find), we need to
     * compute their currents from surrounding elements. Matches Java calcWireCurrents().
     */
    calcWireCurrents(): void {
        for (const wi of this.wireInfoList) {
            const wire = wi.wire;
            let cur = 0;
            const p = wire.getPost(wi.post);
            for (const neighbor of wi.neighbors) {
                const n = neighbor.getNodeAtPoint(p.x, p.y);
                cur += neighbor.getCurrentIntoNode(n);
            }
            wire.current = (wi.post === 0) ? cur : -cur;
        }
    }

    // ---- State queries ----

    getNodeVoltage(nodeIndex: number): number {
        for (const c of this.components) {
            for (let j = 0; j < c.nodes.length; j++) {
                if (c.nodes[j] === nodeIndex) return c.volts[j];
            }
        }
        return 0;
    }

    getAllNodeVoltages(): number[] {
        const result = new Array<number>(this.nodeCount).fill(0);
        for (const c of this.components) {
            for (let j = 0; j < c.nodes.length; j++) {
                const node = c.nodes[j];
                if (node >= 0 && node < this.nodeCount) {
                    result[node] = c.volts[j];
                }
            }
        }
        return result;
    }

    getNodeCount(): number { return this.nodeCount; }
    getTime(): number { return this.t; }
    getTimeStep(): number { return this.config.timeStep; }
    isRunning(): boolean { return this.running; }

    start(): void { this.running = true; }
    stop(): void { this.running = false; }

    /**
     * Update current dot animation for all components — call once per render frame.
     * Matches Java CirSim: currentMult = 1.7 * inc * exp(currentBar/3.5 - 14.2)
     * @param frameDeltaMs real elapsed milliseconds since last frame
     * @param currentSpeed slider value (0–100), default 50 matches Java default
     */
    updateCurrentAnimation(frameDeltaMs: number, currentSpeed = 50): void {
        const c = Math.exp(currentSpeed / 3.5 - 14.2);
        const currentMult = 1.7 * frameDeltaMs * c;
        for (const comp of this.components) {
            comp.updateCurcount(currentMult);
        }
    }
}
