import { type ComponentConstructor, CircuitComponent } from './base/CircuitComponent.js';

const codeMap = new Map<number | string, ComponentConstructor>();
const nameMap = new Map<string, ComponentConstructor>();

export function registerComponent(code: number | string, name: string, ctor: ComponentConstructor): void {
    // Only register if not already registered to avoid overwrite
    // The first registration (typically the base type) takes priority
    if (!codeMap.has(code)) {
        codeMap.set(code, ctor);
    }
    nameMap.set(name, ctor);
}

export function createComponentByCode(code: number | string, x1: number, y1: number, x2: number, y2: number, flags: number): CircuitComponent | null {
    const ctor = codeMap.get(code);
    if (!ctor) return null;
    return CircuitComponent.fromDump(ctor, x1, y1, x2, y2, flags);
}

export function createComponentByName(name: string, x: number, y: number): CircuitComponent | null {
    const ctor = nameMap.get(name);
    if (!ctor) return null;
    return CircuitComponent.create(ctor, x, y);
}

export function hasComponentCode(code: number | string): boolean {
    return codeMap.has(code);
}

export function getAllRegisteredNames(): string[] {
    return [...nameMap.keys()];
}
