# 模块 4 — 半导体与模拟有源

> **目标**: 完整实现二极管、晶体管、运放等模拟有源器件。
> **优先级**: P1 — 模拟/数字元件补全

---

## 4.1 二极管 `DiodeElm.java`

**TS**: `packages/core/components/active/DiodeComponent.ts`

- [x] 基础已实现

**待完善:**

- [ ] **肖特基方程**: `I = Is * (exp(V/(N*Vt)) - 1)`, `Vt = kT/q`
- [ ] **牛顿迭代**: `stamp()` + `doIteration()`，`limitStep()` 电压增量限幅
- [ ] **`DiodeModel` 支持**: 内置 1N4148, 1N4001 等模型参数
- [ ] **dump type**: `d` — 格式: `d x1 y1 x2 y2 flags modelName`
- [ ] **绘制**: 三角形 + 竖线 + 引线

---

## 4.2 稳压管 `ZenerElm.java`

- [ ] **status**: ❌ 未实现
- [ ] **dump type**: `z`
- [ ] **特性**: 反向击穿电压 `Vz`，击穿区陡峭斜率
- [ ] **绘制**: 二极管符号 + Z 形弯折

---

## 4.3 变容二极管 `VaractorElm.java`

- [ ] **status**: ❌ 未实现
- [ ] **dump type**: `vc`
- [ ] **特性**: 电容随反向偏压变化

---

## 4.4 隧道二极管 `TunnelDiodeElm.java`

- [ ] **status**: ❌ 未实现
- [ ] **dump type**: `td`
- [ ] **特性**: 负阻区（N 形 I-V 曲线）

---

## 4.5 晶体管

### 4.5.1 NPN `NTransistorElm.java` / PNP `PTransistorElm.java`

**TS**: `packages/core/components/active/TransistorComponent.ts`

- [x] 基础已实现

**待完善:**

- [ ] **Ebers-Moll 模型**: 双二极管 + 双电流源
- [ ] **3 post**: B, C, E
- [ ] **`TransistorModel`**: beta_f, beta_r, Vt, 内建电压
- [ ] **绘制**: 标准晶体管符号（箭头、基极引线）
- [ ] **dump type**: `t`(NPN) / `T`(PNP)

### 4.5.2 达林顿对 `DarlingtonElm.java` / `NDarlingtonElm.java` / `PDarlingtonElm.java`

- [ ] **dump type**: `dar` / `ndar` / `pdar`
- [ ] 两级级联，极高增益

---

## 4.6 MOSFET

| 元件 | dump type | 状态 |
|------|-----------|------|
| `NMosfetElm.java` | `f` | ❌ |
| `PMosfetElm.java` | `p` | ❌ |

**特性:**

- [ ] **4 post**: G, D, S, B (substrate) — 默认 body 接 source
- [ ] **增强型模型**: 阈值电压 Vth，Vds 饱和，沟道长度调制
- [ ] **非线性的**: `nonLinear() = true`

---

## 4.7 JFET

| 元件 | dump type | 状态 |
|------|-----------|------|
| `NJfetElm.java` | `njf` | ❌ |
| `PJfetElm.java` | `pjf` | ❌ |

---

## 4.8 运算放大器

| 元件 | dump type | 状态 | 说明 |
|------|-----------|------|------|
| `OpAmpElm.java` | `op` | ❌ | 理想运放（无限增益线性化） |
| `OpAmpRealElm.java` | `opr` | ❌ | 实际运放（有限增益、输出摆幅） |
| `OpAmpSwapElm.java` | `ops` | ❌ | 引脚互换 |

**OpAmp stamp 关键逻辑:**
- 理想运放：输出节点通过大跨导 gm 连接到差分输入
- 有限增益：`A0` 参数控制开环增益

---

## 4.9 其他有源器件

| 元件 | dump type | 状态 | 说明 |
|------|-----------|------|------|
| `OTAElm.java` | `ota` | ❌ | 跨导放大器 |
| `SCRElm.java` | `scr` | ❌ | 可控硅整流器 |
| `DiacElm.java` | `diac` | ❌ | 双向触发二极管 |
| `TriacElm.java` | `triac` | ❌ | 三端双向可控硅 |
| `TriodeElm.java` | `triode` | ❌ | 真空三极管 |
| `CC2Elm.java` | `cc2` | ❌ | 第二类电流传送器 |
| `CCCSElm.java` | `cccs` | ❌ | 电流控制电流源 |
| `CCVSElm.java` | `ccvs` | ❌ | 电流控制电压源 |
| `VCCSElm.java` | `vccs` | ❌ | 电压控制电流源 |
| `VCVSElm.java` | `vcvs` | ❌ | 电压控制电压源 |
| `OptocouplerElm.java` | `opt` | ❌ | 光电耦合器 |

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
