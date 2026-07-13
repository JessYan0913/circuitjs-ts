import React, { useCallback, useMemo } from 'react';
import type { Adjustable } from '@circuitjs/shared';
import { useCircuitStore } from '../store/circuitStore.js';

export function SliderPanel() {
    const components = useCircuitStore((s) => s.components);
    const simManager = useCircuitStore((s) => s.simManager);
    const showSliders = useCircuitStore((s) => s.showSliders);

    const adjustableComponents = useMemo(() => {
        const result: Array<{ component: Adjustable & { id: number }; label: string }> = [];
        for (const c of components) {
            if (typeof (c as any).getSliderValue === 'function' &&
                typeof (c as any).setSliderValue === 'function') {
                const info = c.getEditInfo(0);
                const label = info?.name ?? c.constructor.name.replace(/Component$/, '');
                result.push({
                    component: c as unknown as Adjustable & { id: number },
                    label,
                });
            }
        }
        return result;
    }, [components]);

    const handleSliderChange = useCallback((component: Adjustable & { id: number }, value: number) => {
        component.setSliderValue(value);
        if (simManager) {
            simManager.analyzeCircuit();
        }
    }, [simManager]);

    if (!showSliders || adjustableComponents.length === 0) return null;

    return (
        <div className="w-[180px] bg-circuit-bg-secondary border-l border-circuit-border p-2 overflow-auto flex flex-col gap-3 shrink-0">
            <div className="text-circuit-text-muted font-mono text-circuit-sm mb-1 select-none">
                Sliders
            </div>
            {adjustableComponents.map(({ component, label }) => {
                const value = component.getSliderValue();
                return (
                    <div key={component.id} className="mb-1">
                        <div className="text-circuit-text-secondary font-mono text-circuit-sm mb-1 select-none">
                            {label}
                            <span className="text-circuit-text-muted font-mono text-circuit-xs ml-1">
                                {Math.round(value * 100)}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={value}
                            onChange={(e) => handleSliderChange(component, parseFloat(e.target.value))}
                            className="w-full accent-circuit-accent"
                        />
                    </div>
                );
            })}
        </div>
    );
}
