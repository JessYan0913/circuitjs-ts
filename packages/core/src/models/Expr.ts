/**
 * Expression parser and evaluator for mathematical expressions.
 * Port of Java Expr.java / ExprParser / ExprState.
 *
 * Supports variables (a-i, t), numeric constants, math functions,
 * and operators: + - * / ^ %.
 *
 * Used by custom components that need runtime expression evaluation.
 */
export class ExprState {
    values: Float64Array;
    t: number;

    constructor() {
        this.values = new Float64Array(9);
        this.values[4] = Math.E; // e constant
        this.t = 0;
    }
}

export class Expr {
    children: Expr[];
    value: number;
    type: number;

    constructor(e1: Expr | null, e2: Expr | null, v: number);
    constructor(v: number, vv: number);
    constructor(v: number);
    constructor(e1: Expr | null | number, e2?: Expr | null | number, v?: number) {
        if (e1 instanceof Expr || e1 === null) {
            // (e1, e2, type) constructor
            this.children = [];
            if (e1 !== null) this.children.push(e1);
            if (e2 instanceof Expr) this.children.push(e2);
            this.type = v!;
            this.value = 0;
        } else if (typeof e1 === 'number' && v === undefined) {
            // (type) constructor — used for E_T, single-arg funcs
            this.type = e1;
            this.value = 0;
            this.children = [];
        } else {
            // (type, value) constructor
            this.type = e1;
            this.value = e2 as number;
            this.children = [];
        }
    }

    eval(es: ExprState): number {
        const left = this.children.length > 0 ? this.children[0] : null;
        const right = this.children.length === 2 ? this.children[1] : null;

        switch (this.type) {
            case Expr.E_ADD: return left!.eval(es) + right!.eval(es);
            case Expr.E_SUB: return left!.eval(es) - right!.eval(es);
            case Expr.E_MUL: return left!.eval(es) * right!.eval(es);
            case Expr.E_DIV: return left!.eval(es) / right!.eval(es);
            case Expr.E_POW: return Math.pow(left!.eval(es), right!.eval(es));
            case Expr.E_UMINUS: return -left!.eval(es);
            case Expr.E_VAL: return this.value;
            case Expr.E_T: return es.t;
            case Expr.E_SIN: return Math.sin(left!.eval(es));
            case Expr.E_COS: return Math.cos(left!.eval(es));
            case Expr.E_ABS: return Math.abs(left!.eval(es));
            case Expr.E_EXP: return Math.exp(left!.eval(es));
            case Expr.E_LOG: return Math.log(left!.eval(es));
            case Expr.E_SQRT: return Math.sqrt(left!.eval(es));
            case Expr.E_TAN: return Math.tan(left!.eval(es));
            case Expr.E_MIN: {
                let x = left!.eval(es);
                for (let i = 1; i < this.children.length; i++)
                    x = Math.min(x, this.children[i].eval(es));
                return x;
            }
            case Expr.E_MAX: {
                let x = left!.eval(es);
                for (let i = 1; i < this.children.length; i++)
                    x = Math.max(x, this.children[i].eval(es));
                return x;
            }
            case Expr.E_CLAMP:
                return Math.min(Math.max(left!.eval(es), this.children[1].eval(es)), this.children[2].eval(es));
            case Expr.E_STEP: {
                const x = left!.eval(es);
                if (right === null)
                    return (x < 0) ? 0 : 1;
                return (x > right.eval(es)) ? 0 : (x < 0) ? 0 : 1;
            }
            case Expr.E_SELECT: {
                const x = left!.eval(es);
                return this.children[x > 0 ? 2 : 1].eval(es);
            }
            case Expr.E_TRIANGLE: {
                const x = this.posmod(left!.eval(es), Math.PI * 2) / Math.PI;
                return (x < 1) ? -1 + x * 2 : 3 - x * 2;
            }
            case Expr.E_SAWTOOTH: {
                const x = this.posmod(left!.eval(es), Math.PI * 2) / Math.PI;
                return x - 1;
            }
            case Expr.E_MOD:
                return left!.eval(es) % right!.eval(es);
            case Expr.E_PWL:
                return this.pwl(es);
            case Expr.E_PWR:
                return Math.pow(Math.abs(left!.eval(es)), right!.eval(es));
            case Expr.E_PWRS: {
                const x = left!.eval(es);
                if (x < 0)
                    return -Math.pow(-x, right!.eval(es));
                return Math.pow(x, right!.eval(es));
            }
            default:
                if (this.type >= Expr.E_A)
                    return es.values[this.type - Expr.E_A];
                return 0;
        }
    }

