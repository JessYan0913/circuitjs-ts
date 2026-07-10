// ============================================================
// CircuitJS Next — Core Type Definitions
// ============================================================

// ---------- Simulation Configuration ----------

export interface SimulationConfig {
    maxTimeStep: number;
    minTimeStep: number;
    timeStep: number;
    timeStepAccum: number;
    timeStepCount: number;
    adjustTimeStep: boolean;
    speedBar: number;
    currentBar: number;
    powerBar: number;
    voltageRange: number;
    integrationMethod: 'trapezoidal' | 'backwardEuler';
}

// ---------- Circuit Nodes ----------

export interface CircuitNode {
    id: number;
    links: CircuitNodeLink[];
    internal: boolean;
    voltage: number;
}

export interface CircuitNodeLink {
    nodeId: number;
    componentId: number;
    terminalIndex: number;
}

// ---------- Row Info ----------

export enum RowType {
    ROW_NORMAL = 0,
    ROW_CONST  = 1,
}

export interface RowInfo {
    type: RowType;
    value: number;
    dropRow: boolean;
    rsChanges: boolean;
    lsChanges: boolean;
    mapRow: number;
    mapCol: number;
}

// ---------- Stamp Context ----------

export interface StampContext {
    stampMatrix(row: number, col: number, value: number): void;
    stampRightSide(row: number, value: number): void;
    stampResistor(n1: number, n2: number, resistance: number): void;
    stampConductance(n1: number, n2: number, conductance: number): void;
    stampVoltageSource(n1: number, n2: number, vsIndex: number, voltage?: number): void;
    stampCurrentSource(n1: number, n2: number, current: number): void;
    stampCCCS(n1: number, n2: number, vsIndex: number, gain: number): void;
    stampVCCurrentSource(cn1: number, cn2: number, vn1: number, vn2: number, g: number): void;
    stampNonLinear(row: number): void;
    updateVoltageSource(n1: number, n2: number, vsIndex: number, voltage: number): void;
    markRightSideChanging(row: number): void;
    setConverged(value: boolean): void;
    timeStep: number;
    converged: boolean;
    integrationMethod: 'trapezoidal' | 'backwardEuler';
}

// ---------- Component Interface ----------

export interface EditInfo {
    name: string;
    value?: number;
    text?: string;
    min?: number;
    max?: number;
    choices?: string[];
    selectedIndex?: number;
    checkbox?: boolean;
    checkboxState?: boolean;
    button?: string;
    newDialog?: boolean;
    dimensionless?: boolean;
    noSliders?: boolean;
}

export interface ComponentState {
    id: number;
    type: string;
    x: number;
    y: number;
    x2: number;
    y2: number;
    flags: number;
    nodes: Int32Array;
    volts: Float64Array;
    current: number;
    selected: boolean;
}

// ---------- Scope ----------

export interface ScopePlotConfig {
    componentId: number;
    valueType: number;
    color: string;
    scale: number;
    offset: number;
    maxValues: Float64Array;
    minValues: Float64Array;
    ptr: number;
    acCoupled: boolean;
}

export interface ScopeConfig {
    position: number;
    speed: number;
    elmId: number;
    plots: ScopePlotConfig[];
    rect: Rect;
    stackCount: number;
    showMax: boolean;
    showMin: boolean;
    showFreq: boolean;
    showFFT: boolean;
    showRMS: boolean;
    showScale: boolean;
    logSpectrum: boolean;
}

// ---------- Geometry ----------

export interface Point {
    x: number;
    y: number;
}

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

// ---------- Simulation State ----------

export interface SimulationState {
    t: number;
    timeStep: number;
    timeStepCount: number;
    nodeCount: number;
    running: boolean;
    nodeVoltages: Float64Array;
    components: ComponentState[];
    scopes: ScopeConfig[];
}

// ---------- Mouse / Interaction ----------

export enum MouseMode {
    SELECT = 'select',
    ADD_ELM = 'add_elm',
    DRAG_ALL = 'drag_all',
    DRAG_ROW = 'drag_row',
    DRAG_COLUMN = 'drag_column',
    DRAG_SELECTED = 'drag_selected',
    DRAG_POST = 'drag_post',
    DRAG_SPLITTER = 'drag_splitter',
}

// ---------- Graphics ----------

export interface ColorObj {
    r: number;
    g: number;
    b: number;
    a?: number;
}

/** Matches the Java Graphics wrapper API for direct porting */
export interface Graphics {
    setColor(color: string | ColorObj): void;
    setLineWidth(w: number): void;
    drawLine(x1: number, y1: number, x2: number, y2: number): void;
    /** Thick line (3px) — matches Java Graphics.drawThickLine */
    drawThickLine(x1: number, y1: number, x2: number, y2: number): void;
    /** Thick circle (3px) — matches Java Graphics.drawThickCircle */
    drawThickCircle(cx: number, cy: number, r: number): void;
    /** Draw inductor coil zigzag path */
    drawCoil(x1: number, y1: number, x2: number, y2: number, segments: number, color: string | ColorObj): void;
    drawPolyline(xPoints: number[], yPoints: number[], n: number): void;
    drawPolygon(xPoints: number[], yPoints: number[], n: number): void;
    fillPolygon(xPoints: number[], yPoints: number[], n: number): void;
    /** x,y = top-left corner, w,h = bounding box (AWT convention) */
    drawOval(x: number, y: number, w: number, h: number): void;
    fillOval(x: number, y: number, w: number, h: number): void;
    /** Stroked rectangle (Java Graphics.drawRect) */
    drawRect(x: number, y: number, w: number, h: number): void;
    drawRoundRect(x: number, y: number, w: number, h: number, arc: number): void;
    fillRoundRect(x: number, y: number, w: number, h: number, arc: number): void;
    fillRect(x: number, y: number, w: number, h: number): void;
    drawString(s: string, x: number, y: number): void;
    setFontSize(px: number): void;
    setFont(font: string, size: number): void;
    measureWidth(s: string): number;
    textAlign(align: 'left' | 'center' | 'right'): void;
    textBaseline(baseline: 'top' | 'middle' | 'bottom'): void;
    getColor(): string;
    /** Set clipping rectangle (Java Graphics.clipRect) */
    clipRect(x: number, y: number, w: number, h: number): void;
    /** Set clipping rectangle (AWT convention: setClip(x, y, w, h)) */
    setClip(x: number, y: number, w: number, h: number): void;
    save(): void;
    restore(): void;
    getContext(): CanvasRenderingContext2D;
}

// ---------- Polygon ----------

/** Polygon data class — matches java.awt.Polygon shape */
export interface Polygon {
    npoints: number;
    xpoints: number[];
    ypoints: number[];
    boundingBox?: Rect;
}

// ---------- Adjustable ----------

/** Adjustable interface — for components with slider-bound parameters */
export interface Adjustable {
    /** Get the current slider value (0.0–1.0) */
    getSliderValue(): number;
    /** Set the slider value */
    setSliderValue(val: number): void;
}

// ---------- Analysis ----------

export interface TransientResult {
    time: Float64Array;
    nodeVoltages: Float64Array[];
    componentCurrents: Record<number, Float64Array>;
}

export interface DCOpPoint {
    nodeVoltages: number[];
    componentCurrents: Record<number, number>;
}
