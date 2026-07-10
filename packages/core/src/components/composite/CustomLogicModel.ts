/**
 * CustomLogicModel — stores boolean expressions for CustomLogicComponent.
 * Each output has a rule: a boolean expression string + optional hold flag.
 */
import { escape as esc, unescape as unesc } from '../../util/textEscape.js';

export interface CustomLogicRule {
    expr: string;
    hold: boolean;
}

const modelCache = new Map<string, CustomLogicModel>();

export class CustomLogicModel {
    /** Static registry of named logic models */
    static readonly modelMap = new Map<string, CustomLogicModel>();

    inputs: string[] = ['A', 'B'];
    outputs: string[] = ['Q'];
    rules: CustomLogicRule[] = [{ expr: 'A&B', hold: false }];
    chipWidth = 4;
    chipHeight = 3;

    /** Model name (empty for inline/default models) */
    name = '';
    infoText = '';
    /** Whether this model has been dumped in the current dumpCircuit pass */
    dumped = false;

    /** Reset dumped flags for all models */
    static clearDumpedFlags(): void {
        for (const model of CustomLogicModel.modelMap.values()) {
            model.dumped = false;
        }
    }

    /** Unique key for model caching */
    get key(): string {
        return `${this.inputs.join(',')}|${this.outputs.join(',')}|${this.rules.map(r => `${r.expr}:${r.hold}`).join(';')}`;
    }

    /** Evaluate all output expressions given input values */
    evaluate(inputValues: boolean[]): boolean[] {
        const vars = new Map<string, boolean>();
        for (let i = 0; i < this.inputs.length; i++) {
            vars.set(this.inputs[i], inputValues[i]);
        }

        return this.rules.map(rule => {
            if (rule.hold) return false; // hold is handled externally
            return this.evalExpr(rule.expr, vars);
        });
    }

    /** Evaluate a boolean expression recursively */
    private evalExpr(expr: string, vars: Map<string, boolean>): boolean {
        expr = expr.trim();
        if (expr.length === 0) return false;

        // Handle parentheses: find top-level | and & operators
        let parenDepth = 0;
        let orIdx = -1;
        let andIdx = -1;
        let xorIdx = -1;

        for (let i = expr.length - 1; i >= 0; i--) {
            const ch = expr[i];
            if (ch === ')') parenDepth++;
            else if (ch === '(') parenDepth--;
            else if (parenDepth === 0) {
                if (ch === '|' && orIdx < 0) orIdx = i;
                if (ch === '^' && xorIdx < 0) xorIdx = i;
                if (ch === '&' && andIdx < 0) andIdx = i;
            }
        }

        // Order of operations: | then ^ then &
        if (orIdx >= 0) {
            return this.evalExpr(expr.slice(0, orIdx), vars) ||
                   this.evalExpr(expr.slice(orIdx + 1), vars);
        }
        if (xorIdx >= 0) {
            return this.evalExpr(expr.slice(0, xorIdx), vars) !==
                   this.evalExpr(expr.slice(xorIdx + 1), vars);
        }
        if (andIdx >= 0) {
            return this.evalExpr(expr.slice(0, andIdx), vars) &&
                   this.evalExpr(expr.slice(andIdx + 1), vars);
        }

        // Handle NOT prefix
        if (expr[0] === '!') {
            return !this.evalExpr(expr.slice(1), vars);
        }

        // Handle parentheses wrapper
        if (expr[0] === '(' && expr[expr.length - 1] === ')') {
            return this.evalExpr(expr.slice(1, -1), vars);
        }

        // Handle constants
        if (expr === '0') return false;
        if (expr === '1') return true;

        // Handle variables
        return vars.get(expr) ?? false;
    }

    static create(inputs: string[], outputs: string[], rules: CustomLogicRule[]): CustomLogicModel {
        const model = new CustomLogicModel();
        model.inputs = inputs;
        model.outputs = outputs;
        model.rules = rules;
        model.chipWidth = Math.max(3, inputs.length + 1);
        model.chipHeight = Math.max(3, Math.max(inputs.length, outputs.length));
        return model;
    }

