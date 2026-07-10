/**
 * TransistorModel — shared BJT parameter set.
 * Port of Java TransistorModel for circuit serialization compatibility.
 *
 * Dump format: "32 <escapedName> <flags> <satCur> <invRollOffF> <BEleakCur>
 *   <leakBEemissionCoeff> <invRollOffR> <BCleakCur> <leakBCemissionCoeff>
 *   <emissionCoeffF> <emissionCoeffR> <invEarlyVoltF> <invEarlyVoltR> <betaR>"
 */
import { escape } from '../../util/textEscape.js';

export class TransistorModel {
    static readonly modelMap = new Map<string, TransistorModel>();

    name = '';
    description = '';
    flags = 0;

    satCur = 1e-13;
    invRollOffF = 0;
    BEleakCur = 0;
    leakBEemissionCoeff = 1.5;
    invRollOffR = 0;
    BCleakCur = 0;
    leakBCemissionCoeff = 2;
    emissionCoeffF = 1;
    emissionCoeffR = 1;
    invEarlyVoltF = 0;
    invEarlyVoltR = 0;
    betaR = 1;

    dumped = false;
    builtIn = false;

    constructor();

    constructor(name?: string, satCur?: number);

    constructor(name?: string, satCur?: number) {
        if (name !== undefined) {
            this.name = name;
            if (satCur !== undefined) this.satCur = satCur;
        }
    }

    static clearDumpedFlags(): void {
        for (const model of TransistorModel.modelMap.values()) {
            model.dumped = false;
        }
    }

    static getModelWithName(name: string): TransistorModel | undefined {
        TransistorModel.createModelMap();
        return TransistorModel.modelMap.get(name);
    }

    static getModelWithNameOrCopy(name: string, oldModel: TransistorModel | null): TransistorModel {
        TransistorModel.createModelMap();
        const existing = TransistorModel.modelMap.get(name);
        if (existing) return existing;
        if (!oldModel) {
            console.warn('transistor model not found: ' + name);
            return TransistorModel.getDefaultModel();
        }
        // Copy oldModel fields
        const model = new TransistorModel(name, oldModel.satCur);
        model.flags = oldModel.flags;
        model.invRollOffF = oldModel.invRollOffF;
        model.BEleakCur = oldModel.BEleakCur;
        model.leakBEemissionCoeff = oldModel.leakBEemissionCoeff;
        model.invRollOffR = oldModel.invRollOffR;
        model.BCleakCur = oldModel.BCleakCur;
        model.leakBCemissionCoeff = oldModel.leakBCemissionCoeff;
        model.emissionCoeffF = oldModel.emissionCoeffF;
        model.emissionCoeffR = oldModel.emissionCoeffR;
        model.invEarlyVoltF = oldModel.invEarlyVoltF;
        model.invEarlyVoltR = oldModel.invEarlyVoltR;
        model.betaR = oldModel.betaR;
        TransistorModel.modelMap.set(name, model);
        return model;
    }

    private static createModelMap(): void {
        if (TransistorModel.modelMap.size > 0) return;
        TransistorModel.addDefaultModel('default', new TransistorModel('default', 1e-13));
        TransistorModel.addDefaultModel('spice-default', new TransistorModel('spice-default', 1e-16));
    }

    private static addDefaultModel(name: string, model: TransistorModel): void {
        TransistorModel.modelMap.set(name, model);
        model.builtIn = true;
        model.name = name;
    }

    static getDefaultModel(): TransistorModel {
        return TransistorModel.getModelWithName('default') ?? new TransistorModel('default', 1e-13);
    }

    /** Serialize as "32" dump line (matching Java TransistorModel.dump) */
    dump(): string {
        this.dumped = true;
        return `32 ${escape(this.name)} ${this.flags} ${this.satCur} ${this.invRollOffF} ${this.BEleakCur} ${this.leakBEemissionCoeff} ${this.invRollOffR} ${this.BCleakCur} ${this.leakBCemissionCoeff} ${this.emissionCoeffF} ${this.emissionCoeffR} ${this.invEarlyVoltF} ${this.invEarlyVoltR} ${this.betaR}`;
    }

    /** Parse a "32" model line and store in registry */
    static undumpModel(tokens: string[], startIndex: number): TransistorModel | null {
        // 14 data fields after type: name, flags, satCur, invRollOffF, BEleakCur,
        // leakBEemissionCoeff, invRollOffR, BCleakCur, leakBCemissionCoeff,
        // emissionCoeffF, emissionCoeffR, invEarlyVoltF, invEarlyVoltR, betaR
        if (tokens.length < startIndex + 14) return null;
        TransistorModel.createModelMap();
        const name = tokens[startIndex];
        const model = new TransistorModel(name);
        model.dumped = true;
        const pf = (s: string) => { const v = parseFloat(s); return isNaN(v) ? 0 : v; };
        model.flags = isNaN(parseInt(tokens[startIndex + 1])) ? 0 : parseInt(tokens[startIndex + 1]);
        model.satCur = pf(tokens[startIndex + 2]);
        if (isNaN(parseFloat(tokens[startIndex + 2]))) model.satCur = 1e-13;
        model.invRollOffF = pf(tokens[startIndex + 3]);
        model.BEleakCur = pf(tokens[startIndex + 4]);
        model.leakBEemissionCoeff = pf(tokens[startIndex + 5]);
        if (isNaN(parseFloat(tokens[startIndex + 5]))) model.leakBEemissionCoeff = 1.5;
        model.invRollOffR = pf(tokens[startIndex + 6]);
        model.BCleakCur = pf(tokens[startIndex + 7]);
        model.leakBCemissionCoeff = pf(tokens[startIndex + 8]);
        if (isNaN(parseFloat(tokens[startIndex + 8]))) model.leakBCemissionCoeff = 2;
        model.emissionCoeffF = pf(tokens[startIndex + 9]);
        if (isNaN(parseFloat(tokens[startIndex + 9]))) model.emissionCoeffF = 1;
        model.emissionCoeffR = pf(tokens[startIndex + 10]);
        if (isNaN(parseFloat(tokens[startIndex + 10]))) model.emissionCoeffR = 1;
        model.invEarlyVoltF = pf(tokens[startIndex + 11]);
        model.invEarlyVoltR = pf(tokens[startIndex + 12]);
        model.betaR = pf(tokens[startIndex + 13]);
        if (isNaN(parseFloat(tokens[startIndex + 13]))) model.betaR = 1;
        TransistorModel.modelMap.set(name, model);
        return model;
    }
}
