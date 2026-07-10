/**
 * CustomCompositeModel — stores a subcircuit definition for CustomCompositeComponent.
 */
import { escape as esc, unescape as unesc } from '../../util/textEscape.js';

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
    /** Whether this model has been dumped */
    dumped = false;

    /** Reset dumped flags for all models */
    static clearDumpedFlags(): void {
        for (const model of CustomCompositeModel.modelMap.values()) {
            model.dumped = false;
        }
    }

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

    /** Parse a "." model line and store in the registry */
    static undumpModel(tokens: string[], startIndex: number): CustomCompositeModel | null {
        if (tokens.length < startIndex + 4) return null;
        const name = unesc(tokens[startIndex]);
        const flags = parseInt(tokens[startIndex + 1]) || 0; // unused currently
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

        // Remaining tokens: nodeList and circuitDump (both escaped)
        if (idx >= tokens.length) return null;
        const nodeList = unesc(tokens[idx++]);
        const circuitDump = idx < tokens.length
            ? tokens.slice(idx).map(t => unesc(t)).join(' ')
            : '';

        const model = new CustomCompositeModel();
        model.name = name;
        model.sizeX = sizeX;
        model.sizeY = sizeY;
        model.extList = extList;
        model.nodeList = nodeList;
        model.parseDump(circuitDump);
        model.dumped = true;
        CustomCompositeModel.modelMap.set(name, model);
        return model;
    }
}
