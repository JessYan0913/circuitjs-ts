/**
 * CompositeElm — abstract base class for components that contain subcircuits.
 *
 * Manages child circuit elements, maps subcircuit-local node numbers to global
 * circuit node numbers, and delegates stamp/doStep/startIteration/stepFinished
 * to children.
 *
 * Architecture (matching Java CompositeElm):
 *   - Children are created from subcircuit model dump lines and stored in
 *     compElmList.
 *   - nodeLinks[] tracks, for each subcircuit-local node, which child terminals
 *     connect to it — used for getConnection/hasGroundConnection/getCurrentIntoNode.
 *   - The composite's own nodes[] array has one entry per subcircuit-local
 *     node (external posts + internal nodes), directly indexed.
 *   - Before stamp/doStep, children's nodes[] are remapped from subcircuit-
 *     local indices to global circuit node numbers via the composite's own
 *     nodes[] mapping.
 *   - Voltage sources from children are aggregated: getVoltageSourceCount()
 *     returns the sum, and setVoltageSource/setCurrent route to the correct child.
 */
import { CircuitComponent } from './CircuitComponent.js';
import { ChipComponent } from './ChipComponent.js';
import { createComponentByCode } from '../registry.js';
import type { StampContext } from '@circuitjs/shared';

/** A link from a subcircuit-local node to a specific terminal on a child element */
interface NodeLink {
    child: CircuitComponent;
    terminal: number;
}

/** Internal record for routing voltage source indices to children */
interface VsRecord {
    child: CircuitComponent;
    childVsIndex: number;
    /** Global voltage source index (assigned by SimulationManager) */
    globalVsIndex: number;
}

// Extended interface for children that may have connection analysis methods
interface ComponentWithConnections {
    getConnection(n1: number, n2: number): boolean;
    hasGroundConnection(n1: number): boolean;
}

function hasConnections(comp: CircuitComponent): comp is CircuitComponent & ComponentWithConnections {
    return typeof (comp as any).getConnection === 'function';
}

export abstract class CompositeElm extends ChipComponent {
    /** Child circuit elements that form this subcircuit */
    compElmList: CircuitComponent[] = [];

    /** Maps composite post index → subcircuit-local node number */
    externalNodes: number[] = [];

    /** Total number of subcircuit-local nodes (posts + internal) */
    numSubcircuitNodes = 0;

    /**
     * For each subcircuit-local node (indexed 0..numSubcircuitNodes-1),
     * the list of (child, terminal) pairs connected to that node.
     * Matches Java's compNodeList.
     */
    protected nodeLinks: NodeLink[][] = [];

    /** Voltage source routing table: composite VS index → (child, child VS index) */
    private vsRecords: VsRecord[] = [];

    /** Saved original (subcircuit-local) node indices for each child,
        needed to map voltages back during doStep. */
    private childLocalNodeMap = new Map<CircuitComponent, Int32Array>();

    constructor(args: { x: number; y: number; x2?: number; y2?: number; flags?: number }) {
        super(args);
    }

    // ---- Abstract ----

    /** Return the array of component dump lines (the subcircuit definition). */
    abstract getComponentDumps(): string[];

    // ---- Node management ----

    override getInternalNodeCount(): number {
        return Math.max(0, this.numSubcircuitNodes - this.getPostCount());
    }

    // ---- Voltage source management ----

    override getVoltageSourceCount(): number {
        return this.vsRecords.length;
    }

    override setVoltageSource(n: number, vs: number): void {
        if (n >= 0 && n < this.vsRecords.length) {
            const rec = this.vsRecords[n];
            rec.child.setVoltageSource(rec.childVsIndex, vs);
            rec.globalVsIndex = vs;
        }
    }

    // ---- Load subcircuit from model data ----

