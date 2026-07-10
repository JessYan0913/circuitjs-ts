import type { SimulationManager, CircuitComponent } from '@circuitjs/core';
import type { ScopeConfig } from '@circuitjs/shared';
import type { CircuitRenderer, RenderTransform } from '../canvas/CircuitRenderer.js';

export interface CircuitStore {
    // Simulation
    simManager: SimulationManager | null;
    running: boolean;
    time: number;

    // Components
    components: CircuitComponent[];

    // Rendering
    transform: RenderTransform;
    showCurrent: boolean;
    showVoltageLabels: boolean;

    // Display options
    showValues: boolean;
    smallGrid: boolean;
    euroResistors: boolean;

    // UI panels
    showSliders: boolean;

    // Undo state (for menu enable/disable)
    canUndo: boolean;
    canRedo: boolean;

    // Slider components (components implementing Adjustable)
    sliderComponents: Array<{ id: number; name: string; value: number }>;

    // Scopes
    scopes: ScopeConfig[];

    // Actions
    setSimManager: (mgr: SimulationManager | null) => void;
    setRunning: (running: boolean) => void;
    setTime: (time: number) => void;
    setComponents: (comps: CircuitComponent[]) => void;
    setTransform: (t: RenderTransform) => void;
    setShowCurrent: (v: boolean) => void;
    setShowVoltageLabels: (v: boolean) => void;
    setShowValues: (v: boolean) => void;
    setSmallGrid: (v: boolean) => void;
    setEuroResistors: (v: boolean) => void;
    setShowSliders: (v: boolean) => void;
    setCanUndo: (v: boolean) => void;
    setCanRedo: (v: boolean) => void;
    setSliderComponents: (components: Array<{ id: number; name: string; value: number }>) => void;
    setScopes: (scopes: ScopeConfig[]) => void;
    autoCenter: () => void;
}

/** Module-level renderer reference for auto-centering */
let _renderer: CircuitRenderer | null = null;
let _canvasWidth = 800;
let _canvasHeight = 600;

export function setRendererRef(r: CircuitRenderer | null): void {
    _renderer = r;
}

export function setCanvasSize(w: number, h: number): void {
    _canvasWidth = w;
    _canvasHeight = h;
}

export function triggerAutoCenter(): void {
    if (_renderer) {
        _renderer.autoCenter(_canvasWidth, _canvasHeight);
    }
}
