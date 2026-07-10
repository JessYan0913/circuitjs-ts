import type { Point } from '@circuitjs/shared';

/**
 * Create a new point with given coordinates.
 */
export function createPoint(x: number, y: number): Point {
    return { x, y };
}

/**
 * Copy a point (copy constructor equivalent).
 */
export function copyPoint(p: Point): Point {
    return { x: p.x, y: p.y };
}

/**
 * Set location from another point (matches Java Point.setLocation).
 */
export function setLocation(p: Point, other: Point): void {
    p.x = other.x;
    p.y = other.y;
}

/**
 * Check if two points have equal coordinates (matches Java Point.equals).
 */
export function pointEquals(a: Point, b: Point): boolean {
    return a.x === b.x && a.y === b.y;
}

/**
 * Hash code for a point (matches Java Point.hashCode: 41 * (41 + x) + y).
 */
export function pointHashCode(p: Point): number {
    return 41 * (41 + p.x) + p.y;
}

/**
 * Distance between two points.
 */
export function pointDistance(a: Point, b: Point): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Squared distance between two points (avoids sqrt).
 */
export function pointDistanceSq(a: Point, b: Point): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

/**
 * Linear interpolation between two points.
 */
export function pointLerp(a: Point, b: Point, t: number): Point {
    return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
    };
}

/**
 * Point string representation (matches Java Point.toString).
 */
export function pointToString(p: Point): string {
    return `Point(${p.x},${p.y})`;
}
