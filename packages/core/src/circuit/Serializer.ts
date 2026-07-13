import { CircuitComponent, type ComponentConstructor } from '../components/base/CircuitComponent.js';
import { createComponentByCode } from '../components/registry.js';
import { SimulationManager } from './SimulationManager.js';
import { unescape } from '../util/textEscape.js';
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
import { DiodeModel } from '../components/active/DiodeModel.js';
import { TransistorModel } from '../components/active/TransistorModel.js';
import { TransistorComponent } from '../components/active/TransistorComponent.js';
import { SwitchComponent } from '../components/passive/SwitchComponent.js';
import { PolarCapacitorComponent } from '../components/passive/PolarCapacitorComponent.js';
import { Switch2Component } from '../components/passive/Switch2Component.js';
import { PushSwitchComponent } from '../components/passive/PushSwitchComponent.js';
import { MBBSwitchComponent } from '../components/passive/MBBSwitchComponent.js';
import { FuseComponent } from '../components/passive/FuseComponent.js';
import { BoxComponent } from '../components/passive/BoxComponent.js';
import { NoiseComponent } from '../components/sources/NoiseComponent.js';
import { AntennaComponent } from '../components/sources/AntennaComponent.js';
import { VarRailComponent } from '../components/sources/VarRailComponent.js';
import { SweepComponent } from '../components/sources/SweepComponent.js';
import { AMComponent } from '../components/sources/AMComponent.js';
import { FMComponent } from '../components/sources/FMComponent.js';
import { TextElm } from '../components/measurement/TextElm.js';
import { LabeledNodeElm } from '../components/measurement/LabeledNodeElm.js';
import { ProbeElm } from '../components/measurement/ProbeElm.js';
import { AmmeterElm } from '../components/measurement/AmmeterElm.js';
import { OhmMeterElm } from '../components/measurement/OhmMeterElm.js';
import { AudioOutputElm } from '../components/measurement/AudioOutputElm.js';
import { TestPointElm } from '../components/measurement/TestPointElm.js';
import { PhaseCompElm } from '../components/measurement/PhaseCompElm.js';
import { DataRecorderElm } from '../components/measurement/DataRecorderElm.js';
import { StopTriggerElm } from '../components/measurement/StopTriggerElm.js';
import { AudioInputElm } from '../components/measurement/AudioInputElm.js';
import { PotComponent } from '../components/passive/PotComponent.js';
import { ThermistorComponent } from '../components/passive/ThermistorComponent.js';
import { LDRComponent } from '../components/passive/LDRComponent.js';
import { MemristorComponent } from '../components/passive/MemristorComponent.js';
// Active/semiconductor components
import { ZenerComponent } from '../components/active/ZenerComponent.js';
import { TunnelDiodeComponent } from '../components/active/TunnelDiodeComponent.js';
import { VaractorComponent } from '../components/active/VaractorComponent.js';
import { MosfetComponent } from '../components/active/MosfetComponent.js';
import { JfetComponent } from '../components/active/JfetComponent.js';
import { OpAmpComponent } from '../components/active/OpAmpComponent.js';
import { SCRComponent } from '../components/active/SCRComponent.js';
import { CCVSComponent, VCCSComponent, VCVSComponent, CCCSComponent } from '../components/active/ControlledSources.js';
// Digital gates
import { AndGateComponent } from '../components/gates/AndGateComponent.js';
import { NandGateComponent } from '../components/gates/NandGateComponent.js';
import { OrGateComponent } from '../components/gates/OrGateComponent.js';
import { NorGateComponent } from '../components/gates/NorGateComponent.js';
import { XorGateComponent } from '../components/gates/XorGateComponent.js';
import { InverterComponent } from '../components/gates/InverterComponent.js';
import { SchmittComponent } from '../components/gates/SchmittComponent.js';
import { InvertingSchmittComponent } from '../components/gates/InvertingSchmittComponent.js';
import { LogicInputComponent } from '../components/gates/LogicInputComponent.js';
import { LogicOutputComponent } from '../components/gates/LogicOutputComponent.js';
import { DFlipFlopComponent } from '../components/gates/DFlipFlopComponent.js';
import { JKFlipFlopComponent } from '../components/gates/JKFlipFlopComponent.js';
import { TFlipFlopComponent } from '../components/gates/TFlipFlopComponent.js';
import { LatchComponent } from '../components/gates/LatchComponent.js';
// Chips
import { MultiplexerComponent } from '../components/chips/MultiplexerComponent.js';
import { DeMultiplexerComponent } from '../components/chips/DeMultiplexerComponent.js';
import { CounterComponent } from '../components/chips/CounterComponent.js';
import { RingCounterComponent } from '../components/chips/RingCounterComponent.js';
import { FullAdderComponent } from '../components/chips/FullAdderComponent.js';
import { HalfAdderComponent } from '../components/chips/HalfAdderComponent.js';
import { SevenSegComponent } from '../components/chips/SevenSegComponent.js';
import { SevenSegDecoderComponent } from '../components/chips/SevenSegDecoderComponent.js';
import { ADCComponent } from '../components/chips/ADCComponent.js';
import { DACComponent } from '../components/chips/DACComponent.js';
import { SRAMComponent } from '../components/chips/SRAMComponent.js';
import { PisoShiftComponent } from '../components/chips/PisoShiftComponent.js';
import { SipoShiftComponent } from '../components/chips/SipoShiftComponent.js';
import { MonostableComponent } from '../components/chips/MonostableComponent.js';
import { AnalogSwitchComponent } from '../components/chips/AnalogSwitchComponent.js';
import { AnalogSwitch2Component } from '../components/chips/AnalogSwitch2Component.js';
import { TriStateComponent } from '../components/chips/TriStateComponent.js';
// Composite
import { CustomLogicComponent } from '../components/composite/CustomLogicComponent.js';
import { CustomCompositeComponent } from '../components/composite/CustomCompositeComponent.js';
import { CustomCompositeChipComponent } from '../components/composite/CustomCompositeChipComponent.js';
// Electromechanical
import { LEDComponent } from '../components/electromechanical/LEDComponent.js';
import { LampComponent } from '../components/electromechanical/LampComponent.js';
import { TransformerComponent } from '../components/electromechanical/TransformerComponent.js';
import { TappedTransformerComponent } from '../components/electromechanical/TappedTransformerComponent.js';
import { CustomTransformerComponent } from '../components/electromechanical/CustomTransformerComponent.js';
import { TransLineComponent } from '../components/electromechanical/TransLineComponent.js';
import { RelayComponent } from '../components/electromechanical/RelayComponent.js';
import { TimeDelayRelayComponent } from '../components/electromechanical/TimeDelayRelayComponent.js';
import { DCMotorComponent } from '../components/electromechanical/DCMotorComponent.js';
import { CrystalComponent } from '../components/electromechanical/CrystalComponent.js';
import { LEDArrayComponent } from '../components/electromechanical/LEDArrayComponent.js';
import { SparkGapComponent } from '../components/electromechanical/SparkGapComponent.js';
// Sources
import { VCOComponent } from '../components/sources/VCOComponent.js';
import { SeqGenComponent } from '../components/sources/SeqGenComponent.js';
import { TimerComponent } from '../components/sources/TimerComponent.js';
import { CustomLogicModel } from '../components/composite/CustomLogicModel.js';
import { CustomCompositeModel } from '../components/composite/CustomCompositeModel.js';

