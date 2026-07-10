import React, { useCallback, useMemo } from 'react';
import type { Adjustable } from '@circuitjs/shared';
import { useCircuitStore } from '../store/circuitStore.js';

const panelStyle: React.CSSProperties = {
    width: '180px',
    backgroundColor: '#1a1a1a',
    borderLeft: '1px solid #333',
    padding: '8px',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
};

const sliderGroupStyle: React.CSSProperties = {
    marginBottom: '4px',
};

const sliderLabelStyle: React.CSSProperties = {
    color: '#CCC',
    fontFamily: 'monospace',
    fontSize: '11px',
    marginBottom: '4px',
    userSelect: 'none',
};

const sliderValueStyle: React.CSSProperties = {
    color: '#888',
    fontFamily: 'monospace',
    fontSize: '10px',
    marginLeft: '4px',
};

const sliderInputStyle: React.CSSProperties = {
    width: '100%',
    accentColor: '#2980b9',
};

export function SliderPanel() {
    const components = useCircuitStore((s) => s.components);
    const simManager = useCircuitStore((s) => s.simManager);
    const showSliders = useCircuitStore((s) => s.showSliders);

    // Find components implementing Adjustable
    const adjustableComponents = useMemo(() => {
        const result: Array<{ component: Adjustable & { id: number }; label: string }> = [];
        for (const c of components) {
            if (typeof (c as any).getSliderValue === 'function' &&
                typeof (c as any).setSliderValue === 'function') {
                // Get a label from the component
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
        // Trigger re-analysis
        if (simManager) {
            simManager.analyzeCircuit();
        }
    }, [simManager]);

    if (!showSliders || adjustableComponents.length === 0) return null;

    return (
        <div style={panelStyle}>
            <div style={{ color: '#888', fontFamily: 'monospace', fontSize: '11px', marginBottom: '4px', userSelect: 'none' }}>
                Sliders
            </div>
            {adjustableComponents.map(({ component, label }) => {
                const value = component.getSliderValue();
                return (
                    <div key={component.id} style={sliderGroupStyle}>
                        <div style={sliderLabelStyle}>
                            {label}
                            <span style={sliderValueStyle}>
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
                            style={sliderInputStyle}
                        />
                    </div>
                );
            })}
        </div>
    );
}
