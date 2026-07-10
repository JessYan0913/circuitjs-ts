# 模块 4 — 半导体与模拟有源

> **目标**: 完整实现二极管、晶体管、运放等模拟有源器件。
> **优先级**: P1 — 模拟/数字元件补全
> **原始 Java 源码位置**: `E:\circuitjs1\src\com\lushprojects\circuitjs1\client\`

---

## 4.1 二极管 `DiodeElm.java`

**TS**: `packages/core/components/active/DiodeComponent.ts`
**TS 模型**: `packages/core/components/active/DiodeModel.ts`

- [x] **dump type**: `d` — 格式: `d x1 y1 x2 y2 flags`
- [x] **肖特基方程**: `I = Is * (exp(V/(N*Vt)) - 1)`, `Vt = kT/q = 0.025865`
- [x] **牛顿迭代**: `doStep()` 调用 `DiodeModel.doStep()`，`limitStep()` 电压增量限幅
- [x] **gmin 步进**: 大迭代次数时逐步减小 gmin 辅助收敛
- [x] **`DiodeModel` 类**: 含 saturationCurrent, emissionCoefficient, vcrit 计算
- [x] **绘制**: 三角形（填充）+ 竖线（阴极）+ 电压着色引线
- [x] **nonLinear()**: 返回 true
- [x] **getEditInfo**: Saturation current (Is), Emission coefficient (N)
- [x] **getShortcut**: `d`

### 待完善

- [ ] **内置模型库**: 1N4148, 1N4001 等模型参数预设
- [ ] **dump 含 modelName**: 原始格式含模型名

---

## 4.2 稳压管 `ZenerElm.java`

- [ ] **dump type**: `z`（Java 中字符 `'z'`）
- [ ] **特性**: 反向击穿电压 `Vz`，击穿区陡峭斜率
- [ ] **绘制**: 二极管符号 + Z 形弯折

---

## 4.3 变容二极管 `VaractorElm.java`

- [ ] **dump type**: `vc`（Java 中 type=176）
- [ ] **特性**: 电容随反向偏压变化

---

## 4.4 隧道二极管 `TunnelDiodeElm.java`

- [ ] **dump type**: `td`（Java 中 type=175）
- [ ] **特性**: 负阻区（N 形 I-V 曲线）

---

## 4.5 晶体管

### 4.5.1 NPN `NTransistorElm.java` / PNP `PTransistorElm.java`

**TS**: `packages/core/components/active/TransistorComponent.ts`

- [x] **dump type**: `t` — 格式: `t x1 y1 x2 y2 flags isPNP vbc vbe beta`
- [x] **Ebers-Moll 模型**: 双二极管 + VCCS 电流源
- [x] **3 post**: B(0), C(1), E(2)
- [x] **牛顿迭代**: `doStep()` 线性化，含 `limitStep()` 电压限幅（~78mV）
- [x] **绘制**: 圆形 + Q_NPN/Q_PNP 标签
- [x] **getShortcut**: `t`

### 待完善

- [ ] **完整 Ebers-Moll**: 当前模型简化（alphaR=0.5 固定），需对齐 Java 参数化模型
- [ ] **`TransistorModel` 支持**: beta_f, beta_r, Vt, 内建电压
- [ ] **标准晶体管符号绘制**: 目前仅显示文字标签，需绘制三角形+箭头+基极引线

### 4.5.2 达林顿对 `DarlingtonElm.java` / `NDarlingtonElm.java` / `PDarlingtonElm.java`

- [ ] **dump type**: `dar` / `ndar` / `pdar`（Java 中 type=400）
- [ ] 两级级联，极高增益

---

## 4.6 MOSFET

| 元件 | dump type | Java type | 状态 |
|------|-----------|-----------|------|
| `NMosfetElm.java` | `f` | 字符 `'f'` | ❌ |
| `PMosfetElm.java` | `p` | 字符 `'p'` | ❌ |
| `MosfetElm.java` | `f` | 字符 `'f'` | ❌ |

**特性:**
- [ ] **4 post**: G, D, S, B (substrate) — 默认 body 接 source
- [ ] **增强型模型**: 阈值电压 Vth，Vds 饱和，沟道长度调制
- [ ] **nonLinear()**: true

---

## 4.7 JFET

| 元件 | dump type | Java type | 状态 |
|------|-----------|-----------|------|
| `NJfetElm.java` | `njf` | 字符 `'j'` | ❌ |
| `PJfetElm.java` | `pjf` | 字符 `'j'` | ❌ |
| `JfetElm.java` | `j` | 字符 `'j'` | ❌ |

---

## 4.8 运算放大器

| 元件 | dump type | Java type | 状态 | 说明 |
|------|-----------|-----------|------|------|
| `OpAmpElm.java` | `op` | 字符 `'a'` | ❌ | 理想运放（无限增益线性化） |
| `OpAmpRealElm.java` | `opr` | 409 | ❌ | 实际运放（有限增益、输出摆幅） |
| `OpAmpSwapElm.java` | `ops` | — | ❌ | 引脚互换 |

**OpAmp stamp 关键逻辑:**
- 理想运放：输出节点通过大跨导 gm 连接到差分输入
- 有限增益：`A0` 参数控制开环增益

---

## 4.9 其他有源器件

| 元件 | dump type | Java type | 状态 | 说明 |
|------|-----------|-----------|------|------|
| `OTAElm.java` | `ota` | 402 | ❌ | 跨导放大器 |
| `SCRElm.java` | `scr` | 177 | ❌ | 可控硅整流器 |
| `DiacElm.java` | `diac` | 203 | ❌ | 双向触发二极管 |
| `TriacElm.java` | `triac` | 206 | ❌ | 三端双向可控硅 |
| `TriodeElm.java` | `triode` | 173 | ❌ | 真空三极管 |
| `CC2Elm.java` | `cc2` | 179 | ❌ | 第二类电流传送器 |
| `CCCSElm.java` | `cccs` | 215 | ❌ | 电流控制电流源 |
| `CCVSElm.java` | `ccvs` | 214 | ❌ | 电流控制电压源 |
| `VCCSElm.java` | `vccs` | 213 | ❌ | 电压控制电流源 |
| `VCVSElm.java` | `vcvs` | 212 | ❌ | 电压控制电压源 |
| `OptocouplerElm.java` | `opt` | 407 | ❌ | 光电耦合器 |
| `ComparatorElm.java` | `comp` | 401 | ❌ | 比较器 |

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
