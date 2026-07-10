/**
 * CustomCompositeModel — stores a subcircuit definition for CustomCompositeComponent.
 * Matches Java CustomCompositeModel.java functionality.
 */
import { escape as esc, unescape as unesc } from '../../util/textEscape.js';
import { SIDE_W } from '../base/ChipComponent.js';

const modelCache = new Map<string, CustomCompositeModel>();

export interface ExtListEntry {
    name: string;
    node: number;
    pos: number;
    side: number;
}

export class CustomCompositeModel {
    /** Static registry of named composite models */
    static readonly modelMap = new Map<string, CustomCompositeModel>();

    /** Last model name used, for default in new instances (matching Java CustomCompositeElm.lastModelName) */
    static lastModelName = 'default';

    /** Circuit dump string (text format) */
    circuitDump = '';
    /** External pin/node names */
    pinNames: string[] = ['A', 'B', 'Q'];
    /** List of component dump lines in the subcircuit */
    componentDumps: string[] = [];

    /** External connection list (matching Java ExtListEntry) */
    extList: ExtListEntry[] = [];
    /** Node list string */
    nodeList = '';
    /** Model dimensions */
    sizeX = 4;
    sizeY = 4;

    /** Model name */
    name = '';
    /** Model flags (matching Java) */
    flags = 0;
    /** Whether this model has been dumped */
    dumped = false;

    // ---- Static model registry management (matching Java) ----

    /**
     * Get a model by name, lazily initializing the registry and creating
     * a default stub model if none exists. Matches Java getModelWithName().
     */
    static getModelWithName(name: string): CustomCompositeModel | null {
        // Lazy init: create default model if map is empty
        if (CustomCompositeModel.modelMap.size === 0) {
            const extList: ExtListEntry[] = [{
                name: 'gnd',
                node: 1,
                pos: 0,
                side: SIDE_W,
            }];
            const d = CustomCompositeModel.createModel('default', '0 0', 'GroundElm 1', extList);
            d.sizeX = 1;
            d.sizeY = 1;
        }

        const lm = CustomCompositeModel.modelMap.get(name);
        return lm ?? null;
    }

    /**
     * Create a new model and register it. Matches Java createModel().
     */
    static createModel(
        name: string,
        elmDump: string,
        nodeList: string,
        extList: ExtListEntry[],
    ): CustomCompositeModel {
        const lm = new CustomCompositeModel();
        lm.name = name;
        lm.circuitDump = elmDump;
        lm.parseDump(elmDump);
        lm.nodeList = nodeList;
        lm.extList = extList;
        CustomCompositeModel.modelMap.set(name, lm);
        return lm;
    }

    /** Reset dumped flags for all models */
    static clearDumpedFlags(): void {
        for (const model of CustomCompositeModel.modelMap.values()) {
            model.dumped = false;
        }
    }

    /**
     * Get a sorted list of all registered models. Matches Java getModelList().
     */
    static getModelList(): CustomCompositeModel[] {
        const list = Array.from(CustomCompositeModel.modelMap.values());
        list.sort((a, b) => a.name.localeCompare(b.name));
        return list;
    }

    /**
     * Rename this model in the registry. Matches Java setName().
     */
    setName(n: string): void {
        CustomCompositeModel.modelMap.delete(this.name);
        this.name = n;
        CustomCompositeModel.modelMap.set(this.name, this);
    }

    // ---- Serialization ----

    /**
     * Parse a "." model line and store in the registry.
     * Matches Java undumpModel(): updates existing model in-place if found.
     */
    static undumpModel(tokens: string[], startIndex: number): CustomCompositeModel | null {
        if (tokens.length < startIndex + 4) return null;
        const name = unesc(tokens[startIndex]);
        CustomCompositeModel.lastModelName = name; // matching Java
        const flags = parseInt(tokens[startIndex + 1]) || 0;
        const sizeX = parseInt(tokens[startIndex + 2]) || 4;
        const sizeY = parseInt(tokens[startIndex + 3]) || 4;
        const extCount = parseInt(tokens[startIndex + 4]) || 0;

        const extList: ExtListEntry[] = [];
        let idx = startIndex + 5;
        for (let i = 0; i < extCount && idx + 3 < tokens.length; i++) {
            const extName = unesc(tokens[idx++]);
            const node = parseInt(tokens[idx++]) || 0;
            const pos = parseInt(tokens[idx++]) || 0;
            const side = parseInt(tokens[idx++]) || 0;
            extList.push({ name: extName, node, pos, side });
        }

        if (idx >= tokens.length) return null;
        const nodeList = unesc(tokens[idx++]);
        const circuitDump = idx < tokens.length
            ? tokens.slice(idx).map(t => unesc(t)).join(' ')
            : '';

        // Try to find existing model first (Java: getModelWithName then undump)
        let model = CustomCompositeModel.modelMap.get(name);
        if (model) {
            // Update existing model in-place
            model.flags = flags;
            model.sizeX = sizeX;
            model.sizeY = sizeY;
            model.extList = extList;
            model.nodeList = nodeList;
            model.parseDump(circuitDump);
            model.dumped = true;
        } else {
            model = new CustomCompositeModel();
            model.name = name;
            model.sizeX = sizeX;
            model.sizeY = sizeY;
            model.extList = extList;
            model.nodeList = nodeList;
            model.parseDump(circuitDump);
            model.dumped = true;
            CustomCompositeModel.modelMap.set(name, model);
        }
        return model;
    }

