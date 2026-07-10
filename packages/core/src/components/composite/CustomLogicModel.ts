/**
 * CustomLogicModel — stores boolean expressions for CustomLogicComponent.
 * Each output has a rule: a boolean expression string + optional hold flag.
 */
export interface CustomLogicRule {
    expr: string;
    hold: boolean;
}

const modelCache = new Map<string, CustomLogicModel>();

export class CustomLogicModel {
    inputs: string[] = ['A', 'B'];
    outputs: string[] = ['Q'];
    rules: CustomLogicRule[] = [{ expr: 'A&B', hold: false }];
    chipWidth = 4;
    chipHeight = 3;

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
