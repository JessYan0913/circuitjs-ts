import React, { useCallback, useMemo, useState } from 'react';
import type { ScopeConfig } from '@circuitjs/shared';
import { Modal } from './Modal.js';
import { useCircuitStore } from '../store/circuitStore.js';

export interface ScopeConfigDialogProps {
    scopeIndex: number;
    onClose: () => void;
}

export function ScopeConfigDialog({ scopeIndex, onClose }: ScopeConfigDialogProps) {
    const scopes = useCircuitStore((s) => s.scopes);
    const components = useCircuitStore((s) => s.components);
    const setScopes = useCircuitStore((s) => s.setScopes);

    const scope = scopes[scopeIndex];
    if (!scope) return null;

    // Local state for settings
    const [speed, setSpeed] = useState(scope.speed);
    const [plotBindings, setPlotBindings] = useState(
        scope.plots.map((p) => ({
            componentId: p.componentId,
            scale: p.scale,
            offset: p.offset,
        })),
    );
    const [showMax, setShowMax] = useState(scope.showMax);
    const [showMin, setShowMin] = useState(scope.showMin);
    const [showFreq, setShowFreq] = useState(scope.showFreq);
    const [showFFT, setShowFFT] = useState(scope.showFFT);
    const [showRMS, setShowRMS] = useState(scope.showRMS);
    const [showScale, setShowScale] = useState(scope.showScale);
    const [logSpectrum, setLogSpectrum] = useState(scope.logSpectrum);

    // Available components for binding
    const availableComponents = useMemo(() => {
        return components.filter((c) => c.volts.length > 0);
    }, [components]);

    const handleApply = useCallback(() => {
        const updated = [...scopes];
        const s: ScopeConfig = {
            ...scope,
            speed,
            showMax,
            showMin,
            showFreq,
            showFFT,
            showRMS,
            showScale,
            logSpectrum,
            plots: scope.plots.map((p, i) => ({
                ...p,
                componentId: plotBindings[i]?.componentId ?? p.componentId,
                scale: plotBindings[i]?.scale ?? p.scale,
                offset: plotBindings[i]?.offset ?? p.offset,
            })),
        };
        updated[scopeIndex] = s;
        setScopes(updated);
    }, [scopes, scopeIndex, scope, speed, showMax, showMin, showFreq, showFFT, showRMS, showScale, logSpectrum, plotBindings, setScopes]);

    const handleOk = useCallback(() => {
        handleApply();
        onClose();
    }, [handleApply, onClose]);

    const updatePlotBinding = useCallback((plotIdx: number, field: string, value: number) => {
        setPlotBindings((prev) => {
            const next = [...prev];
            next[plotIdx] = { ...next[plotIdx], [field]: value };
            return next;
        });
    }, []);

    return (
        <Modal title={`Scope ${scopeIndex + 1} Configuration`} onClose={onClose} width={420}>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Timebase speed */}
                <div>
                    <div style={{ color: '#CCC', marginBottom: '4px' }}>Timebase Speed</div>
                    <input
                        type="range"
                        min={1}
                        max={512}
                        value={speed}
                        onChange={(e) => setSpeed(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: '#2980b9' }}
                    />
                    <span style={{ color: '#888', fontSize: '10px' }}>{speed}</span>
                </div>

                {/* Plot bindings */}
                {plotBindings.map((binding, i) => (
                    <div key={i} style={{ padding: '8px', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
                        <div style={{ color: '#CCC', marginBottom: '6px' }}>Channel {i + 1}</div>

                        <div style={{ marginBottom: '6px' }}>
                            <div style={{ color: '#888', fontSize: '10px', marginBottom: '2px' }}>Component</div>
                            <select
                                value={binding.componentId}
                                onChange={(e) => updatePlotBinding(i, 'componentId', parseInt(e.target.value))}
                                style={selectStyle}
                            >
                                <option value={-1}>— None —</option>
                                {availableComponents.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.constructor.name.replace(/Component$/, '')} (#{c.id})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#888', fontSize: '10px', marginBottom: '2px' }}>Y Scale (V/div)</div>
                                <input
                                    type="number"
                                    value={binding.scale}
                                    onChange={(e) => updatePlotBinding(i, 'scale', parseFloat(e.target.value) || 1)}
                                    style={inputStyle}
                                    min={0.1}
                                    step={0.1}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#888', fontSize: '10px', marginBottom: '2px' }}>Y Offset</div>
                                <input
                                    type="number"
                                    value={binding.offset}
                                    onChange={(e) => updatePlotBinding(i, 'offset', parseFloat(e.target.value) || 0)}
                                    style={inputStyle}
                                    step={0.1}
                                />
                            </div>
                        </div>
                    </div>
                ))}

                {/* Display options */}
                <div style={{ padding: '8px', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
                    <div style={{ color: '#CCC', marginBottom: '6px' }}>Display Options</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                        {[
                            { label: 'Show Max', value: showMax, set: setShowMax },
                            { label: 'Show Min', value: showMin, set: setShowMin },
                            { label: 'Show Freq', value: showFreq, set: setShowFreq },
                            { label: 'Show FFT', value: showFFT, set: setShowFFT },
                            { label: 'Show RMS', value: showRMS, set: setShowRMS },
                            { label: 'Show Scale', value: showScale, set: setShowScale },
                            { label: 'Log Spectrum', value: logSpectrum, set: setLogSpectrum },
                        ].map((opt) => (
                            <label key={opt.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#CCC', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={opt.value}
                                    onChange={(e) => opt.set(e.target.checked)}
                                    style={{ accentColor: '#2980b9' }}
                                />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                    <button onClick={handleApply} style={btnStyle}>Apply</button>
                    <button onClick={handleOk} style={primaryBtnStyle}>OK</button>
                    <button onClick={onClose} style={btnStyle}>Cancel</button>
                </div>
            </div>
        </Modal>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '4px 6px',
    backgroundColor: '#111',
    color: '#FFF',
    border: '1px solid #555',
    borderRadius: '3px',
    fontFamily: 'monospace',
    fontSize: '11px',
    boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
};

const btnStyle: React.CSSProperties = {
    padding: '6px 16px',
    backgroundColor: '#333',
    color: '#FFF',
    border: '1px solid #555',
    borderRadius: '3px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '12px',
};

const primaryBtnStyle: React.CSSProperties = {
    ...btnStyle,
    backgroundColor: '#1a5276',
    borderColor: '#2980b9',
};
