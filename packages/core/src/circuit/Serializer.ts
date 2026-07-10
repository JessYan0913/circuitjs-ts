import { CircuitComponent, type ComponentConstructor } from '../components/base/CircuitComponent.js';
import { createComponentByCode } from '../components/registry.js';
import { SimulationManager } from './SimulationManager.js';
import { WF_DC } from '../components/sources/DCVoltageComponent.js';
import { ResistorComponent } from '../components/passive/ResistorComponent.js';
import { CapacitorComponent } from '../components/passive/CapacitorComponent.js';
import { InductorComponent } from '../components/passive/InductorComponent.js';
import { WireComponent } from '../components/passive/WireComponent.js';
import { VoltageComponent } from '../components/sources/DCVoltageComponent.js';
import { CurrentComponent } from '../components/sources/CurrentComponent.js';
import { GroundComponent } from '../components/sources/GroundComponent.js';
import { RailComponent } from '../components/sources/RailComponent.js';
import { DiodeComponent } from '../components/active/DiodeComponent.js';
import { TransistorComponent } from '../components/active/TransistorComponent.js';
import { SwitchComponent } from '../components/passive/SwitchComponent.js';

export interface ParsedCircuit {
    header: CircuitHeader;
    components: CircuitComponent[];
}

export interface CircuitHeader {
    flags: number;
    maxTimeStep: number;
    iterCount: number;
    currentBar: number;
    voltageRange: number;
    powerBar: number;
    minTimeStep: number;
}

/**
 * XML tag → component class mapping (independent of dump-code registry).
 */
const XML_TAG_CLASS: Record<string, ComponentConstructor> = {
    r: ResistorComponent,
    c: CapacitorComponent,
    l: InductorComponent,
    w: WireComponent,
    S: SwitchComponent,
    v: VoltageComponent,
    g: GroundComponent,
    VarRail: RailComponent,
    AOutput: VoltageComponent,    // approximating
    i: CurrentComponent,
    ACurrent: CurrentComponent,
    diode: DiodeComponent,
    d: DiodeComponent,
    t: TransistorComponent,
    NTransistor: TransistorComponent,
    PTransistor: TransistorComponent,
};

const DEFAULT_HEADER: CircuitHeader = {
    flags: 1, maxTimeStep: 5e-6, iterCount: 10,
    currentBar: 50, voltageRange: 5, powerBar: 50, minTimeStep: 1e-12,
};

export class Serializer {
    /** Parse a circuit file text into components. Handles both old text format and XML format. */
    static parseCircuit(text: string, sim?: SimulationManager): ParsedCircuit {
        const trimmed = text.trim();
        if (trimmed.startsWith('<')) {
            return Serializer.parseXmlCircuit(trimmed);
        }
        return Serializer.parseTextCircuit(trimmed);
    }

    /** Parse old text format ($ header + component lines) */
    private static parseTextCircuit(text: string): ParsedCircuit {
        const lines = text.split(/\r?\n/);
        const header = { ...DEFAULT_HEADER };
        const components: CircuitComponent[] = [];

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (line.length === 0) continue;

            const tokens = line.split(/\s+/);
            const typeToken = tokens[0];

            if (typeToken === '$') {
                header.flags = parseInt(tokens[1]) || 0;
                header.maxTimeStep = parseFloat(tokens[2]) || 5e-6;
                header.iterCount = parseInt(tokens[3]) || 10;
                header.currentBar = parseInt(tokens[4]) || 50;
                header.voltageRange = parseFloat(tokens[5]) || 5;
                header.powerBar = parseInt(tokens[6]) || 50;
                header.minTimeStep = parseFloat(tokens[7]) || 1e-12;
                continue;
            }

            if (typeToken === 'o' || typeToken === 'h' || typeToken === '38' ||
                typeToken === '!' || typeToken === '.' || typeToken === '34' ||
                typeToken === '32') {
                continue;
            }

            const typeCode = typeToken.length === 1
                ? typeToken.charCodeAt(0)
                : parseInt(typeToken);

            if (tokens.length < 6) continue;

            const x1 = parseInt(tokens[1]);
            const y1 = parseInt(tokens[2]);
            const x2 = parseInt(tokens[3]);
            const y2 = parseInt(tokens[4]);
            const flags = parseInt(tokens[5]);

            const comp = createComponentByCode(typeCode, x1, y1, x2, y2, flags);
            if (comp) {
                if (tokens.length > 6) {
                    comp.handleDumpData?.(tokens, 6);
                }
                components.push(comp);
            }
        }

