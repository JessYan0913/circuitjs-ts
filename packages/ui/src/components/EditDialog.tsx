import React, { useState, useCallback, useMemo } from 'react';
import type { CircuitComponent } from '@circuitjs/core';
import type { EditInfo } from '@circuitjs/shared';
import { Modal } from './Modal.js';
import { parseUnitValue, formatEditValue, getUnitSuffix } from '../canvas/unitParser.js';

const labelStyle: React.CSSProperties = {
    color: '#CCC',
    fontSize: '12px',
    fontFamily: 'monospace',
    marginBottom: '2px',
    userSelect: 'none',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '4px 8px',
    backgroundColor: '#2a2a2a',
    color: '#FFF',
    border: '1px solid #555',
    borderRadius: '3px',
    fontFamily: 'monospace',
    fontSize: '12px',
    outline: 'none',
    boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
};

const checkboxRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 0',
};

const rowStyle: React.CSSProperties = {
    marginBottom: '10px',
};

const buttonRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #333',
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

const actionBtnStyle: React.CSSProperties = {
    ...btnStyle,
    backgroundColor: '#2d3e2d',
    borderColor: '#4a6a4a',
};

export interface EditDialogProps {
    component: CircuitComponent;
    onApply: (component: CircuitComponent) => void;
    onClose: () => void;
    /** Callback for special button actions (e.g., opening composite model editor). Passes the edited component. */
    onButtonAction?: (n: number, info: EditInfo, component: CircuitComponent) => void;
}

interface EditFieldState {
    n: number;
    info: EditInfo;
    displayValue: string;
}

export function EditDialog({ component, onApply, onClose, onButtonAction }: EditDialogProps) {
    // Collect all edit info entries
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
            // Java: skip button items in apply()
            if (info.button) continue;
            if (info.value !== undefined && info.choices === undefined && !info.checkbox) {
                // Numeric field: parse from display value
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

    const handleApply = useCallback(() => {
        applyChanges();
    }, [applyChanges]);

    const handleOk = useCallback(() => {
        applyChanges();
        onClose();
    }, [applyChanges, onClose]);

    const handleCancel = useCallback(() => {
        onClose();
    }, [onClose]);

    const updateDisplayValue = useCallback((n: number, value: string) => {
        setFieldStates((prev) =>
            prev.map((fs) => (fs.n === n ? { ...fs, displayValue: value } : fs)),
        );
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
                // If newDialog flag, rebuild
                if (newInfo.newDialog) {
                    // Need to re-query the component
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
        // Apply current changes then fire button
        applyChanges();
        component.setEditValue(n, fs.info);
        // Notify parent of button action (for opening sub-dialogs)
        if (onButtonAction) {
            onButtonAction(n, fs.info, component);
        }
        // Rebuild dialog if needed
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {fieldStates.map((fs) => renderField(fs, {
                    updateDisplayValue,
                    onCheckboxChange: handleCheckboxChange,
                    onChoiceChange: handleChoiceChange,
                    onButtonClick: handleButtonClick,
                }))}

                {fieldStates.length === 0 && (
                    <div style={{ color: '#888', fontFamily: 'monospace', fontSize: '12px' }}>
                        No editable properties
                    </div>
                )}

                <div style={buttonRowStyle}>
                    <button onClick={handleApply} style={btnStyle}>Apply</button>
                    <button onClick={handleOk} style={primaryBtnStyle}>OK</button>
                    <button onClick={handleCancel} style={btnStyle}>Cancel</button>
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

    // Java priority: choice → checkbox → button → textArea → widget → numeric
    // 1. Choices / dropdown (checked first in Java)
    if (info.choices && info.choices.length > 0) {
        return (
            <div key={n} style={rowStyle}>
                <div style={labelStyle}>{info.name}</div>
                <select
                    value={info.selectedIndex ?? 0}
                    onChange={(e) => handlers.onChoiceChange(n, parseInt(e.target.value))}
                    style={selectStyle}
                >
                    {info.choices.map((choice, i) => (
                        <option key={i} value={i}>{choice}</option>
                    ))}
                </select>
            </div>
        );
    }

    // 2. Checkbox
    if (info.checkbox) {
        return (
            <div key={n} style={checkboxRowStyle}>
                <input
                    type="checkbox"
                    id={`cb-${n}`}
                    checked={info.checkboxState ?? false}
                    onChange={(e) => handlers.onCheckboxChange(n, e.target.checked)}
                    style={{ accentColor: '#2980b9' }}
                />
                <label htmlFor={`cb-${n}`} style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>
                    {info.name}
                </label>
            </div>
        );
    }

    // 3. Button
    if (info.button) {
        return (
            <div key={n} style={rowStyle}>
                <button onClick={() => handlers.onButtonClick(n)} style={actionBtnStyle}>
                    {info.button}
                </button>
            </div>
        );
    }

    // 4. Text field (when text is present)
    if (info.text !== undefined) {
        return (
            <div key={n} style={rowStyle}>
                <div style={labelStyle}>{info.name}</div>
                <input
                    type="text"
                    value={displayValue}
                    onChange={(e) => handlers.updateDisplayValue(n, e.target.value)}
                    style={inputStyle}
                />
            </div>
        );
    }

    // 5. Numeric field (default)
    const unitSuffix = getUnitSuffix(info.name, info.dimensionless);

    return (
        <div key={n} style={rowStyle}>
            <div style={labelStyle}>{info.name}</div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <input
                    type="text"
                    value={displayValue}
                    onChange={(e) => handlers.updateDisplayValue(n, e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                />
                {unitSuffix && (
                    <span style={{ color: '#888', fontSize: '12px', fontFamily: 'monospace', minWidth: '20px' }}>
                        {unitSuffix}
                    </span>
                )}
            </div>
        </div>
    );
}