    /**
     * Load (or reload) the subcircuit from the given external node mapping.
     * @param extNodes  Array mapping composite post index → subcircuit-local node number
     * @param dumps     Array of component dump lines
     */
    protected loadComposite(extNodes: number[], dumps: string[]): void {
        this.externalNodes = extNodes;
        this.compElmList = [];
        this.childLocalNodeMap.clear();

        // Determine max subcircuit-local node index from external nodes
        let maxNode = 0;
        for (const n of extNodes) {
            if (n > maxNode) maxNode = n;
        }

        // Phase 1: create all children from dump lines
        const createdChildren: CircuitComponent[] = [];
        const childLocalNodes: Int32Array[] = [];
        for (const line of dumps) {
            const trimmed = line.trim();
            if (trimmed.length === 0) continue;

            const child = this.createChildFromDump(trimmed);
            if (!child) continue;

            // Save original (subcircuit-local) node indices
            const localNodes = new Int32Array(child.nodes);
            childLocalNodes.push(localNodes);
            this.childLocalNodeMap.set(child, localNodes);

            // Track max local node index
            for (let j = 0; j < localNodes.length; j++) {
                if (localNodes[j] > maxNode) {
                    maxNode = localNodes[j];
                }
            }

            createdChildren.push(child);
        }

        this.numSubcircuitNodes = maxNode + 1;
        this.compElmList = createdChildren;

        // Phase 2: build nodeLinks from children's local node indices
        this.nodeLinks = new Array(this.numSubcircuitNodes);
        for (let i = 0; i < this.numSubcircuitNodes; i++) {
            this.nodeLinks[i] = [];
        }

        for (let ci = 0; ci < this.compElmList.length; ci++) {
            const child = this.compElmList[ci];
            const localNodes = childLocalNodes[ci];
            const totalChildNodes = child.getPostCount() + child.getInternalNodeCount();
            for (let t = 0; t < totalChildNodes && t < localNodes.length; t++) {
                const localIdx = localNodes[t];
                if (localIdx > 0 && localIdx < this.numSubcircuitNodes) {
                    this.nodeLinks[localIdx].push({ child, terminal: t });
                }
                // node 0 = ground — no link needed
            }
        }

        // Build voltage source routing table
        this.buildVsRecords();

        // Re-allocate nodes now that we know the true node count
        this.allocNodes();
    }

    private createChildFromDump(line: string): CircuitComponent | null {
        try {
            const tokens = line.split(/\s+/);
            if (tokens.length < 1) return null;

            const typeToken = tokens[0];

            let code: number | string;
            if (typeToken.length === 1) {
                code = typeToken.charCodeAt(0);
            } else {
                const num = parseInt(typeToken);
                code = isNaN(num) ? typeToken : num;
            }

            // Skip model definition lines
            if (typeToken === '.' || typeToken === '!' ||
                typeToken === '34' || typeToken === '32' ||
                typeToken === '38' || typeToken === 'o' || typeToken === 'h') {
                return null;
            }

            const x1 = parseInt(tokens[1]) || 0;
            const y1 = parseInt(tokens[2]) || 0;
            const x2 = parseInt(tokens[3]) || 0;
            const y2 = parseInt(tokens[4]) || 0;
            const flags = parseInt(tokens[5]) || 0;

            const comp = createComponentByCode(code, x1, y1, x2, y2, flags);
            if (!comp) return null;

            if (tokens.length > 6) {
                comp.handleDumpData(tokens, 6);
            }

            return comp;
        } catch {
            return null;
        }
    }

    private buildVsRecords(): void {
        this.vsRecords = [];
        for (const child of this.compElmList) {
            if (child.isWire()) continue;
            const cvs = child.getVoltageSourceCount();
            for (let i = 0; i < cvs; i++) {
                this.vsRecords.push({ child, childVsIndex: i, globalVsIndex: -1 });
            }
        }
    }

    // ---- Stamp delegation ----

    override stamp(context: StampContext): void {
        // Remap children's nodes from subcircuit-local to global circuit node numbers
        for (const child of this.compElmList) {
            const localNodes = this.childLocalNodeMap.get(child);
            if (!localNodes) continue;

            const globalNodes = new Int32Array(localNodes.length);
            for (let i = 0; i < localNodes.length; i++) {
                const localIdx = localNodes[i];
                if (localIdx >= 0 && localIdx < this.nodes.length) {
                    globalNodes[i] = this.nodes[localIdx];
                } else {
                    globalNodes[i] = 0; // fallback to ground
                }
            }
            child.nodes = globalNodes;
        }

        // Stamp children
        for (const child of this.compElmList) {
            if (child.isWire()) continue;
            child.stamp(context);
        }
    }

    // ---- Simulation delegation ----

    override startIteration(): void {
        for (const child of this.compElmList) {
            child.startIteration();
        }
    }

    override doStep(context: StampContext): void {
        // Propagate voltages from composite to children
        for (const child of this.compElmList) {
            const localNodes = this.childLocalNodeMap.get(child);
            if (!localNodes) continue;
            for (let i = 0; i < child.nodes.length && i < child.volts.length; i++) {
                const localIdx = localNodes[i];
                if (localIdx >= 0 && localIdx < this.volts.length) {
                    child.volts[i] = this.volts[localIdx];
                }
            }
        }

        for (const child of this.compElmList) {
            if (child.isWire()) continue;
            child.doStep(context);
        }
    }

    override stepFinished(): void {
        for (const child of this.compElmList) {
            child.stepFinished();
        }
    }

    override reset(): void {
        super.reset();
        for (const child of this.compElmList) {
            child.reset();
        }
    }

    override nonLinear(): boolean {
        for (const child of this.compElmList) {
            if (child.nonLinear()) return true;
        }
        return false;
    }

