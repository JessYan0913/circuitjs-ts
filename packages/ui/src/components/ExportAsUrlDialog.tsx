import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from './Modal.js';
import { useCircuitStore } from '../store/circuitStore.js';

export interface ExportAsUrlDialogProps {
    onClose: () => void;
}

export function ExportAsUrlDialog({ onClose }: ExportAsUrlDialogProps) {
    const simManager = useCircuitStore((s) => s.simManager);
    const [urlText, setUrlText] = useState('Loading...');

    useEffect(() => {
        (async () => {
            if (!simManager) {
                setUrlText('No circuit loaded.');
                return;
            }
            try {
                const { Serializer } = await import('@circuitjs/core');
                const text = Serializer.dumpCircuit(simManager);
                // Simple URL encoding (the original Java uses Deflater compression,
                // but for now we use basic encoding)
                const encoded = encodeURIComponent(text);
                setUrlText(`${window.location.origin}${window.location.pathname}?circuit=${encoded}`);
            } catch {
                setUrlText('Error generating URL.');
            }
        })();
    }, [simManager]);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(urlText);
        } catch {
            // fallback
        }
    }, [urlText]);

    return (
        <Modal title="Export As URL" onClose={onClose} width={550}>
            <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                <p style={{ color: '#888', margin: '0 0 8px 0' }}>
                    Share this URL to load the current circuit:
                </p>
                <textarea
                    readOnly
                    value={urlText}
                    style={{
                        width: '100%',
                        height: '100px',
                        backgroundColor: '#111',
                        color: '#0F0',
                        border: '1px solid #444',
                        borderRadius: '3px',
                        padding: '8px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        resize: 'none',
                        boxSizing: 'border-box',
                        wordBreak: 'break-all',
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
