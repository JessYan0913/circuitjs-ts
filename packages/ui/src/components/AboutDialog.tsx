import React from 'react';
import { Modal } from './Modal.js';

export interface AboutDialogProps {
    onClose: () => void;
}

export function AboutDialog({ onClose }: AboutDialogProps) {
    return (
        <Modal title="About CircuitJS" onClose={onClose} width={400}>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#CCC', lineHeight: '1.6' }}>
                <h3 style={{ color: '#FFF', margin: '0 0 8px 0' }}>CircuitJS Next</h3>
                <p style={{ margin: '0 0 12px 0' }}>
                    Circuit simulation in your browser.
                </p>
                <p style={{ margin: '0 0 12px 0' }}>
                    Originally created by Paul Falstad.<br />
                    Ported to TypeScript/React.
                </p>
                <p style={{ margin: '0 0 16px 0', color: '#888' }}>
                    Version 0.1.0
                </p>
                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '6px 24px',
                            backgroundColor: '#333',
                            color: '#FFF',
                            border: '1px solid #555',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                        }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </Modal>
    );
}
