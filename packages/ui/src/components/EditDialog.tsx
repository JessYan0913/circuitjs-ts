import React, { useState, useCallback, useMemo } from 'react';
import type { CircuitComponent } from '@circuitjs/core';
import type { EditInfo } from '@circuitjs/shared';
import { Modal } from './Modal.js';
import { parseUnitValue, formatEditValue, getUnitSuffix } from '../canvas/unitParser.js';

export interface EditDialogProps {
    component: CircuitComponent;
    onApply: (component: CircuitComponent) => void;
    onClose: () => void;
    onButtonAction?: (n: number, info: EditInfo, component: CircuitComponent) => void;
}

interface EditFieldState {
    n: number;
    info: EditInfo;
    displayValue: string;
}

export function EditDialog({ component, onApply, onClose, onButtonAction }: EditDialogProps) {
    const fields = useMemo(() => {
        const result: EditFieldState[] = [];
        for (let n = 0; ; n++) {
            const info = component.getEditInfo(n);
            if (!info) break;
            result.push({
                n,
                info: { ...info },
                displayValue: formatDisplayValue(info),
            });
        }
        return result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [component]);

    const [fieldStates, setFieldStates] = useState<EditFieldState[]>(fields);
    const [refreshKey, setRefreshKey] = useState(0);

    const applyChanges = useCallback(() => {
        for (const fs of fieldStates) {
            const { n, info } = fs;
            if (info.button) continue;
            if (info.value !== undefined && info.choices === undefined && !info.checkbox) {
                const parsed = parseUnitValue(fs.displayValue);
                info.value = parsed;
            }
            if (info.text !== undefined) {
                info.text = fs.displayValue;
            }
            component.setEditValue(n, info);
        }
        onApply(component);
    }, [fieldStates, component, onApply]);

    const handleApply = useCallback(() => { applyChanges(); }, [applyChanges]);
    const handleOk = useCallback(() => { applyChanges(); onClose(); }, [applyChanges, onClose]);
    const handleCancel = useCallback(() => { onClose(); }, [onClose]);

    const updateDisplayValue = useCallback((n: number, value: string) => {
        setFieldStates((prev) => prev.map((fs) => (fs.n === n ? { ...fs, displayValue: value } : fs)));
    }, []);

    const handleCheckboxChange = useCallback((n: number, checked: boolean) => {
        setFieldStates((prev) =>
            prev.map((fs) => {
                if (fs.n !== n) return fs;
                const newInfo = { ...fs.info, checkboxState: checked };
                component.setEditValue(n, newInfo);
                return { ...fs, info: newInfo };
            }),
        );
    }, [component]);

    const handleChoiceChange = useCallback((n: number, selectedIndex: number) => {
        setFieldStates((prev) =>
            prev.map((fs) => {
                if (fs.n !== n) return fs;
                const newInfo = { ...fs.info, selectedIndex };
                component.setEditValue(n, newInfo);
                if (newInfo.newDialog) {
                    setTimeout(() => {
                        const newFields: EditFieldState[] = [];
                        for (let i = 0; ; i++) {
                            const info = component.getEditInfo(i);
                            if (!info) break;
                            newFields.push({
                                n: i,
                                info: { ...info },
                                displayValue: formatDisplayValue(info),
                            });
                        }
                        setFieldStates(newFields);
                        setRefreshKey((k) => k + 1);
                    }, 0);
                }
                return { ...fs, info: newInfo };
            }),
        );
    }, [component]);

    const handleButtonClick = useCallback((n: number) => {
        const fs = fieldStates.find((f) => f.n === n);
        if (!fs) return;
        applyChanges();
        component.setEditValue(n, fs.info);
        if (onButtonAction) {
            onButtonAction(n, fs.info, component);
        }
        setTimeout(() => {
            const newFields: EditFieldState[] = [];
            for (let i = 0; ; i++) {
                const info = component.getEditInfo(i);
                if (!info) break;
                newFields.push({
                    n: i,
                    info: { ...info },
                    displayValue: formatDisplayValue(info),
                });
            }
            setFieldStates(newFields);
            setRefreshKey((k) => k + 1);
        }, 0);
    }, [fieldStates, component, applyChanges, onButtonAction]);

    const componentName = component.constructor.name.replace(/Component$/, '');

    return (
        <Modal title={`Edit ${componentName}`} onClose={handleCancel} width={380} key={refreshKey}>
            <div className="flex flex-col gap-1">
                {fieldStates.map((fs) => renderField(fs, {
                    updateDisplayValue,
                    onCheckboxChange: handleCheckboxChange,
                    onChoiceChange: handleChoiceChange,
                    onButtonClick: handleButtonClick,
                }))}

                {fieldStates.length === 0 && (
                    <div className="text-circuit-text-muted font-mono text-circuit-base">No editable properties</div>
                )}

                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-circuit-border">
                    <button onClick={handleApply} className="px-4 py-1.5 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded cursor-pointer font-mono text-circuit-base">Apply</button>
                    <button onClick={handleOk} className="px-4 py-1.5 bg-circuit-accent-bg text-circuit-text border border-accent rounded cursor-pointer font-mono text-circuit-base">OK</button>
                    <button onClick={handleCancel} className="px-4 py-1.5 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded cursor-pointer font-mono text-circuit-base">Cancel</button>
                </div>
            </div>
        </Modal>
    );
}

function formatDisplayValue(info: EditInfo): string {
    if (info.text !== undefined) return info.text;
    if (info.value !== undefined) {
        return formatEditValue(info.value, info.name, info.dimensionless);
    }
    return '';
}

interface FieldHandlers {
    updateDisplayValue: (n: number, value: string) => void;
    onCheckboxChange: (n: number, checked: boolean) => void;
    onChoiceChange: (n: number, selectedIndex: number) => void;
    onButtonClick: (n: number) => void;
}

function renderField(fs: EditFieldState, handlers: FieldHandlers): React.ReactNode {
    const { n, info, displayValue } = fs;

    if (info.choices && info.choices.length > 0) {
        return (
            <div key={n} className="mb-2.5">
                <div className="text-circuit-text-secondary text-circuit-base font-mono mb-0.5 select-none">{info.name}</div>
                <select
                    value={info.selectedIndex ?? 0}
                    onChange={(e) => handlers.onChoiceChange(n, parseInt(e.target.value))}
                    className="w-full px-2 py-1 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded font-mono text-circuit-base cursor-pointer outline-none box-border"
                >
                    {info.choices.map((choice, i) => (
                        <option key={i} value={i}>{choice}</option>
                    ))}
                </select>
            </div>
        );
    }

    if (info.checkbox) {
        return (
            <div key={n} className="flex items-center gap-2 py-1">
                <input
                    type="checkbox"
                    id={`cb-${n}`}
                    checked={info.checkboxState ?? false}
                    onChange={(e) => handlers.onCheckboxChange(n, e.target.checked)}
                    className="accent-circuit-accent"
                />
                <label htmlFor={`cb-${n}`} className="text-circuit-text-secondary text-circuit-base font-mono cursor-pointer mb-0">{info.name}</label>
            </div>
        );
    }

    if (info.button) {
        return (
            <div key={n} className="mb-2.5">
                <button onClick={() => handlers.onButtonClick(n)}
                    className="px-4 py-1.5 bg-[#2d3e2d] text-circuit-text border border-[#4a6a4a] rounded cursor-pointer font-mono text-circuit-base">
                    {info.button}
                </button>
            </div>
        );
    }

    if (info.text !== undefined) {
        return (
            <div key={n} className="mb-2.5">
                <div className="text-circuit-text-secondary text-circuit-base font-mono mb-0.5 select-none">{info.name}</div>
                <input
                    type="text"
                    value={displayValue}
                    onChange={(e) => handlers.updateDisplayValue(n, e.target.value)}
                    className="w-full px-2 py-1 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded font-mono text-circuit-base outline-none box-border"
                />
            </div>
        );
    }

    const unitSuffix = getUnitSuffix(info.name, info.dimensionless);

    return (
        <div key={n} className="mb-2.5">
            <div className="text-circuit-text-secondary text-circuit-base font-mono mb-0.5 select-none">{info.name}</div>
            <div className="flex gap-1 items-center">
                <input
                    type="text"
                    value={displayValue}
                    onChange={(e) => handlers.updateDisplayValue(n, e.target.value)}
                    className="flex-1 px-2 py-1 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded font-mono text-circuit-base outline-none box-border"
                />
                {unitSuffix && (
                    <span className="text-circuit-text-muted text-circuit-base font-mono min-w-[20px]">{unitSuffix}</span>
                )}
            </div>
        </div>
    );
}
