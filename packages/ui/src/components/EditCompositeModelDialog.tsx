/**
 * EditCompositeModelDialog — React dialog for editing composite subcircuit models.
 *
 * Provides a visual chip editor where users can:
 *   - Drag pins to different positions on the chip boundary
 *   - Adjust chip width and height
 *   - Enter a model name (for new models)
 *   - Edit pin names
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from './Modal.js';
import { SIDE_W, SIDE_E } from '@circuitjs/core';

export interface PinEditor {
    name: string;
    node: number;
    pos: number;
    side: number;
}

export interface EditCompositeModelDialogProps {
    pinCount: number;
    initialPins: PinEditor[];
    initialSizeX: number;
    initialSizeY: number;
    initialName?: string;
    /** If true, show a name text box for naming a new model */
    isNew?: boolean;
    onSave: (data: { name: string; pins: PinEditor[]; sizeX: number; sizeY: number }) => void;
    onClose: () => void;
}

const CANVAS_W = 400;
const CANVAS_H = 300;

const SIDE_LABELS: Record<number, string> = {
    [SIDE_W]: 'Left',
    [SIDE_E]: 'Right',
};

const btnStyle: React.CSSProperties = {
    padding: '4px 12px',
    backgroundColor: '#333',
    color: '#FFF',
    border: '1px solid #555',
    borderRadius: '3px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '12px',
    minWidth: '30px',
};

