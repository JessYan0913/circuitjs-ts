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
            <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #444' }}>
                            <th style={{ textAlign: 'left', padding: '6px 12px', color: '#888', fontWeight: 'normal' }}>Key</th>
                            <th style={{ textAlign: 'left', padding: '6px 12px', color: '#888', fontWeight: 'normal' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shortcuts.map((s, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #2a2a2a' }}>
                                <td style={{ padding: '5px 12px', color: '#FFD700', whiteSpace: 'nowrap' }}>
                                    {s.key}
                                </td>
                                <td style={{ padding: '5px 12px', color: '#CCC' }}>
                                    {s.description}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
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