export interface ParsedCircuit {
    header: CircuitHeader;
    components: CircuitComponent[];
    scopes?: ScopeData[];
    adjustables?: AdjustableData[];
    hints?: HintData;
}

export interface ScopePlotData {
    elmIndex: number;
    value: number;
    scale?: number;
    flags?: number;
    manualScale?: number;
    manualVPosition?: number;
}

export interface ScopeData {
    elmIndex: number;
    speed: number;
    value: number;
    flags: number;
    scaleV: number;
    scaleA: number;
    position: number;
    plotCount: number;
    plots: ScopePlotData[];
    text?: string;
}

export interface AdjustableData {
    elmIndex: number;
    editItem: number;
    minValue: number;
    maxValue: number;
    sliderText: string;
}

export interface HintData {
    hintType: number;
    hintItem1: number;
    hintItem2: number;
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
    // Passive
    r: ResistorComponent,
    c: CapacitorComponent,
    l: InductorComponent,
    w: WireComponent,
    C: PolarCapacitorComponent,
    // Switches
    s: SwitchComponent,
    S: SwitchComponent,
    SPST: SwitchComponent,
    SPDT: Switch2Component,
    p: PushSwitchComponent,
    MB: MBBSwitchComponent,
    Fuse: FuseComponent,
    b: BoxComponent,
    // Sources
    v: VoltageComponent,
    V: VoltageComponent,
    g: GroundComponent,
    R: RailComponent,
    VarRail: RailComponent,
    AOutput: VoltageComponent,
    i: CurrentComponent,
    ACurrent: CurrentComponent,
    // Active/Semiconductor
    diode: DiodeComponent,
    d: DiodeComponent,
    z: ZenerComponent,
    Zener: ZenerComponent,
    t: TransistorComponent,
    NTransistor: TransistorComponent,
    PTransistor: TransistorComponent,
    vc: VaractorComponent,
    td: TunnelDiodeComponent,
    TunnelDiode: TunnelDiodeComponent,
    f: MosfetComponent,
    Mosfet: MosfetComponent,
    NMosfet: MosfetComponent,
    PMosfet: MosfetComponent,
    j: JfetComponent,
    Jfet: JfetComponent,
    NJfet: JfetComponent,
    PJfet: JfetComponent,
    op: OpAmpComponent,
    OpAmp: OpAmpComponent,
    scr: SCRComponent,
    cc2: CCVSComponent,
    vccs: VCCSComponent,
    vcvs: VCVSComponent,
    cccs: CCCSComponent,
    ccvs: CCVSComponent,
    // Controlled sources
    VCCS: VCCSComponent,
    VCVS: VCVSComponent,
    CCCS: CCCSComponent,
    CCVS: CCVSComponent,
    // Digital gates
    AND: AndGateComponent,
    AndGate: AndGateComponent,
    ND: NandGateComponent,
    NandGate: NandGateComponent,
    OR: OrGateComponent,
    OrGate: OrGateComponent,
    NR: NorGateComponent,
    NorGate: NorGateComponent,
    XOR: XorGateComponent,
    XorGate: XorGateComponent,
    NOT: InverterComponent,
    Inverter: InverterComponent,
    li: LogicInputComponent,
    LogicInput: LogicInputComponent,
    lo: LogicOutputComponent,
    LogicOutput: LogicOutputComponent,
    D: DFlipFlopComponent,
    DFlipFlop: DFlipFlopComponent,
    JK: JKFlipFlopComponent,
    JKFlipFlop: JKFlipFlopComponent,
    T: TFlipFlopComponent,
    TFlipFlop: TFlipFlopComponent,
    latch: LatchComponent,
    Latch: LatchComponent,
    schmitt: SchmittComponent,
    invschmitt: InvertingSchmittComponent,
    // Chips
    mux: MultiplexerComponent,
    Multiplexer: MultiplexerComponent,
    dmux: DeMultiplexerComponent,
    DeMultiplexer: DeMultiplexerComponent,
    counter: CounterComponent,
    Counter: CounterComponent,
    ring: RingCounterComponent,
    RingCounter: RingCounterComponent,
    adder: FullAdderComponent,
    FullAdder: FullAdderComponent,
    halfadder: HalfAdderComponent,
    HalfAdder: HalfAdderComponent,
    '7seg': SevenSegComponent,
    SevenSeg: SevenSegComponent,
    '7segdec': SevenSegDecoderComponent,
    SevenSegDecoder: SevenSegDecoderComponent,
    adc: ADCComponent,
    dac: DACComponent,
    sram: SRAMComponent,
    piso: PisoShiftComponent,
    PisoShift: PisoShiftComponent,
    sipo: SipoShiftComponent,
    SipoShift: SipoShiftComponent,
    mono: MonostableComponent,
    Monostable: MonostableComponent,
    comp: AnalogSwitchComponent,
    AnalogSwitch: AnalogSwitchComponent,
    asw: AnalogSwitch2Component,
    AnalogSwitch2: AnalogSwitch2Component,
    ts: TriStateComponent,
    TriState: TriStateComponent,
    // Composite
    cl: CustomLogicComponent,
    CustomLogic: CustomLogicComponent,
    ccomp: CustomCompositeComponent,
    CustomComposite: CustomCompositeComponent,
    cchip: CustomCompositeChipComponent,
    // Electromechanical
    led: LEDComponent,
    LED: LEDComponent,
    ledarray: LEDArrayComponent,
    LEDArray: LEDArrayComponent,
    lamp: LampComponent,
    Lamp: LampComponent,
    spark: SparkGapComponent,
    SparkGap: SparkGapComponent,
    tform: TransformerComponent,
    Transformer: TransformerComponent,
    tform2: TappedTransformerComponent,
    TappedTransformer: TappedTransformerComponent,
    ctrans: CustomTransformerComponent,
    CustomTransformer: CustomTransformerComponent,
    tline: TransLineComponent,
    TransLine: TransLineComponent,
    relay: RelayComponent,
    Relay: RelayComponent,
    tdrelay: TimeDelayRelayComponent,
    TimeDelayRelay: TimeDelayRelayComponent,
    dcm: DCMotorComponent,
    DCMotor: DCMotorComponent,
    xtal: CrystalComponent,
    Crystal: CrystalComponent,
    // Sources (additional)
    Noise: NoiseComponent,
    Antenna: AntennaComponent,
    Sweep: SweepComponent,
    AM: AMComponent,
    FM: FMComponent,
    vco: VCOComponent,
    VCO: VCOComponent,
    seq: SeqGenComponent,
    SeqGen: SeqGenComponent,
    timer: TimerComponent,
    Timer: TimerComponent,
    VCOElm: VCOComponent,
    // Measurement
    text: TextElm,
    Text: TextElm,
    label: LabeledNodeElm,
    LabeledNode: LabeledNodeElm,
    probe: ProbeElm,
    Probe: ProbeElm,
    Ammeter: AmmeterElm,
    OhmMeter: OhmMeterElm,
    AudioOut: AudioOutputElm,
    AudioOutput: AudioOutputElm,
    TestPoint: TestPointElm,
    PhaseComp: PhaseCompElm,
    Recorder: DataRecorderElm,
    DataRecorder: DataRecorderElm,
    StopTrigger: StopTriggerElm,
    AudioIn: AudioInputElm,
    AudioInput: AudioInputElm,
    // Sensors & Special Devices (Module 8)
    pot: PotComponent,
    Pot: PotComponent,
    therm: ThermistorComponent,
    Thermistor: ThermistorComponent,
    ldr: LDRComponent,
    LDR: LDRComponent,
    mem: MemristorComponent,
    Memristor: MemristorComponent,
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
        const scopes: ScopeData[] = [];
        const adjustables: AdjustableData[] = [];
        let hints: HintData | undefined;

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

