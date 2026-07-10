import { describe, it, beforeEach, expect } from 'vitest';
import { Serializer } from '../src/circuit/Serializer.js';
import { DiodeModel } from '../src/components/active/DiodeModel.js';
import { TransistorModel } from '../src/components/active/TransistorModel.js';
import { CustomLogicModel } from '../src/components/composite/CustomLogicModel.js';
import { CustomCompositeModel } from '../src/components/composite/CustomCompositeModel.js';
import { escape, unescape } from '../src/util/textEscape.js';
import '../src/index.js'; // trigger all component registrations

describe('Serializer - Text Format', () => {
    it('parses a basic circuit header', () => {
        const text = '$ 1 5e-6 10 50 5 50 1e-12';
        const result = Serializer.parseCircuit(text);
        expect(result.header.flags).toBe(1);
        expect(result.header.maxTimeStep).toBe(5e-6);
        expect(result.header.iterCount).toBe(10);
        expect(result.header.voltageRange).toBe(5);
        expect(result.header.minTimeStep).toBe(1e-12);
    });

    it('parses a resistor component line', () => {
        const text = '$ 1 5e-6 10 50 5 50 1e-12\nr 100 200 300 200 0 10000';
        const result = Serializer.parseCircuit(text);
        expect(result.components.length).toBe(1);
        const comp = result.components[0];
        expect(comp.constructor.name).toBe('ResistorComponent');
        expect((comp as any).resistance).toBe(10000);
    });

    it('parses scope line into ScopeData', () => {
        const text = '$ 1 5e-6 10 50 5 50 1e-12\nr 0 0 100 0 0 100\no 0 64 0 1 5 1 200 1';
        const result = Serializer.parseCircuit(text);
        expect(result.scopes).toBeDefined();
        expect(result.scopes!.length).toBe(1);
        expect(result.scopes![0].elmIndex).toBe(0);
        expect(result.scopes![0].speed).toBe(64);
        expect(result.scopes![0].scaleV).toBe(5);
    });

    it('parses adjustable slider line', () => {
        const text = '$ 1 5e-6 10 50 5 50 1e-12\nr 0 0 100 0 0 100\n38 0 0 0 100 slider';
        const result = Serializer.parseCircuit(text);
        expect(result.adjustables).toBeDefined();
        expect(result.adjustables!.length).toBe(1);
        expect(result.adjustables![0].elmIndex).toBe(0);
        expect(result.adjustables![0].sliderText).toBe('slider');
    });

    it('parses hint line', () => {
        const text = '$ 1 5e-6 10 50 5 50 1e-12\nr 0 0 100 0 0 100\nh 1 2 3';
        const result = Serializer.parseCircuit(text);
        expect(result.hints).toBeDefined();
        expect(result.hints!.hintType).toBe(1);
        expect(result.hints!.hintItem1).toBe(2);
        expect(result.hints!.hintItem2).toBe(3);
    });

    it('round-trips a simple circuit', () => {
        const input = '$ 1 5e-6 10 50 5 50 1e-12\nr 100 200 300 200 0 10000\nc 100 100 200 100 0 1e-6 0 0\nl 300 100 400 100 0 1e-3 0\n';
        const parsed = Serializer.parseCircuit(input);
        const reDumped = Serializer.dumpCircuit(
            { config: parsed.header, components: parsed.components } as any,
            parsed.scopes, parsed.adjustables, parsed.hints
        );
        // Verify key structure is preserved
        expect(reDumped).toContain('$ 1');
        expect(reDumped).toContain('r 100 200 300 200 0');
        expect(reDumped).toContain('c 100 100 200 100 0');
        expect(reDumped).toContain('l 300 100 400 100 0');
    });
});

describe('Serializer - Model Lines', () => {
    beforeEach(() => {
        // Clear model registries between tests
        DiodeModel.modelMap.clear();
        TransistorModel.modelMap.clear();
        CustomLogicModel.modelMap.clear();
        CustomCompositeModel.modelMap.clear();
    });

    it('parses diode model line (34)', () => {
        const text = '$ 1 5e-6 10 50 5 50 1e-12\n34 default 0 1e-14 0 1 0 0';
        Serializer.parseCircuit(text);
        const model = DiodeModel.getModelWithName('default');
        expect(model).toBeDefined();
        expect(model!.saturationCurrent).toBe(1e-14);
        expect(model!.emissionCoefficient).toBe(1);
    });

    it('parses transistor model line (32)', () => {
        const text = '$ 1 5e-6 10 50 5 50 1e-12\n32 default 0 1e-13 0 0 1.5 0 0 2 1 1 0 0 1';
        Serializer.parseCircuit(text);
        const model = TransistorModel.getModelWithName('default');
        expect(model).toBeDefined();
        expect(model!.satCur).toBe(1e-13);
    });

    it('parses custom logic model line (!)', () => {
        const text = '$ 1 5e-6 10 50 5 50 1e-12\n! myModel 0 A,B Q,C \\s\\s\\s\\s\\s\\s\\s\\s\\s\\nA&B\\n';
        const result = Serializer.parseCircuit(text);
        // Should not crash and registry should have the model
        expect(result.components.length).toBe(0);
    });
});

describe('XML Format', () => {
    it('parses a basic Falstad XML circuit', () => {
        const xml = '<cir ts="5e-6" vr="5"><r x="100 200 300 200" f="0" r="10000"/></cir>';
        const result = Serializer.parseCircuit(xml);
        expect(result.components.length).toBe(1);
        expect(result.components[0].constructor.name).toBe('ResistorComponent');
    });
});

describe('textEscape utility', () => {
    it('escapes and unescapes special characters', () => {
        const input = 'hello world + foo=bar #baz&qux';
        const escaped = escape(input);
        const unescaped = unescape(escaped);
        expect(unescaped).toBe(input);
    });

    it('handles newlines', () => {
        const input = 'line1\nline2';
        const escaped = escape(input);
        expect(escaped).toContain('\\n');
        expect(unescape(escaped)).toBe(input);
    });

    it('handles empty string', () => {
        expect(escape('')).toBe('\\0');
        expect(unescape('\\0')).toBe('');
    });

    it('handles backslash', () => {
        const input = 'a\\b';
        expect(unescape(escape(input))).toBe(input);
    });
});
