import { create } from 'zustand';
import type { SimulationManager, CircuitComponent } from '@circuitjs/core';
import type { ScopeConfig } from '@circuitjs/shared';
import type { RenderTransform } from '../canvas/CircuitRenderer';
import type { CircuitStore } from './types';
import { triggerAutoCenter } from './types';

const defaultTransform: RenderTransform = { ox: 0, oy: 0, scale: 1 };

// Load persisted options from localStorage
function loadOptions(): Partial<CircuitStore> {
    try {
        const raw = localStorage.getItem('CircuitJSOptions');
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                showCurrent: parsed.showCurrent ?? true,
                showVoltageLabels: parsed.showVoltageLabels ?? false,
                showValues: parsed.showValues ?? true,
                smallGrid: parsed.smallGrid ?? false,
                euroResistors: parsed.euroResistors ?? false,
            };
        }
    } catch {
        // ignore parse errors
    }
    return {};
}

// Save relevant options to localStorage
function saveOptions(state: CircuitStore) {
    try {
        localStorage.setItem('CircuitJSOptions', JSON.stringify({
            showCurrent: state.showCurrent,
            showVoltageLabels: state.showVoltageLabels,
            showValues: state.showValues,
            smallGrid: state.smallGrid,
            euroResistors: state.euroResistors,
        }));
    } catch {
        // ignore storage errors
    }
}

const initialOptions = loadOptions();

export const useCircuitStore = create<CircuitStore>((set, get) => ({
    simManager: null,
    running: false,
    time: 0,
    components: [],
    transform: defaultTransform,
    showCurrent: initialOptions.showCurrent ?? true,
    showVoltageLabels: initialOptions.showVoltageLabels ?? false,
    showValues: initialOptions.showValues ?? true,
    smallGrid: initialOptions.smallGrid ?? false,
    euroResistors: initialOptions.euroResistors ?? false,
    showSliders: false,
    canUndo: false,
    canRedo: false,
    sliderComponents: [],
    scopes: [],

    setSimManager: (mgr) => set({ simManager: mgr }),
    setRunning: (running) => set({ running }),
    setTime: (time) => set({ time }),
    setComponents: (comps) => set({ components: comps }),
    setTransform: (t) => set({ transform: t }),
    setShowCurrent: (v) => { set({ showCurrent: v }); saveOptions(get()); },
    setShowVoltageLabels: (v) => { set({ showVoltageLabels: v }); saveOptions(get()); },
    setShowValues: (v) => { set({ showValues: v }); saveOptions(get()); },
    setSmallGrid: (v) => { set({ smallGrid: v }); saveOptions(get()); },
    setEuroResistors: (v) => { set({ euroResistors: v }); saveOptions(get()); },
    setShowSliders: (v) => set({ showSliders: v }),
    setCanUndo: (v) => set({ canUndo: v }),
    setCanRedo: (v) => set({ canRedo: v }),
    setSliderComponents: (v) => set({ sliderComponents: v }),
    setScopes: (v) => set({ scopes: v }),
    autoCenter: () => { triggerAutoCenter(); },
}));
