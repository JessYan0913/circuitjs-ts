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

    const drawChip = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = canvas.width;
        const H = canvas.height;

        const gridW = sizeX * 2 + 1;
        const gridH = sizeY * 2 + 1;
        const scale = Math.min(W / gridW, H / gridH) * 0.7;
        const ox = (W - sizeX * 2 * scale) / 2;
        const oy = (H - sizeY * 2 * scale) / 2;
        const cspc = scale;

        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, W, H);

        const x0 = ox;
        const y0 = oy;
        const xs = sizeX * 2 * cspc;
        const ys = sizeY * 2 * cspc;

        ctx.strokeStyle = '#808080';
        ctx.lineWidth = 3;
        ctx.strokeRect(x0, y0, xs, ys);
        ctx.lineWidth = 1;

        for (let i = 0; i < pins.length; i++) {
            const pin = pins[i];
            const isSelected = i === selectedPin;
            const spacing = 2 * cspc;
            const pinX = pin.side === SIDE_W ? x0 : x0 + xs;
            const pinY = y0 + (pin.pos + 0.5) * spacing;

            ctx.strokeStyle = isSelected ? '#00FFFF' : '#CCCCCC';
            ctx.lineWidth = isSelected ? 3 : 2;

            const stubLen = cspc;
            const dir = pin.side === SIDE_W ? -1 : 1;
            ctx.beginPath();
            ctx.moveTo(pinX, pinY);
            ctx.lineTo(pinX + dir * stubLen, pinY);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(pinX + dir * stubLen, pinY, 3, 0, Math.PI * 2);
            ctx.fillStyle = isSelected ? '#00FFFF' : '#CCCCCC';
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = '11px monospace';
            ctx.textAlign = pin.side === SIDE_W ? 'right' : 'left';
            ctx.textBaseline = 'middle';
            const labelX = pinX - dir * (stubLen + 4);
            ctx.fillText(`${pin.name} (P${i})`, labelX, pinY);

            ctx.lineWidth = 1;
        }
    }, [pins, sizeX, sizeY, selectedPin]);

    useEffect(() => { drawChip(); }, [drawChip]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

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

        const rawPos = (my - oy) / spacing - 0.5;
        const newPos = Math.max(0, Math.min(sizeY * 2 - 1, Math.round(rawPos)));

        setPins((prev) => prev.map((p, i) =>
            i === dragging ? { ...p, pos: newPos } : p
        ));
    }, [dragging, sizeX, sizeY]);

    const handleMouseUp = useCallback(() => { setDragging(null); }, []);
    const handleMouseOut = useCallback(() => {}, []);

    const adjustSize = useCallback((dx: number, dy: number) => {
        const newX = Math.max(1, sizeX + dx);
        const newY = Math.max(1, sizeY + dy);
        const maxPin = Math.max(...pins.map(p => p.pos));
        const maxRows = newY * 2;
        if (maxPin >= maxRows) return;
        setSizeX(newX);
        setSizeY(newY);
    }, [sizeX, sizeY, pins]);

    const togglePinSide = useCallback((index: number) => {
        setPins((prev) => prev.map((p, i) => {
            if (i !== index) return p;
            const newSide = p.side === SIDE_W ? SIDE_E : SIDE_W;
            const leftCount = prev.filter(pp => pp.side === newSide).length;
            return { ...p, side: newSide, pos: leftCount };
        }));
    }, []);

    const updatePinName = useCallback((index: number, name: string) => {
        setPins((prev) => prev.map((p, i) => i === index ? { ...p, name } : p));
    }, []);

    const handleSave = useCallback(() => {
        onSave({ name: modelName, pins, sizeX, sizeY });
    }, [modelName, pins, sizeX, sizeY, onSave]);

    return (
        <Modal title="Edit Composite Model" onClose={onClose} width={500}>
            <div className="flex flex-col gap-3">
                {/* Canvas */}
                <canvas
                    ref={canvasRef}
                    width={CANVAS_W}
                    height={CANVAS_H}
                    className="w-full h-[300px] border border-circuit-border rounded cursor-pointer bg-[#1a1a1a]"
                    style={{ cursor: dragging !== null ? 'grabbing' : 'pointer' }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseOut={handleMouseOut}
                />

                {/* Model name */}
                {isNew && (
                    <div className="flex items-center gap-2">
                        <label className="text-circuit-text-secondary text-circuit-base font-mono min-w-[80px]">Model name:</label>
                        <input
                            type="text"
                            value={modelName}
                            onChange={(e) => setModelName(e.target.value)}
                            className="flex-1 px-2 py-1 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded font-mono text-circuit-base outline-none"
                        />
                    </div>
                )}

                {/* Size controls */}
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-1">
                        <span className="text-circuit-text-secondary text-circuit-base font-mono">Width:</span>
                        <button onClick={() => adjustSize(-1, 0)} className="px-3 py-1 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded cursor-pointer font-mono text-circuit-base min-w-[30px]">-</button>
                        <span className="text-circuit-text text-circuit-base font-mono min-w-[20px] text-center">{sizeX}</span>
                        <button onClick={() => adjustSize(1, 0)} className="px-3 py-1 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded cursor-pointer font-mono text-circuit-base min-w-[30px]">+</button>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-circuit-text-secondary text-circuit-base font-mono">Height:</span>
                        <button onClick={() => adjustSize(0, -1)} className="px-3 py-1 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded cursor-pointer font-mono text-circuit-base min-w-[30px]">-</button>
                        <span className="text-circuit-text text-circuit-base font-mono min-w-[20px] text-center">{sizeY}</span>
                        <button onClick={() => adjustSize(0, 1)} className="px-3 py-1 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded cursor-pointer font-mono text-circuit-base min-w-[30px]">+</button>
                    </div>
                </div>

                {/* Pin list */}
                <div className="max-h-[150px] overflow-auto border border-circuit-border rounded p-2">
                    <div className="text-circuit-text-muted text-circuit-sm font-mono mb-1">Pins (click to select, drag to reposition)</div>
                    {pins.map((pin, i) => (
                        <div key={i}
                            className="flex items-center gap-2 py-0.5"
                            style={{ backgroundColor: i === selectedPin ? '#2a3a4a' : 'transparent' }}
                        >
                            <span className="text-circuit-text-muted text-circuit-sm font-mono min-w-[24px]">P{i}:</span>
                            <input
                                type="text"
                                value={pin.name}
                                onChange={(e) => updatePinName(i, e.target.value)}
                                className="w-20 px-1.5 py-0.5 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded font-mono text-circuit-sm outline-none"
                            />
                            <button onClick={() => togglePinSide(i)}
                                className="px-2 py-0.5 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded cursor-pointer font-mono text-circuit-sm">
                                Side: {SIDE_LABELS[pin.side] ?? `${pin.side}`}
                            </button>
                            <span className="text-circuit-text-muted text-circuit-sm font-mono">pos: {pin.pos}</span>
                        </div>
                    ))}
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={handleSave}
                        className="px-6 py-1.5 bg-circuit-accent-bg text-circuit-text border border-accent rounded cursor-pointer font-mono text-circuit-base">OK</button>
                    <button onClick={onClose}
                        className="px-6 py-1.5 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded cursor-pointer font-mono text-circuit-base">Cancel</button>
                </div>
            </div>
        </Modal>
    );
}
