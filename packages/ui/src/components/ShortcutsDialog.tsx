import React from 'react';
import { Modal } from './Modal.js';

export interface ShortcutsDialogProps {
    onClose: () => void;
}

interface ShortcutEntry {
    key: string;
    description: string;
}

const shortcuts: ShortcutEntry[] = [
    { key: 'Space', description: 'Run / Stop simulation' },
    { key: 'Delete / Backspace', description: 'Delete selected component' },
    { key: 'Ctrl+Z', description: 'Undo' },
    { key: 'Ctrl+Y', description: 'Redo' },
    { key: 'Ctrl+C', description: 'Copy selected' },
    { key: 'Ctrl+V', description: 'Paste from clipboard' },
    { key: 'Ctrl+A', description: 'Select all' },
    { key: 'X', description: 'Flip horizontally' },
    { key: 'Y', description: 'Flip vertically' },
    { key: 'Arrow keys', description: 'Nudge selected component' },
    { key: 'Escape', description: 'Clear selection' },
    { key: 'Ctrl+Click', description: 'Toggle component selection' },
    { key: 'Shift+Drag', description: 'Box select multiple components' },
    { key: 'Double-click', description: 'Edit component properties' },
    { key: 'Right-click', description: 'Context menu' },
    { key: 'Scroll wheel', description: 'Zoom in/out' },
    { key: 'Middle button / Alt+Click', description: 'Pan canvas' },
];

export function ShortcutsDialog({ onClose }: ShortcutsDialogProps) {
    return (
        <Modal title="Keyboard Shortcuts" onClose={onClose} width={450}>
            <div className="font-mono text-circuit-base">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-circuit-border">
                            <th className="text-left px-3 py-1.5 text-circuit-text-muted font-normal">Key</th>
                            <th className="text-left px-3 py-1.5 text-circuit-text-muted font-normal">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shortcuts.map((s, i) => (
                            <tr key={i} className="border-b border-[#2a2a2a]">
                                <td className="px-3 py-1 whitespace-nowrap" style={{ color: '#FFD700' }}>
                                    {s.key}
                                </td>
                                <td className="px-3 py-1 text-circuit-text-secondary">{s.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="text-center mt-4">
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
