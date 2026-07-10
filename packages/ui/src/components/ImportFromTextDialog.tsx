import React, { useCallback, useState } from 'react';
import { Modal } from './Modal.js';
import { useCircuitStore } from '../store/circuitStore.js';

export interface ImportFromTextDialogProps {
    onClose: () => void;
}

export function ImportFromTextDialog({ onClose }: ImportFromTextDialogProps) {
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const setComponents = useCircuitStore((s) => s.setComponents);
    const setSimManager = useCircuitStore((s) => s.setSimManager);
    const storeSetTime = useCircuitStore((s) => s.setTime);
    const autoCenter = useCircuitStore((s) => s.autoCenter);

    const handleImport = useCallback(async () => {
        if (!text.trim()) {
            setError('Please paste circuit data first.');
            return;
        }
        try {
            const { Serializer, SimulationManager } = await import('@circuitjs/core');
            const { components } = Serializer.parseCircuit(text);
            if (components.length === 0) {
                setError('No components found in circuit data.');
                return;
            }
            const sim = new SimulationManager();
            sim.loadComponents(components);
            const ok = sim.analyzeCircuit();
            if (!ok) {
                setError(`Error: ${sim.stopMessage}`);
                return;
            }
            setSimManager(sim);
            setComponents(sim.components);
            storeSetTime(sim.getTime());
            setTimeout(() => autoCenter(), 50);
            onClose();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(`Import error: ${msg}`);
        }
    }, [text, setComponents, setSimManager, storeSetTime, autoCenter, onClose]);

    return (
        <Modal title="Import From Text" onClose={onClose} width={500}>
            <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                <p style={{ color: '#888', margin: '0 0 8px 0' }}>
                    Paste circuit data text below and click Import:
                </p>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste circuit data here..."
                    style={{
                        width: '100%',
                        height: '300px',
                        backgroundColor: '#111',
                        color: '#FFF',
                        border: '1px solid #444',
                        borderRadius: '3px',
                        padding: '8px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        resize: 'none',
                        boxSizing: 'border-box',
                    }}
                />
                {error && (
                    <p style={{ color: '#F44', margin: '8px 0 0 0', fontSize: '11px' }}>
                        {error}
                    </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                    <button
                        onClick={handleImport}
                        style={{
                            padding: '6px 16px',
                            backgroundColor: '#1a5276',
                            color: '#FFF',
                            border: '1px solid #2980b9',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                        }}
                    >
                        Import
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '6px 16px',
                            backgroundColor: '#333',
                            color: '#FFF',
                            border: '1px solid #555',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </Modal>
    );
}