    private pwl(es: ExprState): number {
        const args = this.children;
        const x = args[0].eval(es);
        let x0 = args[1].eval(es);
        let y0 = args[2].eval(es);
        if (x < x0) return y0;
        let x1 = args[3].eval(es);
        let y1 = args[4].eval(es);
        let i = 5;
        while (true) {
            if (x < x1)
                return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
            if (i + 1 >= args.length)
                break;
            x0 = x1;
            y0 = y1;
            x1 = args[i].eval(es);
            y1 = args[i + 1].eval(es);
            i += 2;
        }
        return y1;
    }

    private posmod(x: number, y: number): number {
        x %= y;
        return (x >= 0) ? x : x + y;
    }

    static readonly E_ADD = 1;
    static readonly E_SUB = 2;
    static readonly E_T = 3;
    static readonly E_VAL = 6;
    static readonly E_MUL = 7;
    static readonly E_DIV = 8;
    static readonly E_POW = 9;
    static readonly E_UMINUS = 10;
    static readonly E_SIN = 11;
    static readonly E_COS = 12;
    static readonly E_ABS = 13;
    static readonly E_EXP = 14;
    static readonly E_LOG = 15;
    static readonly E_SQRT = 16;
    static readonly E_TAN = 17;
    static readonly E_R = 18;
    static readonly E_MAX = 19;
    static readonly E_MIN = 20;
    static readonly E_CLAMP = 21;
    static readonly E_PWL = 22;
    static readonly E_TRIANGLE = 23;
    static readonly E_SAWTOOTH = 24;
    static readonly E_MOD = 25;
    static readonly E_STEP = 26;
    static readonly E_SELECT = 27;
    static readonly E_PWR = 28;
    static readonly E_PWRS = 29;
    static readonly E_A = 30; // must be last
}

export class ExprParser {
    text: string;
    token = '';
    pos: number;
    tlen: number;
    err: boolean;

    constructor(s: string) {
        this.text = s.toLowerCase();
        this.tlen = this.text.length;
        this.pos = 0;
        this.err = false;
        this.getToken();
    }

    private getToken(): void {
        while (this.pos < this.tlen && this.text.charAt(this.pos) === ' ')
            this.pos++;
        if (this.pos === this.tlen) {
            this.token = '';
            return;
        }
        let i = this.pos;
        const c = this.text.charAt(i);
        if ((c >= '0' && c <= '9') || c === '.') {
            for (i = this.pos; i !== this.tlen; i++) {
                if (this.text.charAt(i) === 'e' || this.text.charAt(i) === 'E') {
                    i++;
                    if (i < this.tlen && (this.text.charAt(i) === '+' || this.text.charAt(i) === '-'))
                        i++;
                }
                if (!((this.text.charAt(i) >= '0' && this.text.charAt(i) <= '9') ||
                    this.text.charAt(i) === '.'))
                    break;
            }
        } else if (c >= 'a' && c <= 'z') {
            for (i = this.pos; i !== this.tlen; i++) {
                if (!(this.text.charAt(i) >= 'a' && this.text.charAt(i) <= 'z'))
                    break;
            }
        } else {
            i++;
        }
        this.token = this.text.substring(this.pos, i);
        this.pos = i;
    }

    private skip(s: string): boolean {
        if (this.token !== s) return false;
        this.getToken();
        return true;
    }

    private skipOrError(s: string): void {
        if (!this.skip(s)) this.err = true;
    }

    parseExpression(): Expr {
        if (this.token.length === 0)
            return new Expr(Expr.E_VAL, 0);
        const e = this.parse();
        if (this.token.length > 0)
            this.err = true;
        return e;
    }

    gotError(): boolean {
        return this.err;
    }