    /** Clean up child elements (matches Java CompositeElm.delete()) */
    delete(): void {
        for (const child of this.compElmList) {
            // Clean up child resources
            if (typeof (child as any).delete === 'function') {
                (child as any).delete();
            }
        }
    }

    // ---- Node voltage propagation ----

    /**
     * Called by SimulationManager after matrix solve to set node voltages.
     * Propagate to children so their internal state stays consistent.
     */
    override setNodeVoltage(n: number, v: number): void {
        super.setNodeVoltage(n, v);
        // Propagate to all children connected to this subcircuit-local node
        if (n >= 0 && n < this.nodeLinks.length) {
            for (const link of this.nodeLinks[n]) {
                if (link.terminal < link.child.volts.length) {
                    link.child.setNodeVoltage(link.terminal, v);
                }
            }
        }
    }

    // ---- Current routing ----

    override setCurrent(vs: number, c: number): void {
        // Match by global voltage source index
        for (const rec of this.vsRecords) {
            if (rec.globalVsIndex === vs) {
                rec.child.setCurrent(rec.childVsIndex, c);
                return;
            }
        }
    }

    override getCurrentIntoNode(n: number): number {
        let total = 0;
        if (n >= 0 && n < this.nodeLinks.length) {
            for (const link of this.nodeLinks[n]) {
                total += link.child.getCurrentIntoNode(link.terminal);
            }
        }
        return total;
    }

    // ---- Connection analysis ----

    /**
     * BFS through subcircuit-internal connections to determine if
     * two local nodes are connected internally.
     */
    getConnection(n1: number, n2: number): boolean {
        if (n1 === n2) return true;
        if (n1 < 0 || n1 >= this.nodeLinks.length ||
            n2 < 0 || n2 >= this.nodeLinks.length) return false;

        const visited = new Set<number>();
        const queue: number[] = [n1];
        visited.add(n1);

        while (queue.length > 0) {
            const n = queue.shift()!;
            if (n === n2) return true;

            // Check all children connected to this node, and their other terminals
            for (const link of this.nodeLinks[n]) {
                const child = link.child;
                const totalChildNodes = child.nodes.length;
                // getConnection may not exist on all component types
                const childConn = hasConnections(child) ? child : null;
                for (let k = 0; k < totalChildNodes; k++) {
                    if (k !== link.terminal) {
                        // Check if child connects link.terminal to k
                        if (childConn && childConn.getConnection(link.terminal, k)) {
                            const childGlobalNode = child.nodes[k];
                            for (let m = 0; m < this.nodes.length; m++) {
                                if (this.nodes[m] === childGlobalNode && !visited.has(m)) {
                                    visited.add(m);
                                    queue.push(m);
                                }
                            }
                            if (childGlobalNode === 0 && !visited.has(0)) {
                                visited.add(0);
                                queue.push(0);
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    /**
     * Check if the given local node is connected to ground through
     * any of the child elements.
     */
    override hasGroundConnection(n1: number): boolean {
        if (n1 < 0 || n1 >= this.nodeLinks.length) return false;

        const visited = new Set<number>();
        const queue: number[] = [n1];
        visited.add(n1);

        while (queue.length > 0) {
            const n = queue.shift()!;

            for (const link of this.nodeLinks[n]) {
                const child = link.child;
                // hasGroundConnection exists on many component types
                const childConn = hasConnections(child) ? child : null;

                // Check if this child terminal has a ground connection
                // Use type-safe check since not all components have hasGroundConnection
                if (typeof (child as any).hasGroundConnection === 'function' &&
                    (child as any).hasGroundConnection(link.terminal)) {
                    return true;
                }

                // Check other terminals of this child
                if (!childConn) continue;
                for (let k = 0; k < child.nodes.length; k++) {
                    if (k !== link.terminal && childConn.getConnection(link.terminal, k)) {
                        const childGlobalNode = child.nodes[k];
                        for (let m = 0; m < this.nodes.length; m++) {
                            if (this.nodes[m] === childGlobalNode && !visited.has(m)) {
                                visited.add(m);
                                queue.push(m);
                            }
                        }
                        if (childGlobalNode === 0 && !visited.has(0)) {
                            visited.add(0);
                            queue.push(0);
                        }
                    }
                }
            }
        }
        return false;
    }

    // ---- Power ----

    override getPower(): number {
        let total = 0;
        for (const child of this.compElmList) {
            total += child.getPower();
        }
        return total;
    }

    // ---- Info ----

    override getInfo(): string[] {
        const arr: string[] = [this.getChipName()];
        let a = 1;
        for (let i = 0; i < this.pins.length; i++) {
            const p = this.pins[i];
            const val = p.text || `Pin ${i}`;
            if (!arr[a]) arr[a] = '';
            else arr[a] += '; ';
            arr[a] += `${val} = ${this.volts[i].toFixed(2)} V`;
            if (i % 2 === 1) a++;
        }
        return arr;
    }
}