    // ---- Instance methods ----

    get key(): string {
        return `${this.pinNames.join(',')}|${this.circuitDump.length}`;
    }

    /** Parse a circuit dump string into component dumps */
    parseDump(dump: string): void {
        this.circuitDump = dump;
        this.componentDumps = dump.split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0 && l[0] !== '$');
    }

    static create(pinNames: string[], circuitDump: string): CustomCompositeModel {
        const model = new CustomCompositeModel();
        model.pinNames = pinNames;
        model.parseDump(circuitDump);
        return model;
    }

    static getOrCreate(pinNames: string[], circuitDump: string): CustomCompositeModel {
        const model = CustomCompositeModel.create(pinNames, circuitDump);
        const key = model.key;
        if (!modelCache.has(key)) {
            modelCache.set(key, model);
        }
        return modelCache.get(key)!;
    }

    /** Serialize as "." dump line (matching Java CustomCompositeModel.dump) */
    dump(): string {
        this.dumped = true;
        let str = `. ${esc(this.name)} 0 ${this.sizeX} ${this.sizeY} ${this.extList.length}`;
        for (let i = 0; i < this.extList.length; i++) {
            const ent = this.extList[i];
            str += ` ${esc(ent.name)} ${ent.node} ${ent.pos} ${ent.side}`;
        }
        str += ` ${esc(this.nodeList)} ${esc(this.circuitDump)}`;
        return str;
    }

    /**
     * Create a model from a full circuit dump.
     * Parses the dump text to extract pin names and external node connections.
     */
    static fromCircuitDump(name: string, circuitDump: string): CustomCompositeModel {
        const model = new CustomCompositeModel();
        model.name = name;
        model.circuitDump = circuitDump;
        model.componentDumps = circuitDump.split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0 && l[0] !== '$');

        const usedNodes = new Set<number>();
        for (const line of model.componentDumps) {
            const tokens = line.split(/\s+/);
            if (tokens.length < 6) continue;
            let collectingNodes = true;
            for (let i = 6; i < tokens.length; i++) {
                if (!collectingNodes) break;
                const val = parseInt(tokens[i]);
                if (!isNaN(val) && val >= 0 && val < 1000) {
                    usedNodes.add(val);
                } else {
                    collectingNodes = false;
                }
            }
        }

        const refCount = new Map<number, number>();
        for (const line of model.componentDumps) {
            const tokens = line.split(/\s+/);
            if (tokens.length < 6) continue;
            let collecting = true;
            for (let i = 6; i < tokens.length; i++) {
                if (!collecting) break;
                const val = parseInt(tokens[i]);
                if (!isNaN(val) && val >= 0 && val < 1000) {
                    refCount.set(val, (refCount.get(val) || 0) + 1);
                } else {
                    collecting = false;
                }
            }
        }

        const extNodes: number[] = [];
        for (const [node, count] of refCount) {
            if (count <= 2 && node < 10) {
                extNodes.push(node);
            }
        }

        const sortedNodes = Array.from(usedNodes).sort((a, b) => a - b);
        if (extNodes.length === 0 && sortedNodes.length > 0) {
            extNodes.push(sortedNodes[0]);
            for (let i = 1; i < sortedNodes.length && i < 10; i++) {
                const count = refCount.get(sortedNodes[i]) || 0;
                if (count <= 3) extNodes.push(sortedNodes[i]);
            }
        }

        const pinNames: string[] = [];
        const extList: ExtListEntry[] = [];
        const sortedExt = Array.from(new Set(extNodes)).sort((a, b) => a - b);
        for (let i = 0; i < sortedExt.length; i++) {
            const node = sortedExt[i];
            pinNames.push(`N${node}`);
            extList.push({ name: `N${node}`, node, pos: i, side: SIDE_W });
        }

        if (pinNames.length === 0) {
            pinNames.push('A');
            extList.push({ name: 'A', node: 0, pos: 0, side: SIDE_W });
        }

        model.pinNames = pinNames;
        model.extList = extList;
        model.sizeX = Math.max(2, Math.ceil(pinNames.length / 2));
        model.sizeY = Math.max(2, pinNames.length);

        CustomCompositeModel.modelMap.set(name, model);
        return model;
    }
}
