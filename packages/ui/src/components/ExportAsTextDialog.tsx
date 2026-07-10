import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from './Modal.js';
import { useCircuitStore } from '../store/circuitStore.js';

export interface ExportAsTextDialogProps {
    onClose: () => void;
}

export function ExportAsTextDialog({ onClose }: ExportAsTextDialogProps) {
    const simManager = useCircuitStore((s) => s.simManager);
    const [circuitText, setCircuitText] = useState('Loading...');

    useEffect(() => {
        (async () => {
            if (!simManager) {
                setCircuitText('No circuit loaded.');
                return;
            }
            try {
                const { Serializer } = await import('@circuitjs/core');
                const text = Serializer.dumpCircuit(simManager);
                setCircuitText(text);
            } catch {
                setCircuitText('Error generating circuit text.');
            }
        })();
    }, [simManager]);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(circuitText);
        } catch {
            // Fallback: select text manually
        }
    }, [circuitText]);

    return (
        <Modal title="Export As Text" onClose={onClose} width={500}>
            <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                <p style={{ color: '#888', margin: '0 0 8px 0' }}>
                    Copy the circuit data below to share or save:
                </p>
                <textarea
                    readOnly
                    value={circuitText}
                    style={{
                        width: '100%',
                        height: '300px',
                        backgroundColor: '#111',
                        color: '#0F0',
                        border: '1px solid #444',
                        borderRadius: '3px',
                        padding: '8px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        resize: 'none',
                        boxSizing: 'border-box',
                    }}
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                    <button
                        onClick={handleCopy}
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
                        Copy to Clipboard
                    </button>
                    <button
                        onClick={onClose}
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
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
}