            if (typeToken === '!' || typeToken === '.' || typeToken === '34' || typeToken === '32') {
                // Model definition lines
                if (typeToken === '!') CustomLogicModel.undumpModel(tokens, 1);
                else if (typeToken === '.') CustomCompositeModel.undumpModel(tokens, 1);
                else if (typeToken === '34') DiodeModel.undumpModel(tokens, 1);
                else if (typeToken === '32') TransistorModel.undumpModel(tokens, 1);
                continue;
            }

            // Scope line
            if (typeToken === 'o') {
                const scope = Serializer.parseScopeLine(tokens);
                if (scope) scopes.push(scope);
                continue;
            }

            // Adjustable slider line
            if (typeToken === '38') {
                const adj = Serializer.parseAdjustableLine(tokens);
                if (adj) adjustables.push(adj);
                continue;
            }

            // Hint line
            if (typeToken === 'h' && tokens.length >= 4) {
                hints = {
                    hintType: parseInt(tokens[1]) || 0,
                    hintItem1: parseInt(tokens[2]) || 0,
                    hintItem2: parseInt(tokens[3]) || 0,
                };
                continue;
            }

            const typeCode: number | string = typeToken.length === 1
                ? typeToken.charCodeAt(0)
                : (isNaN(parseInt(typeToken)) ? typeToken : parseInt(typeToken));

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

