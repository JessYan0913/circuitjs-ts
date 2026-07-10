import React, { useRef, useEffect, useCallback } from 'react';
import { CircuitRenderer } from '../canvas/CircuitRenderer.js';
import { InteractionHandler } from '../canvas/InteractionHandler.js';
import { useCircuitStore } from '../store/circuitStore.js';
import { setRendererRef, setCanvasSize } from '../store/types.js';

export function CircuitCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<CircuitRenderer | null>(null);
    const interactionRef = useRef<InteractionHandler | null>(null);
    const rafRef = useRef<number>(0);
    const lastFrameTimeRef = useRef<number>(0);

    const running = useCircuitStore((s) => s.running);

    useEffect(() => {
        const renderer = new CircuitRenderer(
            () => useCircuitStore.getState().components,
        );
        renderer.getNodeVoltage = (node: number) => {
            const mgr = useCircuitStore.getState().simManager;
            if (!mgr) return 0;
            return mgr.getNodeVoltage(node);
        };
        rendererRef.current = renderer;
        setRendererRef(renderer);

        const handler = new InteractionHandler(
            () => rendererRef.current!,
            () => useCircuitStore.getState().components,
            () => {
                // Lightweight: re-render one frame (for hover feedback, pan, zoom, drag)
                const canvas = canvasRef.current;
                const renderer = rendererRef.current;
                if (canvas && renderer) {
                    renderer.hoveredComponentId =
                        interactionRef.current?.state.mouseElm?.id ?? null;
                    const ctx = canvas.getContext('2d');
                    if (ctx) renderer.render(ctx, canvas.width, canvas.height);
                }
            },
            () => {
                // Heavy: re-analyze circuit (for topology changes like switch toggle)
                const mgr = useCircuitStore.getState().simManager;
                if (mgr) {
                    mgr.analyzeCircuit();
                }
            },
        );
        interactionRef.current = handler;

        return () => { setRendererRef(null); };
    }, []);

    // Sync hovered component to renderer before each render
    const renderFrame = useCallback((timestamp: number) => {
        const canvas = canvasRef.current;
        const renderer = rendererRef.current;
        const handler = interactionRef.current;
        if (!canvas || !renderer) return;

        // Advance simulation
        const mgr = useCircuitStore.getState().simManager;
        if (mgr && useCircuitStore.getState().running) {
            const frameDelta = lastFrameTimeRef.current > 0 ? timestamp - lastFrameTimeRef.current : 16;
            lastFrameTimeRef.current = timestamp;
            mgr.update();
            mgr.updateCurrentAnimation(frameDelta);
            useCircuitStore.getState().setTime(mgr.getTime());
        }

        // Sync hover state
        renderer.hoveredComponentId = handler?.state.mouseElm?.id ?? null;

        // Render
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        renderer.running = useCircuitStore.getState().running;
        renderer.render(ctx, canvas.width, canvas.height);

        if (useCircuitStore.getState().running) {
            rafRef.current = requestAnimationFrame(renderFrame);
        }
    }, []);

    // Mouse events
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const handler = interactionRef.current;
        const canvas = canvasRef.current;
        if (!handler || !canvas) return;
        const rect = canvas.getBoundingClientRect();
        handler.onMouseDown(e.clientX - rect.left, e.clientY - rect.top, e.button, e.ctrlKey, e.altKey, e.shiftKey);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const handler = interactionRef.current;
        const canvas = canvasRef.current;
        if (!handler || !canvas) return;
        const rect = canvas.getBoundingClientRect();
        handler.onMouseMove(e.clientX - rect.left, e.clientY - rect.top);
    }, []);

    const handleMouseUp = useCallback(() => {
        interactionRef.current?.onMouseUp();
    }, []);

    // Window-level mouseup for safety
    useEffect(() => {
        const onUp = () => interactionRef.current?.onMouseUp();
        window.addEventListener('mouseup', onUp);
        return () => window.removeEventListener('mouseup', onUp);
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
    }, []);

    const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
        const handler = interactionRef.current;
        const canvas = canvasRef.current;
        if (!handler || !canvas) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        handler.onMouseWheel(e.clientX - rect.left, e.clientY - rect.top, e.deltaY);
    }, []);

    // Start/stop animation
    useEffect(() => {
        if (running) {
            lastFrameTimeRef.current = 0;
            rafRef.current = requestAnimationFrame(renderFrame);
        } else {
            const canvas = canvasRef.current;
            const renderer = rendererRef.current;
            if (canvas && renderer) {
                renderer.hoveredComponentId = interactionRef.current?.state.mouseElm?.id ?? null;
                const ctx = canvas.getContext('2d');
                if (ctx) renderer.render(ctx, canvas.width, canvas.height);
            }
        }
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [running, renderFrame]);

    // Resize
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resize = () => {
            const parent = canvas.parentElement;
            if (!parent) return;
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
            setCanvasSize(canvas.width, canvas.height);
            const renderer = rendererRef.current;
            if (renderer) {
                const ctx = canvas.getContext('2d');
                if (ctx) renderer.render(ctx, canvas.width, canvas.height);
            }
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
            onWheel={handleWheel}
            style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
        />
    );
}