    /** Get or create a cached model by key */
    static getOrCreate(inputs: string[], outputs: string[], rules: CustomLogicRule[]): CustomLogicModel {
        const model = CustomLogicModel.create(inputs, outputs, rules);
        const key = model.key;
        if (!modelCache.has(key)) {
            modelCache.set(key, model);
        }
        return modelCache.get(key)!;
    }

    private static arrayToList(arr: string[]): string {
        return arr.join(',');
    }

    /** Serialize this model as a "!" dump line (matching Java CustomLogicModel.dump) */
    dump(): string {
        this.dumped = true;
        const rulesStr = this.rules.map((r, i) =>
            `${esc(this.outputs[i] || `O${i}`)}=${esc(r.expr)}`
        ).join('\n');
        return `! ${esc(this.name)} 0 ${esc(CustomLogicModel.arrayToList(this.inputs))} ${esc(CustomLogicModel.arrayToList(this.outputs))} ${esc(this.infoText)} ${esc(rulesStr)}`;
    }

    /** Parse a "!" model line and store in the registry */
    static undumpModel(tokens: string[], startIndex: number): CustomLogicModel | null {
        if (tokens.length < startIndex + 5) return null;
        const name = unesc(tokens[startIndex]);
        const flags = parseInt(tokens[startIndex + 1]) || 0;
        const inputsStr = unesc(tokens[startIndex + 2]);
        const outputsStr = unesc(tokens[startIndex + 3]);
        const infoText = unesc(tokens[startIndex + 4]);
        // Remaining tokens form the rules string (after unescaping)
        const rulesStr = tokens.slice(startIndex + 5).map(t => unesc(t)).join(' ');

        const inputs = inputsStr ? inputsStr.split(',').filter(Boolean) : ['A', 'B'];
        const outputs = outputsStr ? outputsStr.split(',').filter(Boolean) : ['Q'];

        const rules: CustomLogicRule[] = [];
        const ruleLines = rulesStr.split('\n').filter(Boolean);
        for (const line of ruleLines) {
            const eqIdx = line.indexOf('=');
            if (eqIdx >= 0) {
                const outName = line.substring(0, eqIdx).trim();
                const expr = line.substring(eqIdx + 1).trim();
                const outIdx = outputs.indexOf(outName);
                const hold = outIdx >= 0 ? (flags & (1 << (16 + outIdx))) !== 0 : false;
                rules.push({ expr, hold });
            }
        }

        // Fallback: if no rules parsed, create dummy rules for each output
        if (rules.length === 0) {
            for (const _ of outputs) {
                rules.push({ expr: '0', hold: false });
            }
        }

        const model = CustomLogicModel.create(inputs, outputs, rules);
        model.name = name;
        model.infoText = infoText;
        model.dumped = true;
        CustomLogicModel.modelMap.set(name, model);
        return model;
    }
}

export function parseCustomLogicModel(exprStr: string): CustomLogicModel | null {
    try {
        // Format: inputs[i,j,...] outputs[x,y,...] rules[expr1:hold1,expr2:hold2,...]
        const inMatch = exprStr.match(/inputs\[([^\]]*)\]/);
        const outMatch = exprStr.match(/outputs\[([^\]]*)\]/);
        const rulesMatch = exprStr.match(/rules\[([^\]]*)\]/);

        if (!inMatch || !outMatch || !rulesMatch) return null;

        const inputs = inMatch[1].split(',').map(s => s.trim()).filter(Boolean);
        const outputs = outMatch[1].split(',').map(s => s.trim()).filter(Boolean);
        const rulesParts = rulesMatch[1].split(',').map(s => s.trim()).filter(Boolean);

        const rules: CustomLogicRule[] = rulesParts.map(p => {
            const [expr, holdStr] = p.split(':');
            return {
                expr: expr?.trim() || '0',
                hold: holdStr === 'hold',
            };
        });

        return CustomLogicModel.getOrCreate(inputs, outputs, rules);
    } catch {
        return null;
    }
}
