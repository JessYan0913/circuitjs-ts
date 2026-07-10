import { create } from 'zustand';
import type { SimulationManager, CircuitComponent } from '@circuitjs/core';
import type { RenderTransform } from '../canvas/CircuitRenderer';
import type { CircuitStore } from './types';
import { triggerAutoCenter } from './types';

const defaultTransform: RenderTransform = { ox: 0, oy: 0, scale: 1 };

export const useCircuitStore = create<CircuitStore>((set) => ({
    simManager: null,
    running: false,
    time: 0,
    components: [],
    transform: defaultTransform,
    showCurrent: true,
    showVoltageLabels: false,

    setSimManager: (mgr) => set({ simManager: mgr }),
    setRunning: (running) => set({ running }),
    setTime: (time) => set({ time }),
    setComponents: (comps) => set({ components: comps }),
    setTransform: (t) => set({ transform: t }),
    setShowCurrent: (v) => set({ showCurrent: v }),
    autoCenter: () => { triggerAutoCenter(); },
}));
