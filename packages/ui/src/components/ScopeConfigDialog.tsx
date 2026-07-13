import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ScopeConfig } from '@circuitjs/shared';
import { Modal } from './Modal.js';
import { useCircuitStore } from '../store/circuitStore.js';

export interface ScopeConfigDialogProps {
    scopeIndex: number;
    onClose: () => void;
}

export function ScopeConfigDialog({ scopeIndex, onClose }: ScopeConfigDialogProps) {
    const { t } = useTranslation();
    const scopes = useCircuitStore((s) => s.scopes);
    const components = useCircuitStore((s) => s.components);
    const setScopes = useCircuitStore((s) => s.setScopes);

    const scope = scopes[scopeIndex];
    if (!scope) return null;

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
        <Modal title={t('dialog.scopeConfig.title', { index: scopeIndex + 1 })} onClose={onClose} width={420}>
            <div className="font-mono text-circuit-base flex flex-col gap-3">
                {/* Timebase speed */}
                <div>
                    <div className="text-circuit-text-secondary mb-1">{t('dialog.scopeConfig.timebaseSpeed')}</div>
                    <input
                        type="range"
                        min={1}
                        max={512}
                        value={speed}
                        onChange={(e) => setSpeed(parseInt(e.target.value))}
                        className="w-full accent-circuit-accent"
                    />
                    <span className="text-circuit-text-muted text-circuit-xs">{speed}</span>
                </div>

                {/* Plot bindings */}
                {plotBindings.map((binding, i) => (
                    <div key={i} className="p-2 bg-circuit-bg-tertiary rounded">
                        <div className="text-circuit-text-secondary mb-1.5">{t('dialog.scopeConfig.channel', { index: i + 1 })}</div>

                        <div className="mb-1.5">
                            <div className="text-circuit-text-muted text-circuit-xs mb-0.5">{t('dialog.scopeConfig.component')}</div>
                            <select
                                value={binding.componentId}
                                onChange={(e) => updatePlotBinding(i, 'componentId', parseInt(e.target.value))}
                                className="w-full px-1.5 py-1 bg-circuit-bg-canvas text-circuit-text border border-circuit-border-light rounded font-mono text-circuit-sm cursor-pointer outline-none box-border"
                            >
                                <option value={-1}>{t('dialog.scopeConfig.none')}</option>
                                {availableComponents.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.constructor.name.replace(/Component$/, '')} (#{c.id})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <div className="flex-1">
                                <div className="text-circuit-text-muted text-circuit-xs mb-0.5">{t('dialog.scopeConfig.yScale')}</div>
                                <input
                                    type="number"
                                    value={binding.scale}
                                    onChange={(e) => updatePlotBinding(i, 'scale', parseFloat(e.target.value) || 1)}
                                    className="w-full px-1.5 py-1 bg-circuit-bg-canvas text-circuit-text border border-circuit-border-light rounded font-mono text-circuit-sm outline-none box-border"
                                    min={0.1}
                                    step={0.1}
                                />
                            </div>
                            <div className="flex-1">
                                <div className="text-circuit-text-muted text-circuit-xs mb-0.5">{t('dialog.scopeConfig.yOffset')}</div>
                                <input
                                    type="number"
                                    value={binding.offset}
                                    onChange={(e) => updatePlotBinding(i, 'offset', parseFloat(e.target.value) || 0)}
                                    className="w-full px-1.5 py-1 bg-circuit-bg-canvas text-circuit-text border border-circuit-border-light rounded font-mono text-circuit-sm outline-none box-border"
                                    step={0.1}
                                />
                            </div>
                        </div>
                    </div>
                ))}

                {/* Display options */}
                <div className="p-2 bg-circuit-bg-tertiary rounded">
                    <div className="text-circuit-text-secondary mb-1.5">{t('dialog.scopeConfig.displayOptions')}</div>
                    <div className="grid grid-cols-2 gap-1">
                        {[
                            { labelKey: 'dialog.scopeConfig.showMax', value: showMax, set: setShowMax },
                            { labelKey: 'dialog.scopeConfig.showMin', value: showMin, set: setShowMin },
                            { labelKey: 'dialog.scopeConfig.showFreq', value: showFreq, set: setShowFreq },
                            { labelKey: 'dialog.scopeConfig.showFFT', value: showFFT, set: setShowFFT },
                            { labelKey: 'dialog.scopeConfig.showRMS', value: showRMS, set: setShowRMS },
                            { labelKey: 'dialog.scopeConfig.showScale', value: showScale, set: setShowScale },
                            { labelKey: 'dialog.scopeConfig.logSpectrum', value: logSpectrum, set: setLogSpectrum },
                        ].map((opt) => (
                            <label key={opt.labelKey} className="flex items-center gap-1.5 text-circuit-text-secondary cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={opt.value}
                                    onChange={(e) => opt.set(e.target.checked)}
                                    className="accent-circuit-accent"
                                />
                                {t(opt.labelKey)}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={handleApply} className="px-4 py-1.5 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded cursor-pointer font-mono text-circuit-base">{t('dialog.scopeConfig.apply')}</button>
                    <button onClick={handleOk} className="px-4 py-1.5 bg-circuit-accent-bg text-circuit-text border border-accent rounded cursor-pointer font-mono text-circuit-base">{t('dialog.scopeConfig.ok')}</button>
                    <button onClick={onClose} className="px-4 py-1.5 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded cursor-pointer font-mono text-circuit-base">{t('dialog.scopeConfig.cancel')}</button>
                </div>
            </div>
        </Modal>
    );
}
