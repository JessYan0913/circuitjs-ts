import React from 'react';
import { Modal } from './Modal.js';

export interface AboutDialogProps {
    onClose: () => void;
}

export function AboutDialog({ onClose }: AboutDialogProps) {
    return (
        <Modal title="About CircuitJS" onClose={onClose} width={400}>
            <div className="font-mono text-circuit-base text-circuit-text-secondary leading-relaxed">
                <h3 className="text-circuit-text text-circuit-lg font-semibold mb-2">CircuitJS Next</h3>
                <p className="mb-3">
                    Circuit simulation in your browser.
                </p>
                <p className="mb-3">
                    Originally created by Paul Falstad.<br />
                    Ported to TypeScript/React.
                </p>
                <p className="mb-4 text-circuit-text-muted">
                    Version 0.1.0
                </p>
                <div className="text-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-1.5 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded cursor-pointer font-mono text-circuit-base"
                    >
                        OK
                    </button>
                </div>
            </div>
        </Modal>
    );
}