        return { header, components };
    }

    /** Parse XML format used by the falstad.com website */
    private static parseXmlCircuit(xml: string): ParsedCircuit {
        const header = { ...DEFAULT_HEADER };
        const components: CircuitComponent[] = [];

        const cirMatch = xml.match(/<cir\s+([^>]*)>/i);
        if (cirMatch) {
            const attrs = Serializer.parseXmlAttrs(cirMatch[1]);
            if (attrs.ts) header.maxTimeStep = parseFloat(attrs.ts);
            if (attrs.vr) header.voltageRange = parseFloat(attrs.vr);
            if (attrs.cb) header.currentBar = parseInt(attrs.cb);
            if (attrs.pb) header.powerBar = parseInt(attrs.pb);
            if (attrs.mts) header.minTimeStep = parseFloat(attrs.mts);
        }

        // Find all self-closing tags like <name ... />
        const compRegex = /<(\w+)\s+([^>]*?)\/>/g;
        let match: RegExpExecArray | null;
        while ((match = compRegex.exec(xml)) !== null) {
            const tagName = match[1];
            const attrs = Serializer.parseXmlAttrs(match[2]);

            const ctor = XML_TAG_CLASS[tagName];
            if (!ctor) continue;

            // Parse coordinates from 'x' attribute: "x1 y1 x2 y2"
            const coords = (attrs.x || '').split(/\s+/).map(Number);
            const x1 = coords[0] || 0;
            const y1 = coords[1] || 0;
            const x2 = coords[2] || 0;
            const y2 = coords[3] || 0;
            const flags = parseInt(attrs.f) || 0;

            const comp = CircuitComponent.fromDump(ctor, x1, y1, x2, y2, flags);
            if (!comp) continue;

            // Set component-specific properties from XML attributes
            switch (tagName) {
                case 'r':
                    if (attrs.r) (comp as ResistorComponent).resistance = parseFloat(attrs.r);
                    break;
                case 'c':
                    if (attrs.c) (comp as CapacitorComponent).capacitance = parseFloat(attrs.c);
                    break;
                case 'l':
                    if (attrs.l) (comp as InductorComponent).inductance = parseFloat(attrs.l);
                    break;
                case 'S':
                    if (attrs.li) (comp as SwitchComponent).position = parseInt(attrs.li);
                    break;
                case 'v':
                    if (attrs.wf) (comp as VoltageComponent).waveform = parseInt(attrs.wf);
                    if (attrs.fr) (comp as VoltageComponent).frequency = parseFloat(attrs.fr);
                    if (attrs.maxv) (comp as VoltageComponent).maxVoltage = parseFloat(attrs.maxv);
                    if (attrs.bias) (comp as VoltageComponent).bias = parseFloat(attrs.bias);
                    if (attrs.ph) (comp as VoltageComponent).phaseShift = parseFloat(attrs.ph);
                    if (attrs.dc) (comp as VoltageComponent).dutyCycle = parseFloat(attrs.dc);
                    break;
                case 'VarRail':
                    (comp as RailComponent).waveform = WF_DC;
                    if (attrs.maxv) (comp as RailComponent).maxVoltage = parseFloat(attrs.maxv);
                    break;
                case 'i':
                case 'ACurrent':
                    if (attrs.i) (comp as CurrentComponent).currentValue = parseFloat(attrs.i);
                    break;
                case 'diode':
                case 'd':
                    if (attrs.is) (comp as DiodeComponent).model.saturationCurrent = parseFloat(attrs.is);
                    if (attrs.n) (comp as DiodeComponent).model.emissionCoefficient = parseFloat(attrs.n);
                    break;
                case 't':
                case 'NTransistor':
                    (comp as TransistorComponent).isPNP = false;
                    if (attrs.beta) (comp as TransistorComponent).beta = parseFloat(attrs.beta);
                    break;
                case 'PTransistor':
                    (comp as TransistorComponent).isPNP = true;
                    if (attrs.beta) (comp as TransistorComponent).beta = parseFloat(attrs.beta);
                    break;
            }

            components.push(comp);
        }

        return { header, components };
    }

    /** Parse XML attribute string into key-value map */
    private static parseXmlAttrs(s: string): Record<string, string> {
        const result: Record<string, string> = {};
        const regex = /(\w+)\s*=\s*"([^"]*)"/g;
        let m: RegExpExecArray | null;
        while ((m = regex.exec(s)) !== null) {
            result[m[1]] = m[2];
        }
        return result;
    }

    static dumpCircuit(sim: SimulationManager): string {
        const h = sim.config;
        const flags = 1;
        const iterCount = 10;
        const currentBar = 50;
        const powerBar = 50;

        let out = `$ ${flags} ${h.maxTimeStep} ${iterCount} ${currentBar} ${h.voltageRange} ${powerBar} ${h.minTimeStep}\n`;

        for (const c of sim.components) {
            const modelData = c.dumpModel();
            if (modelData) out += modelData + '\n';
            out += c.dump() + '\n';
        }

        return out.trimEnd();
    }
}
