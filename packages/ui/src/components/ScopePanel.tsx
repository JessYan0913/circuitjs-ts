import React, { useCallback, useEffect, useRef } from 'react';
import type { ScopeConfig } from '@circuitjs/shared';
import { SCOPE_POINT_COUNT_INITIAL } from '@circuitjs/shared';
import { drawWaveform } from '../canvas/WaveformRenderer.js';
import { getScopeValue } from '../canvas/scope-capture.js';
import { useCircuitStore } from '../store/circuitStore.js';

const TITLE_BAR_HEIGHT = 24;
const MIN_SCOPE_HEIGHT = 60;
const DEFAULT_SCOPE_HEIGHT = 150;

export interface ScopePanelProps {
    onConfigScope?: (scopeIndex: number) => void;
}

export function ScopePanel({ onConfigScope }: ScopePanelProps) {
    const scopes = useCircuitStore((s) => s.scopes);
    const simManager = useCircuitStore((s) => s.simManager);
    const running = useCircuitStore((s) => s.running);
    const setScopes = useCircuitStore((s) => s.setScopes);

    const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
    const rafRef = useRef<number>(0);
    const lastFrameTimeRef = useRef<number>(0);

    const maxTimeStep = simManager?.config.maxTimeStep ?? 5e-6;

    const setCanvasRef = useCallback((scopeIndex: number, canvas: HTMLCanvasElement | null) => {
        if (canvas) {
            canvasRefs.current.set(scopeIndex, canvas);
        } else {
            canvasRefs.current.delete(scopeIndex);
        }
    }, []);

    const renderScopes = useCallback(() => {
        const state = useCircuitStore.getState();
        const currentScopes = state.scopes;
        const currentTime = state.time;

        for (let i = 0; i < currentScopes.length; i++) {
            const canvas = canvasRefs.current.get(i);
            if (!canvas) continue;

            const scope = currentScopes[i];
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            drawWaveform(
                ctx,
                { x: 0, y: 0, width: canvas.width, height: canvas.height },
                scope,
                (bufIndex: number, plotIndex: number) => {
                    const plot = scope.plots[plotIndex];
                    if (!plot) return { max: 0, min: 0 };
                    return getScopeValue(plot, bufIndex);
                },
                currentTime * 1000,
                maxTimeStep,
            );
        }
    }, [maxTimeStep]);

    useEffect(() => {
        if (running && scopes.length > 0) {
            lastFrameTimeRef.current = 0;
            const loop = (timestamp: number) => {
                renderScopes();
                if (useCircuitStore.getState().running) {
                    rafRef.current = requestAnimationFrame(loop);
                }
            };
            rafRef.current = requestAnimationFrame(loop);
        }
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [running, scopes.length, renderScopes]);

    const handleRemoveScope = useCallback((index: number) => {
        const current = useCircuitStore.getState().scopes;
        const updated = current.filter((_, i) => i !== index);
        setScopes(updated);
    }, [setScopes]);

    if (scopes.length === 0) return null;

    return (
        <div className="bg-circuit-bg-canvas border-t border-circuit-border flex flex-col">
            {scopes.map((scope, index) => (
                <ScopeView
                    key={index}
                    scope={scope}
                    scopeIndex={index}
                    maxTimeStep={maxTimeStep}
                    onRemove={() => handleRemoveScope(index)}
                    onConfig={() => onConfigScope?.(index)}
                    setCanvasRef={setCanvasRef}
                />
            ))}
        </div>
    );
}

interface ScopeViewProps {
    scope: ScopeConfig;
    scopeIndex: number;
    maxTimeStep: number;
    onRemove: () => void;
    onConfig: () => void;
    setCanvasRef: (index: number, canvas: HTMLCanvasElement | null) => void;
}

function ScopeView({ scope, scopeIndex, maxTimeStep, onRemove, onConfig, setCanvasRef }: ScopeViewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [height, setHeight] = React.useState(scope.rect.height || DEFAULT_SCOPE_HEIGHT);

    useEffect(() => {
        setCanvasRef(scopeIndex, canvasRef.current);
        return () => setCanvasRef(scopeIndex, null);
    }, [scopeIndex, setCanvasRef]);

    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const resize = () => {
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const store = useCircuitStore.getState();
        const updated = [...store.scopes];
        const scope = { ...updated[scopeIndex] };
        const delta = e.deltaY > 0 ? 1.2 : 1 / 1.2;
        scope.speed = Math.max(1, Math.min(1024, Math.round(scope.speed * delta)));
        updated[scopeIndex] = scope;
        store.setScopes(updated);
    }, [scopeIndex]);

    const scopeLabel = scope.plots.length > 0
        ? `Scope ${scopeIndex + 1}`
        : `Scope ${scopeIndex + 1} (unbound)`;

    return (
        <div className="border-b border-circuit-border">
            <div className="flex items-center px-2 py-0.5 h-6 bg-circuit-bg-secondary select-none gap-2" style={{ height: TITLE_BAR_HEIGHT }}>
                <span className="text-circuit-text-secondary font-mono text-circuit-sm flex-1">{scopeLabel}</span>
                <span className="text-circuit-text-dim font-mono text-circuit-xs">speed={scope.speed}</span>
                <button onClick={onConfig} className="bg-none border-none text-circuit-text-muted cursor-pointer text-circuit-base p-0.5 rounded font-mono leading-none" title="Configure Scope">⚙</button>
                <button onClick={onRemove} className="bg-none border-none text-circuit-text-muted cursor-pointer text-circuit-base p-0.5 rounded font-mono leading-none" title="Remove Scope">✕</button>
            </div>

            <div ref={containerRef} onWheel={handleWheel} className="w-full" style={{ height: `${height}px` }}>
                <canvas ref={canvasRef} className="block w-full h-full" />
            </div>
        </div>
    );
}
