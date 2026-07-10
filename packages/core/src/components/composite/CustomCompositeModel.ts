/**
 * CustomCompositeModel — stores a subcircuit definition for CustomCompositeComponent.
 */
const modelCache = new Map<string, CustomCompositeModel>();

export class CustomCompositeModel {
    /** Circuit dump string (text format) */
    circuitDump = '';
    /** External pin/node names */
    pinNames: string[] = ['A', 'B', 'Q'];
    /** List of component dump lines in the subcircuit */
    componentDumps: string[] = [];

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
}
