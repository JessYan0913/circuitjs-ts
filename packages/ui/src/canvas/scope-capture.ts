import type { ScopeConfig, ScopePlotConfig } from '@circuitjs/shared';
import { SCOPE_POINT_COUNT_INITIAL } from '@circuitjs/shared';

/**
 * Create a new ScopePlotConfig with initialized circular buffers.
 */
export function createScopePlot(
    componentId: number,
    valueType: number,
    color: string,
    scale: number = 5,
    offset: number = 0,
): ScopePlotConfig {
    const size = SCOPE_POINT_COUNT_INITIAL;
    return {
        componentId,
        valueType,
        color,
        scale,
        offset,
        maxValues: new Float64Array(size),
        minValues: new Float64Array(size),
        ptr: 0,
        acCoupled: false,
    };
}

/**
 * Create a new ScopeConfig with default values.
 */
export function createScopeConfig(
    elmId: number,
    rect: { x: number; y: number; width: number; height: number },
    speed: number = 64,
): ScopeConfig {
    return {
        position: 0,
        speed,
        elmId,
        plots: [],
        rect,
        stackCount: 1,
        showMax: false,
        showMin: false,
        showFreq: false,
        showFFT: false,
        showRMS: false,
        showScale: false,
        logSpectrum: false,
    };
}

/**
 * Capture a data point into a scope plot's circular buffer.
 * Called each simulation step.
 *
 * @param plot - The plot config whose buffers to update
 * @param value - The instantaneous value to record (both max and min)
 * @param pointCount - Total number of scope points (power of 2)
 */
export function captureScopePoint(
    plot: ScopePlotConfig,
    value: number,
    pointCount: number = SCOPE_POINT_COUNT_INITIAL,
): void {
    const ptr = plot.ptr;
    const mask = pointCount - 1;

    // Insert into min/max ring buffers
    // If this is the same time index as the last write, merge; otherwise advance
    plot.maxValues[ptr] = Math.max(plot.maxValues[ptr], value);
    plot.minValues[ptr] = Math.min(plot.minValues[ptr], value);

    // Advance pointer for next call
    plot.ptr = (ptr + 1) & mask;

    // Reset the next slot for fresh min/max
    const nextPtr = plot.ptr;
    plot.maxValues[nextPtr] = value;
    plot.minValues[nextPtr] = value;
}

/**
 * Get the value at a specific buffer index for a plot.
 * Returns the average of max and min as an approximation.
 */
export function getScopeValue(
    plot: ScopePlotConfig,
    bufIndex: number,
): { max: number; min: number } {
    return {
        max: plot.maxValues[bufIndex],
        min: plot.minValues[bufIndex],
    };
}