        return { header, components, scopes, adjustables, hints };
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

        // Strip <o>...</o> scope blocks before matching components to avoid false
        // matches on nested <p> plot tags which share the PushSwitch tag name.
        const xmlForComponents = xml.replace(/<o\b[^>]*>[\s\S]*?<\/o>/g, '');

        // Find all self-closing tags like <name ... />
        const compRegex = /<(\w+)\s+([^>]*?)\/>/g;
        let match: RegExpExecArray | null;
        while ((match = compRegex.exec(xmlForComponents)) !== null) {
            const tagName = match[1];
            const attrs = Serializer.parseXmlAttrs(match[2]);

            const ctor = XML_TAG_CLASS[tagName];
            if (!ctor) continue;

            // Require coordinate data — <p> plot tags inside <o> scope blocks have no 'x'
            if (!attrs.x) continue;

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
                case 'C':
                    if (attrs.c) (comp as CapacitorComponent).capacitance = parseFloat(attrs.c);
                    break;
                case 'l':
                    if (attrs.l) (comp as InductorComponent).inductance = parseFloat(attrs.l);
                    break;
                case 's':
                    if (attrs.p) (comp as SwitchComponent).position = parseInt(attrs.p);
                    break;
                case 'S':
                case 'SPST':
                    if (attrs.li) (comp as SwitchComponent).position = parseInt(attrs.li);
                    break;
                case 'SPDT':
                    if (attrs.li) (comp as Switch2Component).position = parseInt(attrs.li);
                    break;
                case 'v':
                case 'V':
                    if (attrs.wf) (comp as VoltageComponent).waveform = parseInt(attrs.wf);
                    if (attrs.fr) (comp as VoltageComponent).frequency = parseFloat(attrs.fr);
                    if (attrs.maxv) (comp as VoltageComponent).maxVoltage = parseFloat(attrs.maxv);
                    if (attrs.bias) (comp as VoltageComponent).bias = parseFloat(attrs.bias);
                    if (attrs.ph) (comp as VoltageComponent).phaseShift = parseFloat(attrs.ph);
                    if (attrs.dc) (comp as VoltageComponent).dutyCycle = parseFloat(attrs.dc);
                    break;
                case 'VarRail':
                case 'R':
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
                case 'z':
                case 'Zener':
                    if (attrs.is) (comp as ZenerComponent).model.saturationCurrent = parseFloat(attrs.is);
                    if (attrs.n) (comp as ZenerComponent).model.emissionCoefficient = parseFloat(attrs.n);
                    break;
                case 't':
                case 'NTransistor':
                    (comp as TransistorComponent).pnp = 1;
                    if (attrs.beta) (comp as TransistorComponent).beta = parseFloat(attrs.beta);
                    break;
                case 'PTransistor':
                    (comp as TransistorComponent).pnp = -1;
                    if (attrs.beta) (comp as TransistorComponent).beta = parseFloat(attrs.beta);
                    break;
                case 'f':
                case 'Mosfet':
                    if (attrs.pnp) (comp as MosfetComponent).pnp = parseInt(attrs.pnp);
                    if (attrs.thresh) (comp as MosfetComponent).thresholdVoltage = parseFloat(attrs.thresh);
                    break;
                case 'j':
                case 'Jfet':
                    if (attrs.pnp) (comp as JfetComponent).pnp = parseInt(attrs.pnp);
                    break;
                case 'op':
                case 'OpAmp':
                    if (attrs.gain) (comp as OpAmpComponent).gain = parseFloat(attrs.gain);
                    break;
                case 'pot':
                case 'Pot':
                    if (attrs.max) (comp as PotComponent).maxResistance = parseFloat(attrs.max);
                    if (attrs.p) (comp as PotComponent).position = parseFloat(attrs.p);
                    break;
                case 'Noise':
                    if (attrs.maxv) (comp as NoiseComponent).maxVoltage = parseFloat(attrs.maxv);
                    break;
                case 'Fuse':
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

    /** Parse a scope line ("o ...") into ScopeData */
    private static parseScopeLine(tokens: string[]): ScopeData | null {
        // o <elmIndex> <speed> <value> <flags> <scaleV> <scaleA> <position> <plotCount> [plots...]
        // Java dump format per plot (i=0..plotCount-1):
        //   if FLAG_PERPLOTFLAGS (4096):  hexPlotFlags
        //   if i > 0:                     elmIndex value
        //   if units > UNITS_A (2):       scaleFactor
        //   if manual scale:              manScale manVPos
        // Then optional escaped text.
        if (tokens.length < 9) return null;
        const n = (s: string) => { const v = parseInt(s); return isNaN(v) ? 0 : v; };
        const f = (s: string) => { const v = parseFloat(s); return isNaN(v) ? 1 : v; };
        const elmIndex = isNaN(parseInt(tokens[1])) ? -1 : parseInt(tokens[1]);
        const speed = n(tokens[2]);
        const value = n(tokens[3]);
        const flags = n(tokens[4]);
        const scaleV = f(tokens[5]);
        const scaleA = f(tokens[6]);
        const position = n(tokens[7]);
        const plotCount = n(tokens[8]);

        const hasPerPlotFlags = (flags & 4096) !== 0; // FLAG_PERPLOTFLAGS
        const isManual = (flags & 2) !== 0; // approximate; Java has isManualScale() method

        const plots: ScopePlotData[] = [];
        let idx = 9;
        for (let i = 0; i < plotCount && idx < tokens.length; i++) {
            // Per-plot hex flags (if FLAG_PERPLOTFLAGS)
            let plotFlags = 0;
            if (hasPerPlotFlags && idx < tokens.length) {
                plotFlags = parseInt(tokens[idx++], 16) || 0;
            }

            let pElmIdx = -1;
            let pValue = 0;
            if (i > 0) {
                // Additional plots: elmIndex + value
                if (idx + 1 >= tokens.length) break;
                pElmIdx = n(tokens[idx++]);
                pValue = n(tokens[idx++]);
            } else {
                // First plot's elmIndex/value come from the main header fields
                pElmIdx = elmIndex;
                pValue = value;
            }

            // Optional scale factor (if units > UNITS_A, i.e., not V or A)
            let pScale: number | undefined;
            if (idx < tokens.length && tokens[idx] !== 'manScale' && isNaN(parseInt(tokens[idx]))) {
                // Non-numeric token after plot data → must be a scale factor or text
                const sc = parseFloat(tokens[idx]);
                if (!isNaN(sc)) {
                    pScale = sc;
                    idx++;
                }
            }

            // Optional manual scale (manScale + manVPos)
            if (idx + 1 < tokens.length && tokens[idx] === 'manScale') {
                idx++; // skip 'manScale' marker
                // In Java, manScale is stored per-plot; read the next two tokens
                const manScale = parseFloat(tokens[idx++]) || 1;
                const manVPos = parseFloat(tokens[idx++]) || 0;
                // Store in plot flags for round-trip
                plotFlags |= 0x40000000;
                plotFlags |= (Math.round(manScale * 100) & 0x3FF) << 10;
                plotFlags |= (Math.round(manVPos * 100) & 0x3FF);
            }

            if (i === 0) {
                plots.push({ elmIndex: pElmIdx, value: pValue, flags: plotFlags, scale: pScale });
            } else {
                plots.push({ elmIndex: pElmIdx, value: pValue, scale: pScale, flags: plotFlags });
            }
        }

        // Remaining tokens (if any) form escaped text
        let text: string | undefined;
        if (idx < tokens.length) {
            text = unescape(tokens.slice(idx).join(' '));
        }

        return { elmIndex, speed, value, flags, scaleV, scaleA, position, plotCount, plots, text };
    }

    /** Parse an adjustable slider line ("38 ...") into AdjustableData */
    private static parseAdjustableLine(tokens: string[]): AdjustableData | null {
        // 38 <elmIndex> <editItem> <minValue> <maxValue> <escapedSliderText>
        if (tokens.length < 6) return null;
        const n = (s: string) => parseInt(s);
        const f = (s: string) => parseFloat(s);
        const elmIndex = isNaN(n(tokens[1])) ? 0 : n(tokens[1]);
        const editItem = isNaN(n(tokens[2])) ? 0 : n(tokens[2]);
        const minValue = isNaN(f(tokens[3])) ? 0 : f(tokens[3]);
        const maxValue = isNaN(f(tokens[4])) ? 1 : f(tokens[4]);
        const sliderText = unescape(tokens.slice(5).join(' '));
        return { elmIndex, editItem, minValue, maxValue, sliderText };
    }

    /** Format scope data as a "o" line */
    static formatScopeLine(scope: ScopeData): string {
        let s = `o ${scope.elmIndex} ${scope.speed} ${scope.value} ${scope.flags} ${scope.scaleV} ${scope.scaleA} ${scope.position} ${scope.plotCount}`;
        for (let i = 0; i < scope.plots.length; i++) {
            const p = scope.plots[i];
            if (i === 0) continue; // first plot flags are in main flags
            s += ` ${p.elmIndex} ${p.value}`;
            if (p.scale !== undefined) s += ` ${p.scale}`;
        }
        return s;
    }

    /** Format adjustable data as a "38" line */
    static formatAdjustableLine(adj: AdjustableData): string {
        return `38 ${adj.elmIndex} ${adj.editItem} ${adj.minValue} ${adj.maxValue} ${adj.sliderText}`;
    }

    static dumpCircuit(
        sim: SimulationManager,
        scopes?: ScopeData[],
        adjustables?: AdjustableData[],
        hints?: HintData,
    ): string {
        const h = sim.config;
        const flags = 1;
        const iterCount = 10;
        const currentBar = 50;
        const powerBar = 50;

        // Reset model dumped flags so each model is emitted once
        DiodeModel.clearDumpedFlags();
        TransistorModel.clearDumpedFlags();
        CustomLogicModel.clearDumpedFlags();
        CustomCompositeModel.clearDumpedFlags();

        let out = `$ ${flags} ${h.maxTimeStep} ${iterCount} ${currentBar} ${h.voltageRange} ${powerBar} ${h.minTimeStep}\n`;

        for (const c of sim.components) {
            const modelData = c.dumpModel();
            if (modelData) out += modelData + '\n';
            out += c.dump() + '\n';
        }

        // Scope lines
        if (scopes) {
            for (const scope of scopes) {
                out += Serializer.formatScopeLine(scope) + '\n';
            }
        }

        // Adjustable slider lines
        if (adjustables) {
            for (const adj of adjustables) {
                out += Serializer.formatAdjustableLine(adj) + '\n';
            }
        }

        // Hint line
        if (hints) {
            out += `h ${hints.hintType} ${hints.hintItem1} ${hints.hintItem2}\n`;
        }

        return out.trimEnd();
    }
}