export function EditCompositeModelDialog({
    initialPins,
    initialSizeX,
    initialSizeY,
    initialName,
    isNew,
    onSave,
    onClose,
}: EditCompositeModelDialogProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [pins, setPins] = useState<PinEditor[]>(initialPins);
    const [sizeX, setSizeX] = useState(initialSizeX);
    const [sizeY, setSizeY] = useState(initialSizeY);
    const [modelName, setModelName] = useState(initialName ?? '');
    const [dragging, setDragging] = useState<number | null>(null);
    const [selectedPin, setSelectedPin] = useState<number>(-1);

    // Draw the chip on canvas
    const drawChip = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = canvas.width;
        const H = canvas.height;

        // Scale chip to fit canvas with padding
        const gridW = sizeX * 2 + 1; // chip width in grid units + margin
        const gridH = sizeY * 2 + 1;
        const scale = Math.min(W / gridW, H / gridH) * 0.7;
        const ox = (W - sizeX * 2 * scale) / 2;
        const oy = (H - sizeY * 2 * scale) / 2;
        const cspc = scale;

        // Clear
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, W, H);

        // Chip body
        const x0 = ox;
        const y0 = oy;
        const xs = sizeX * 2 * cspc;
        const ys = sizeY * 2 * cspc;

        ctx.strokeStyle = '#808080';
        ctx.lineWidth = 3;
        ctx.strokeRect(x0, y0, xs, ys);
        ctx.lineWidth = 1;

        // Draw pins
        for (let i = 0; i < pins.length; i++) {
            const pin = pins[i];
            const isSelected = i === selectedPin;

            // Calculate pin position
            const spacing = 2 * cspc;
            const pinX = pin.side === SIDE_W ? x0 : x0 + xs;
            const pinY = y0 + (pin.pos + 0.5) * spacing;

            // Pin color
            ctx.strokeStyle = isSelected ? '#00FFFF' : '#CCCCCC';
            ctx.lineWidth = isSelected ? 3 : 2;

            // Draw pin line
            const stubLen = cspc;
            const dir = pin.side === SIDE_W ? -1 : 1;
            ctx.beginPath();
            ctx.moveTo(pinX, pinY);
            ctx.lineTo(pinX + dir * stubLen, pinY);
            ctx.stroke();

            // Draw post circle
            ctx.beginPath();
            ctx.arc(pinX + dir * stubLen, pinY, 3, 0, Math.PI * 2);
            ctx.fillStyle = isSelected ? '#00FFFF' : '#CCCCCC';
            ctx.fill();

            // Pin label
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '11px monospace';
            ctx.textAlign = pin.side === SIDE_W ? 'right' : 'left';
            ctx.textBaseline = 'middle';
            const labelX = pinX - dir * (stubLen + 4);
            ctx.fillText(`${pin.name} (P${i})`, labelX, pinY);

            ctx.lineWidth = 1;
        }
    }, [pins, sizeX, sizeY, selectedPin]);

    useEffect(() => {
        drawChip();
    }, [drawChip]);

    // Mouse handlers for pin dragging
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Find nearest pin within 15px
        const W = canvas.width;
        const H = canvas.height;
        const gridW = sizeX * 2 + 1;
        const gridH = sizeY * 2 + 1;
        const scale = Math.min(W / gridW, H / gridH) * 0.7;
        const ox = (W - sizeX * 2 * scale) / 2;
        const oy = (H - sizeY * 2 * scale) / 2;
        const cspc = scale;
        const spacing = 2 * cspc;

        for (let i = 0; i < pins.length; i++) {
            const pin = pins[i];
            const pinY = oy + (pin.pos + 0.5) * spacing;
            const pinX = pin.side === SIDE_W ? ox : ox + sizeX * 2 * cspc;
            const dx = mx - pinX;
            const dy = my - pinY;
            if (Math.sqrt(dx * dx + dy * dy) < 15) {
                setDragging(i);
                setSelectedPin(i);
                return;
            }
        }
        setSelectedPin(-1);
    }, [pins, sizeX, sizeY]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (dragging === null) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const my = e.clientY - rect.top;

        const W = canvas.width;
        const H = canvas.height;
        const gridW = sizeX * 2 + 1;
        const gridH = sizeY * 2 + 1;
        const scale = Math.min(W / gridW, H / gridH) * 0.7;
        const oy = (H - sizeY * 2 * scale) / 2;
        const spacing = 2 * scale;

        // Compute pin position from mouse Y
        const rawPos = (my - oy) / spacing - 0.5;
        const newPos = Math.max(0, Math.min(sizeY * 2 - 1, Math.round(rawPos)));

        setPins((prev) => prev.map((p, i) =>
            i === dragging ? { ...p, pos: newPos } : p
        ));
    }, [dragging, sizeX, sizeY]);

    const handleMouseUp = useCallback(() => {
        setDragging(null);
    }, []);

    const handleMouseOut = useCallback(() => {
        // Don't cancel drag on mouse out — let mouse up handle it
    }, []);

    // Adjust size
    const adjustSize = useCallback((dx: number, dy: number) => {
        const newX = Math.max(1, sizeX + dx);
        const newY = Math.max(1, sizeY + dy);
        // Check no pins would be cut off
        const maxPin = Math.max(...pins.map(p => p.pos));
        const maxRows = newY * 2;
        if (maxPin >= maxRows) return;
        setSizeX(newX);
        setSizeY(newY);
    }, [sizeX, sizeY, pins]);

    // Change pin side
    const togglePinSide = useCallback((index: number) => {
        setPins((prev) => prev.map((p, i) => {
            if (i !== index) return p;
            const newSide = p.side === SIDE_W ? SIDE_E : SIDE_W;
            // Swap side and reassign pos
            const leftCount = prev.filter(pp => pp.side === newSide).length;
            return { ...p, side: newSide, pos: leftCount };
        }));
    }, []);

    // Update pin name
    const updatePinName = useCallback((index: number, name: string) => {
        setPins((prev) => prev.map((p, i) => i === index ? { ...p, name } : p));
    }, []);

    const handleSave = useCallback(() => {
        onSave({ name: modelName, pins, sizeX, sizeY });
    }, [modelName, pins, sizeX, sizeY, onSave]);

    return (
        <Modal title="Edit Composite Model" onClose={onClose} width={500}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Canvas */}
                <canvas
                    ref={canvasRef}
                    width={CANVAS_W}
                    height={CANVAS_H}
                    style={{
                        width: '100%',
                        height: `${CANVAS_H}px`,
                        border: '1px solid #333',
                        borderRadius: '4px',
                        cursor: dragging !== null ? 'grabbing' : 'pointer',
                        backgroundColor: '#1a1a1a',
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseOut={handleMouseOut}
                />

                {/* Model name (for new models) */}
                {isNew && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ color: '#CCC', fontSize: '12px', fontFamily: 'monospace', minWidth: '80px' }}>
                            Model name:
                        </label>
                        <input
                            type="text"
                            value={modelName}
                            onChange={(e) => setModelName(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '4px 8px',
                                backgroundColor: '#2a2a2a',
                                color: '#FFF',
                                border: '1px solid #555',
                                borderRadius: '3px',
                                fontFamily: 'monospace',
                                fontSize: '12px',
                            }}
                        />
                    </div>
                )}

                {/* Size controls */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#CCC', fontSize: '12px', fontFamily: 'monospace' }}>Width:</span>
                        <button onClick={() => adjustSize(-1, 0)} style={btnStyle}>-</button>
                        <span style={{ color: '#FFF', fontSize: '12px', fontFamily: 'monospace', minWidth: '20px', textAlign: 'center' }}>
                            {sizeX}
                        </span>
                        <button onClick={() => adjustSize(1, 0)} style={btnStyle}>+</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#CCC', fontSize: '12px', fontFamily: 'monospace' }}>Height:</span>
                        <button onClick={() => adjustSize(0, -1)} style={btnStyle}>-</button>
                        <span style={{ color: '#FFF', fontSize: '12px', fontFamily: 'monospace', minWidth: '20px', textAlign: 'center' }}>
                            {sizeY}
                        </span>
                        <button onClick={() => adjustSize(0, 1)} style={btnStyle}>+</button>
                    </div>
                </div>

                {/* Pin list */}
                <div style={{ maxHeight: '150px', overflow: 'auto', border: '1px solid #333', borderRadius: '4px', padding: '8px' }}>
                    <div style={{ color: '#888', fontSize: '11px', fontFamily: 'monospace', marginBottom: '4px' }}>
                        Pins (click to select, drag to reposition)
                    </div>
                    {pins.map((pin, i) => (
                        <div
                            key={i}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '2px 0',
                                backgroundColor: i === selectedPin ? '#2a3a4a' : 'transparent',
                            }}
                        >
                            <span style={{ color: '#888', fontSize: '11px', fontFamily: 'monospace', minWidth: '24px' }}>
                                P{i}:
                            </span>
                            <input
                                type="text"
                                value={pin.name}
                                onChange={(e) => updatePinName(i, e.target.value)}
                                style={{
                                    width: '80px',
                                    padding: '2px 6px',
                                    backgroundColor: '#2a2a2a',
                                    color: '#FFF',
                                    border: '1px solid #555',
                                    borderRadius: '3px',
                                    fontFamily: 'monospace',
                                    fontSize: '11px',
                                }}
                            />
                            <button
                                onClick={() => togglePinSide(i)}
                                style={{
                                    ...btnStyle,
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                }}
                            >
                                Side: {SIDE_LABELS[pin.side] ?? `${pin.side}`}
                            </button>
                            <span style={{ color: '#888', fontSize: '11px', fontFamily: 'monospace' }}>
                                pos: {pin.pos}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                    <button
                        onClick={handleSave}
                        style={{
                            padding: '6px 24px',
                            backgroundColor: '#1a5276',
                            color: '#FFF',
                            border: '1px solid #2980b9',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                        }}
                    >
                        OK
                    </button>
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
                        Cancel
                    </button>
                </div>
            </div>
        </Modal>
    );
}
