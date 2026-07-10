import type { Polygon, Rect } from '@circuitjs/shared';

/**
 * Create a Polygon from x/y coordinate arrays.
 */
export function createPolygon(xpoints: number[], ypoints: number[]): Polygon {
    const npoints = Math.min(xpoints.length, ypoints.length);
    const bb = computeBoundingBox(xpoints, ypoints, npoints);
    return { npoints, xpoints: xpoints.slice(0, npoints), ypoints: ypoints.slice(0, npoints), boundingBox: bb };
}

/**
 * Compute the bounding box of a set of points.
 */
export function computeBoundingBox(xpoints: number[], ypoints: number[], npoints: number): Rect {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < npoints; i++) {
        if (xpoints[i] < minX) minX = xpoints[i];
        if (ypoints[i] < minY) minY = ypoints[i];
        if (xpoints[i] > maxX) maxX = xpoints[i];
        if (ypoints[i] > maxY) maxY = ypoints[i];
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Test whether a point is inside a polygon (ray casting algorithm).
 */
export function polygonContains(poly: Polygon, px: number, py: number): boolean {
    let inside = false;
    for (let i = 0, j = poly.npoints - 1; i < poly.npoints; j = i++) {
        const xi = poly.xpoints[i], yi = poly.ypoints[i];
        const xj = poly.xpoints[j], yj = poly.ypoints[j];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

/**
 * Translate (offset) all points in a polygon.
 */
export function polygonTranslate(poly: Polygon, dx: number, dy: number): Polygon {
    const xpoints = poly.xpoints.map(x => x + dx);
    const ypoints = poly.ypoints.map(y => y + dy);
    return createPolygon(xpoints, ypoints);
}