    private parse(): Expr {
        let e = this.parseMult();
        while (true) {
            if (this.skip('+'))
                e = new Expr(e, this.parseMult(), Expr.E_ADD);
            else if (this.skip('-'))
                e = new Expr(e, this.parseMult(), Expr.E_SUB);
            else
                break;
        }
        return e;
    }

    private parseMult(): Expr {
        let e = this.parseUminus();
        while (true) {
            if (this.skip('*'))
                e = new Expr(e, this.parseUminus(), Expr.E_MUL);
            else if (this.skip('/'))
                e = new Expr(e, this.parseUminus(), Expr.E_DIV);
            else
                break;
        }
        return e;
    }

    private parseUminus(): Expr {
        this.skip('+');
        if (this.skip('-'))
            return new Expr(this.parsePow(), null, Expr.E_UMINUS);
        return this.parsePow();
    }

    private parsePow(): Expr {
        let e = this.parseTerm();
        while (true) {
            if (this.skip('^'))
                e = new Expr(e, this.parseTerm(), Expr.E_POW);
            else
                break;
        }
        return e;
    }

    private parseFunc(t: number): Expr {
        this.skipOrError('(');
        const e = this.parse();
        this.skipOrError(')');
        return new Expr(e, null, t);
    }

    private parseFuncMulti(t: number, _minArgs: number, _maxArgs: number): Expr {
        let args = 1;
        this.skipOrError('(');
        const e1 = this.parse();
        const e = new Expr(e1, null, t);
        while (this.skip(',')) {
            const enext = this.parse();
            e.children.push(enext);
            args++;
        }
        this.skipOrError(')');
        if (args < _minArgs || args > _maxArgs)
            this.err = true;
        return e;
    }

    private parseTerm(): Expr {
        if (this.skip('(')) {
            const e = this.parse();
            this.skipOrError(')');
            return e;
        }
        if (this.skip('t'))
            return new Expr(Expr.E_T);
        if (this.token.length === 1) {
            const c = this.token.charAt(0);
            if (c >= 'a' && c <= 'i') {
                this.getToken();
                return new Expr(Expr.E_A + (c.charCodeAt(0) - 'a'.charCodeAt(0)));
            }
        }
        if (this.skip('pi'))
            return new Expr(Expr.E_VAL, 3.14159265358979323846);
        if (this.skip('sin')) return this.parseFunc(Expr.E_SIN);
        if (this.skip('cos')) return this.parseFunc(Expr.E_COS);
        if (this.skip('abs')) return this.parseFunc(Expr.E_ABS);
        if (this.skip('exp')) return this.parseFunc(Expr.E_EXP);
        if (this.skip('log')) return this.parseFunc(Expr.E_LOG);
        if (this.skip('sqrt')) return this.parseFunc(Expr.E_SQRT);
        if (this.skip('tan')) return this.parseFunc(Expr.E_TAN);
        if (this.skip('tri')) return this.parseFunc(Expr.E_TRIANGLE);
        if (this.skip('saw')) return this.parseFunc(Expr.E_SAWTOOTH);
        if (this.skip('min')) return this.parseFuncMulti(Expr.E_MIN, 2, 1000);
        if (this.skip('max')) return this.parseFuncMulti(Expr.E_MAX, 2, 1000);
        if (this.skip('pwl')) return this.parseFuncMulti(Expr.E_PWL, 2, 1000);
        if (this.skip('mod')) return this.parseFuncMulti(Expr.E_MOD, 2, 2);
        if (this.skip('step')) return this.parseFuncMulti(Expr.E_STEP, 1, 2);
        if (this.skip('select')) return this.parseFuncMulti(Expr.E_SELECT, 3, 3);
        if (this.skip('clamp')) return this.parseFuncMulti(Expr.E_CLAMP, 3, 3);
        if (this.skip('pwr')) return this.parseFuncMulti(Expr.E_PWR, 2, 2);
        if (this.skip('pwrs')) return this.parseFuncMulti(Expr.E_PWRS, 2, 2);
        try {
            const e = new Expr(Expr.E_VAL, parseFloat(this.token));
            this.getToken();
            return e;
        } catch (_e) {
            this.err = true;
            return new Expr(Expr.E_VAL, 0);
        }
    }
}
