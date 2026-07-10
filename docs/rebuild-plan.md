# CircuitJS1 → CircuitJS-Next 逐模块对照复刻计划

> 本文档是 circuitjs1 (Java/GWT) 到 circuitjs-next (TypeScript/React) 重建的完整对照计划。
> 涵盖 18 个模块，逐一列出原始 Java 文件、对应目标 TS 文件、当前实现状态和待完善细节。

---

## 目录

- [模块 0 — 基础层 (Base Layer)](#模块-0--基础层-base-layer)
- [模块 1 — MNA 矩阵求解器](#模块-1--mna-矩阵求解器)
- [模块 2 — 无源元件](#模块-2--无源元件)
- [模块 3 — 电源与信号源](#模块-3--电源与信号源)
- [模块 4 — 半导体与模拟有源](#模块-4--半导体与模拟有源)
- [模块 5 — 数字逻辑](#模块-5--数字逻辑)
- [模块 6 — 变压器、传输线、机电](#模块-6--变压器传输线机电)
- [模块 7 — 测量与显示](#模块-7--测量与显示)
- [模块 8 — 传感器与特殊器件](#模块-8--传感器与特殊器件)
- [模块 9 — 序列化/解析器](#模块-9--序列化解析器)
- [模块 10 — Canvas 绘制系统](#模块-10--canvas-绘制系统)
- [模块 11 — 交互系统](#模块-11--交互系统)
- [模块 12 — UI 层（菜单、工具栏、对话框）](#模块-12--ui-层菜单工具栏对话框)
- [模块 13 — 示波器 (Scope)](#模块-13--示波器-scope)
- [模块 14 — 自定义复合元件](#模块-14--自定义复合元件)
- [模块 15 — 高级模型](#模块-15--高级模型)
- [模块 16 — Electron 桌面应用](#模块-16--electron-桌面应用)
- [模块 17 — MCP Server](#模块-17--mcp-server)
- [模块 18 — 示例电路库](#模块-18--示例电路库)
- [执行优先级路线图](#执行优先级路线图)

---

## 模块 0 — 基础层 (Base Layer)

### 原始 Java 文件

| 文件 | 说明 |
|---|---|
| `CircuitElm.java` | 所有元件的抽象基类，定义 stamp/draw/getInfo 等核心接口 |
| `CircuitNode.java` | 电路节点，维护连接到该节点的元件列表 |
| `CircuitNodeLink.java` | 元件到节点的单向链接 |
| `Point.java` | 整数坐标点 |
| `Polygon.java` | 多边形 |
| `Rectangle.java` | 矩形 |
| `Color.java` | 颜色包装（GWT 版，无 alpha） |
| `Font.java` | 字体包装 |
| `Graphics.java` | 2D 图形上下文（所有绘制最终调用此接口） |
| `GraphicElm.java` | 非电气图形元件的基类 |
| `Adjustable.java` | 可调参数接口（绑定滑块） |
| `RowInfo.java` | 矩阵行类型标记 |

### 目标 TS 文件

| 文件 | 对等 |
|---|---|
| `packages/core/components/base/CircuitComponent.ts` | `CircuitElm.java` |
| `packages/core/components/base/` | 新增 |
| `packages/shared/src/types.ts` | 节点/链接/几何类型 |
| `packages/core/matrix/RowInfo.ts` | `RowInfo.java` |
| `packages/ui/canvas/CanvasGraphics.ts` | `Graphics.java` |

### 当前状态与待完善

- [x] `CircuitComponent` 基类基本结构已搭建（stamp, draw, getInfo 接口）
- [x] 节点分配、NodeMap 机制已实现
- [x] 矩阵 RowInfo 已搬运

**待完善：**

- [ ] **`getInfo()` 的返回格式与原始完全对齐** — 原始返回 `String[]`，每行一个信息。TS 端需确保格式一致（状态栏显示依赖此接口）
- [ ] **`getDumpId()` / `getDumpClass()`** — 序列化标识符字符串与原始必须 1:1 对应（例如电阻是 `"r"`，电容是 `"c"`）
- [ ] **`needsShortcut()` / `getShortcut()`** — 键盘快捷键映射
- [ ] **`setBoundingBox()` + boundingBox** — 命中检测依赖此框，当前 TS 缺失
- [ ] **`getPost(n)` — 节点坐标访问** — 简单元件 2 个 post，芯片类有多个（最多 128）
- [ ] **`volts[]` 数组** — 每个引脚电压存储
- [ ] **`current` 属性** — 主电流值
- [ ] **`currentLabel` 显示**
- [ ] **封装后缀/前缀格式** — 电阻是 `"R"`，电容是 `"C"`，用于电路图标签
- [ ] **`Point` 类** — 当前使用模拟值对象，需确保 `equals`/`hashCode` 一致
- [ ] **`Graphics` API 完整覆盖**：`drawLine`, `drawCoil`, `drawThickLine`, `drawThickCircle`, `fillPolygon`, `drawString`, `setColor`, `setFont`, `drawRoundRect`, `fillRect`, `drawPolygon`, `setClip`, 等
- [ ] **电压颜色映射 `getVoltageColor(v)`** — 将节点电压（-5V ~ 5V）映射到彩虹色
- [ ] **选色函数** — `selectColor`, `needsHighlight`, `lightGrayColor`, `selectedColor` 等

---

## 模块 1 — MNA 矩阵求解器

### 原始 Java 文件

| 文件 | 说明 |
|---|---|
| `CirSim.java` — 矩阵构建/求解部分 | 主（MNA 增减行、`createMatrix`、`simplifyMatrix`） |
| `RowInfo.java` | 行类型 |
| `Diode.java` | 非线性二极管模型（牛顿迭代） |
| `Inductor.java` | 电感伴随模型（梯形/后向欧拉） |

### 目标 TS 文件

| 文件 | 说明 |
|---|---|
| `packages/core/matrix/MNAMatrix.ts` | 矩阵数据结构 |
| `packages/core/matrix/LUSolver.ts` | LU 分解 + 前代/回代 |
| `packages/core/matrix/RowInfo.ts` | 行类型枚举 |
| `packages/core/circuit/SimulationManager.ts` | stamp 统筹、transient 循环、迭代控制 |

### 当前状态

**核心数值计算已基本实现。** 包括：

- [x] LU 分解（选主元）
- [x] MNA 矩阵构建和 stamp
- [x] `simplifyMatrix()` — 消去已知电流行
- [x] Newton-Raphson 迭代（非线性器件）
- [x] 自适应步长
- [x] 浮点节点稳定（大电阻接地）

### 待完善确认

- [ ] **`RowInfo.type` 枚举值与原始完全一致**：`ROW_NORMAL=0`, `ROW_CONST=1`, `ROW_CURRENT=2`
- [ ] **`converged` 阈值为 `1e-7`** — 确认是否一致
- [ ] **矩阵维度公式**：`circuitMatrixSize = nodeCount + voltSourceCount`（确认 TS 端一致）
- [ ] **LSETimeout / timeoutCount** 保护机制 — 仿真卡死时的超时退出
- [ ] **梯形积分 vs 后向欧拉**切换 — 影响电感和电容的 companion 模型
- [ ] **`createMatrix()`** 的完整调用流程（何时新建、何时复用）

---

## 模块 2 — 无源元件

### 2.1 电阻 `ResistorElm.java`

**TS：** `packages/core/components/passive/ResistorComponent.ts`

- [ ] **status**: ✅ 基础已实现
- [ ] **dump type**: `r`
- [ ] **dump 格式**: `r x1 y1 x2 y2 flags resistance`
- [ ] **stamp**: `stampResistor(n0, n1, resistance)`
- [ ] **绘制**: 蜿蜒折线（zigzag）。需精确复现折线算法：`interpPoint` 沿线生成 5 段折线，振幅为长度的 1/8
- [ ] **值标签**: 欧姆值自动格式化为 k/M 前缀
- [ ] **getInfo()**: `["Resistor", "I = XmA", "Vd = XV"]`
- [ ] **EditInfo**: Resistance (ohms)

### 2.2 电容 `CapacitorElm.java`

**TS：** `packages/core/components/passive/CapacitorComponent.ts`

- [ ] **status**: ✅ 基础已实现
- [ ] **dump type**: `c`
- [ ] **dump 格式**: `c x1 y1 x2 y2 flags capacitance voltdiff`
- [ ] **伴随模型**: Backward Euler `I = C*(V - Vprev)/dt + Iprev`
- [ ] **绘制**: 两条平行线（间距固定，和元件长度无关）
- [ ] **初始条件**: `dump`/`load` 含初始电压 `voltdiff`
- [ ] **getInfo()**: `["Capacitor", "I = XmA", "Vd = XV"]`

#### 2.2.1 有极性电容 `PolarCapacitorElm.java`

- [ ] **dump type**: `C`（大写）
- [ ] **绘制**: 和电容相同 + 正极标记 "+" 号

### 2.3 电感 `InductorElm.java`

**TS：** `packages/core/components/passive/InductorComponent.ts`

- [ ] **status**: ✅ 基础已实现
- [ ] **dump type**: `l`
- [ ] **dump 格式**: `l x1 y1 x2 y2 flags inductance current`
- [ ] **伴随模型**: `Inductor.java` — 电流源并联电阻
- [ ] **绘制**: 4 个半圆弧组成的线圈，`drawCoil()` 方法
- [ ] **初始条件**: dump/load 含初始电流
- [ ] **梯形 vs 后向欧拉选项**
- [ ] **getInfo()**: `["Inductor", "I = XmA", "Vd = XV"]`

### 2.4 导线 `WireElm.java`

**TS：** `packages/core/components/passive/WireComponent.ts`

- [ ] **status**: ✅ 基础已实现
- [ ] **dump type**: `w`
- [ ] **stamp**: 两端节点短接 — 原始用 KVL 行 `stampVoltageSource(n0, n1, vs, 0)`，即 V=0 的电压源
- [ ] **绘制**: 直线，颜色 = `getVoltageColor()` 根据节点电压着色
- [ ] **电压标签**: 鼠标悬停/选中时显示

### 2.5 开关系列

#### 2.5.1 单刀单掷开关 `SwitchElm.java`

**TS：** `packages/core/components/passive/SwitchComponent.ts`

- [ ] **status**: ✅ 基础已实现
- [ ] **dump type**: `s`
- [ ] **dump 格式**: `s x1 y1 x2 y2 flags`
- [ ] **stamp**: 开=断路(`0`)，关=导线(`stampVoltageSource + 0V`)
- [ ] **交互**: 点击切换（`mouseUp()` → `toggle()`）
- [ ] **绘制**: 开=断开缺口 + 小圆触点，关=直线
- [ ] **getInfo()**: `["switch", "I = XmA", "Vd = XV"]`

#### 2.5.2 单刀双掷开关 `Switch2Elm.java`

- [ ] **dump type**: `S`（大写）
- [ ] **3 个 post**: 公共端 + 两个选择端
- [ ] **dump 额外**: `position`（0 或 1）

#### 2.5.3 推动开关 `PushSwitchElm.java`

- [ ] **dump type**: `p`
- [ ] **交互**: 按下=闭合，松开=断开（momentary）
- [ ] **绘制**: 推动按钮式符号

#### 2.5.4 先通后断开关 `MBBSwitchElm.java`

- [ ] Make-Before-Break：切换瞬间两端都连通

### 2.6 保险丝 `FuseElm.java`

- [ ] **status**: ❌ 未实现
- [ ] **dump type**: `f`
- [ ] **trip 状态**: `blown`，当电流超过 `maxCurrent` 时熔断
- [ ] **绘制**: 正常=直线，熔断=断裂

### 2.7 方框 `BoxElm.java`

- [ ] **status**: ❌ 未实现
- [ ] **dump type**: `b`
- [ ] **特性**: 纯图形元件，无电气作用，用于绘制矩形框装饰电路图
- [ ] **继承自**: `GraphicElm`

---

## 模块 3 — 电源与信号源

### 3.1 DC 电压源 `VoltageElm.java` / `DCVoltageElm.java`

**TS：** `packages/core/components/sources/DCVoltageComponent.ts`

- [ ] **status**: ✅ 基础已实现
- [ ] **dump type**: `v`
- [ ] **dump 格式**: `v x1 y1 x2 y2 flags waveform maxVoltage frequency bias phaseShift timeShift`
- [ ] **`VoltageElm` 是基类** — DC 是 waveform=0 的子情况
- [ ] **stamp**: `stampVoltageSource(n0, n1, vsIndex, voltage)`
- [ ] **绘制**: 圆形 + +/- 记号 + 对齐引线

### 3.2 AC 电压源 `ACVoltageElm.java`

- [ ] **status**: ❌ 未实现（应该是 `VoltageElm` 的参数化实例）
- [ ] **dump data 中的 waveform = 1**
- [ ] **公式**: `getVoltage(t) = maxVoltage * sin(2π*frequency*t + phaseShift) + bias`

### 3.3 方波/时钟 `SquareRailElm.java` / `ClockElm.java`

- [ ] **SquareRail**: dump type = `vr`，常高/常低方波输出
- [ ] **ClockElm**: dump type = `clk`，可设频率

### 3.4 可变电压源 `VarRailElm.java`

- [ ] **dump type**: `vr`
- [ ] **实现 `Adjustable` 接口**：关联滑块
- [ ] **绘制**: 箭头穿过圆形

### 3.5 信号发生器系列

| 元件 | dump type | 状态 | 说明 |
|---|---|---|---|
| `SweepElm.java` | `swp` | ❌ | 扫频发生器 |
| `AMElm.java` | `am` | ❌ | 调幅 |
| `FMElm.java` | `fm` | ❌ | 调频 |
| `NoiseElm.java` | `noise` | ❌ | 白噪声 |
| `AntennaElm.java` | `ant` | ❌ | 天线输入 |
| `VCOElm.java` | `vco` | ❌ | 压控振荡器 |
| `SeqGenElm.java` | `seq` | ❌ | 序列发生器 |
| `TimerElm.java` | `timer` | ❌ | 555 定时器行为模型 |

### 3.6 地 `GroundElm.java`

**TS：** `packages/core/components/sources/GroundComponent.ts`

- [ ] **status**: ✅ 基础已实现
- [ ] **dump type**: `g`
- [ ] **stamp**: 节点电压强制为 0，连接到 node 0
- [ ] **绘制**: 三条递减水平线（标准地符号）

### 3.7 轨道 `RailElm.java`

**TS：** `packages/core/components/sources/RailComponent.ts`

- [ ] **status**: ✅ 基础已实现
- [ ] **dump type**: `V`（大写）
- [ ] **单端电压源**: + 端到地，常用于数字电路 VCC/VDD
- [ ] **绘制**: 箭头符号 + 肩线

### 3.8 电流源 `CurrentElm.java`

**TS：** `packages/core/components/sources/CurrentComponent.ts`

- [ ] **status**: ✅ 基础已实现
- [ ] **dump type**: `i`
- [ ] **stamp**: `stampCurrentSource(n0, n1, current)`
- [ ] **绘制**: 圆形 + 箭头

---

## 模块 4 — 半导体与模拟有源

### 4.1 二极管 `DiodeElm.java`

**TS：** `packages/core/components/active/DiodeComponent.ts`

- [ ] **status**: ✅ 基础已实现

**待完善：**

- [ ] **肖特基方程**: `I = Is * (exp(V/(N*Vt)) - 1)`，其中 `Vt = kT/q`
- [ ] **牛顿迭代**: `stamp()` 和 `doIteration()`，注意 `limitStep()` 的电压增量限幅（防止指数爆炸）
- [ ] **`DiodeModel` 支持**: 内置 1N4148, 1N4001 等模型参数
- [ ] **dump type**: `d`
- [ ] **dump 格式**: `d x1 y1 x2 y2 flags modelName`
- [ ] **绘制**: 三角形 + 竖线 + 引线

### 4.2 稳压管 `ZenerElm.java`

- [ ] **status**: ❌ 未实现
- [ ] **dump type**: `z`
- [ ] **特性**: 反向击穿电压 `Vz`，击穿区陡峭斜率
- [ ] **绘制**: 二极管符号 + 弯折（Z 形）

### 4.3 变容二极管 `VaractorElm.java`

- [ ] **status**: ❌ 未实现
- [ ] **dump type**: `vc`
- [ ] **特性**: 电容随反向偏压变化

### 4.4 隧道二极管 `TunnelDiodeElm.java`

- [ ] **status**: ❌ 未实现
- [ ] **dump type**: `td`
- [ ] **特性**: 负阻区（N 形 I-V 曲线）

### 4.5 晶体管

#### 4.5.1 NPN `NTransistorElm.java` / PNP `PTransistorElm.java`

**TS：** `packages/core/components/active/TransistorComponent.ts`

- [ ] **status**: ✅ 基础已实现

**待完善：**

- [ ] **Ebers-Moll 模型**: 双二极管 + 双电流源模型
- [ ] **3 个 post**: B, C, E
- [ ] **`TransistorModel.java`**: beta_f, beta_r, Vt, 内建电压
- [ ] **绘制**: 标准晶体管符号（箭头、基极引线）
- [ ] **dump type**: `t`(NPN) / `T`(PNP)（注意大小写）

#### 4.5.2 达林顿对 `DarlingtonElm.java` / `NDarlingtonElm.java` / `PDarlingtonElm.java`

- [ ] **dump type**: `dar` / `ndar` / `pdar`
- [ ] 两个晶体管级联，极高增益

### 4.6 MOSFET

| 元件 | dump type | 状态 |
|---|---|---|
| `NMosfetElm.java` | `f` | ❌ |
| `PMosfetElm.java` | `p` | ❌ |
| 基类 `MosfetElm.java` | — | ❌ |

**特性：**

- [ ] 4 个 post: G, D, S, B (body/substrate) — 默认 body 接 source
- [ ] 增强型模型：阈值电压 Vth，Vds 饱和，沟道长度调制
- [ ] 牛顿迭代：需 `nonLinear() = true`

### 4.7 JFET

| 元件 | dump type | 状态 |
|---|---|---|
| `NJfetElm.java` | `njf` | ❌ |
| `PJfetElm.java` | `pjf` | ❌ |

### 4.8 运算放大器

| 元件 | dump type | 状态 | 说明 |
|---|---|---|---|
| `OpAmpElm.java` | `op` | ❌ | 理想运放（无限增益线性化） |
| `OpAmpRealElm.java` | `opr` | ❌ | 实际运放（有限增益、输出摆幅） |
| `OpAmpSwapElm.java` | `ops` | ❌ | 引脚互换（正负输入颠倒） |

**OpAmp stamp 关键逻辑：**

- 理想运放：输出节点通过大跨导 gm 连接到差分输入，`Vout = gm * (V+ - V-)`，gm 很大
- 有限增益：`A0` 参数控制开环增益

### 4.9 其他有源器件

| 元件 | dump type | 状态 | 说明 |
|---|---|---|---|
| `OTAElm.java` | `ota` | ❌ | 跨导放大器，输出电流与差分输入成比例 |
| `SCRElm.java` | `scr` | ❌ | 可控硅整流器，三端（A, K, G） |
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

## 模块 5 — 数字逻辑

### 5.1 基础逻辑输入输出

| 元件 | dump type | 状态 |
|---|---|---|
| `LogicInputElm.java` | `li` | ❌ |
| `LogicOutputElm.java` | `lo` | ❌ |

- 逻辑输入：点击切换 0/1，可设置高/低电压值和 label
- 逻辑输出：显示高/低状态（颜色 + 标签）

### 5.2 逻辑门

**基类：** `GateElm.java`（抽象基类，定义通用 stamp/draw 逻辑）

| 元件 | dump type | 状态 | 门数配置 |
|---|---|---|---|
| `AndGateElm.java` | `AND` | ❌ | 2-8 输入 |
| `NandGateElm.java` | `ND` | ❌ | 2-8 输入 |
| `OrGateElm.java` | `OR` | ❌ | 2-8 输入 |
| `NorGateElm.java` | `NR` | ❌ | 2-8 输入 |
| `XorGateElm.java` | `XOR` | ❌ | 2-8 输入 |
| `InverterElm.java` | `NOT` | ❌ | 单输入 |
| `SchmittElm.java` | `schmitt` | ❌ | 施密特触发器缓冲 |
| `InvertingSchmittElm.java` | `invschmitt` | ❌ | 施密特触发器反相 |

**数字逻辑的关键实现：**

- [ ] 使用小时间常数 RC 延迟模型替代理想门（避免代数环）
- [ ] `calcOutput()` 方法计算逻辑输出
- [ ] 每个门可在同一元件中容纳多个门（如 4×2-input NAND）
- [ ] 绘制：标准逻辑门形状（AND=D 形，OR=弧形）

### 5.3 触发器

| 元件 | dump type | 状态 |
|---|---|---|
| `DFlipFlopElm.java` | `D` | ❌ |
| `JKFlipFlopElm.java` | `JK` | ❌ |
| `TFlipFlopElm.java` | `T` | ❌ |
| `LatchElm.java` | `latch` | ❌ |

- Reset/Preset 引脚
- 时钟触发（上升沿/下降沿）

### 5.4 芯片基类 `ChipElm.java`

**所有多引脚数字芯片的基类，以下是关键子类：**

| 元件 | dump type | 状态 | 说明 |
|---|---|---|---|
| `MultiplexerElm.java` | `mux` | ❌ | 数据选择器 |
| `DeMultiplexerElm.java` | `dmux` | ❌ | 数据分配器 |
| `CounterElm.java` | `counter` | ❌ | 计数器 |
| `RingCounterElm.java` | `ring` | ❌ | 环形计数器 |
| `FullAdderElm.java` | `adder` | ❌ | 全加器 |
| `HalfAdderElm.java` | `halfadder` | ❌ | 半加器 |
| `SevenSegElm.java` | `7seg` | ❌ | 7 段数码管（显示） |
| `SevenSegDecoderElm.java` | `7segdec` | ❌ | 7 段译码器 |
| `ADCElm.java` | `adc` | ❌ | 模数转换器 |
| `DACElm.java` | `dac` | ❌ | 数模转换器 |
| `SRAMElm.java` | `sram` | ❌ | 静态随机存取存储器 |
| `PisoShiftElm.java` | `piso` | ❌ | 并行输入串行输出移位寄存器 |
| `SipoShiftElm.java` | `sipo` | ❌ | 串行输入并行输出移位寄存器 |
| `MonostableElm.java` | `mono` | ❌ | 单稳态触发器 |

**ChipElm 基类提供：**

- 多引脚布局系统（引脚在芯片两侧排列）
- 引脚编号和命名
- 默认绘制：矩形 + 引脚线 + 标签

### 5.5 模拟开关

| 元件 | dump type | 状态 |
|---|---|---|
| `AnalogSwitchElm.java` | `as` | ❌ |
| `AnalogSwitch2Elm.java` | `asw` | ❌ |
| `TriStateElm.java` | `ts` | ❌ |
| `ComparatorElm.java` | `comp` | ❌ |

### 5.6 自定义逻辑

| 元件 | dump type | 状态 |
|---|---|---|
| `CustomLogicElm.java` | `cl` | ❌ |
| `CustomCompositeElm.java` | `ccomp` | ❌ |
| `CustomCompositeChipElm.java` | `ccchip` | ❌ |

- `CustomLogicModel.java`：用布尔表达式字符串定义逻辑
- `CustomCompositeModel.java`：用子电路网络定义元件

---

## 模块 6 — 变压器、传输线、机电

| 元件 | dump type | 状态 | 说明 |
|---|---|---|---|
| `TransformerElm.java` | `tform` | ❌ | 变压器（互感耦合，4 post） |
| `TappedTransformerElm.java` | `tform2` | ❌ | 中心抽头变压器（5 post） |
| `CustomTransformerElm.java` | `ctrans` | ❌ | 自定义匝数比 |
| `TransLineElm.java` | `tline` | ❌ | 传输线（延迟线模型） |
| `CrystalElm.java` | `xtal` | ❌ | 晶振（RLC 串联谐振） |
| `RelayElm.java` | `relay` | ❌ | 继电器（线圈控制触点） |
| `TimeDelayRelayElm.java` | `tdrelay` | ❌ | 延时继电器 |
| `DCMotorElm.java` | `dcm` | ❌ | 直流电机 |
| `LampElm.java` | `lamp` | ❌ | 白炽灯（阻抗随温度/电流变化） |
| `LEDElm.java` | `led` | ❌ | 发光二极管（二极管 + 发光线指示） |
| `LEDArrayElm.java` | `ledarray` | ❌ | LED阵列 |
| `SparkGapElm.java` | `spark` | ❌ | 放电间隙（击穿时导通） |

**变压器 MNA 关键逻辑：**

- M 互感系数
- K = M/√(L1·L2) 耦合系数
- stamp 需要 4×4 导纳矩阵块

---

## 模块 7 — 测量与显示

| 元件 | dump type | 状态 | 说明 |
|---|---|---|---|
| `ProbeElm.java` | `probe` | ❌ | 电压探针（可关联 Scope） |
| `AmmeterElm.java` | `a` | ❌ | 电流表（串联显示电流值） |
| `OhmMeterElm.java` | `ohm` | ❌ | 欧姆表 |
| `OutputElm.java` | `o` | ✅ | 输出节点标签（已实现 check + 绘制） |
| `TestPointElm.java` | `tp` | ❌ | 测试点 |
| `ScopeElm.java` | `scope` | ❌ | 内嵌示波器元件 |
| `PhaseCompElm.java` | `pc` | ❌ | 相位比较器 |
| `DataRecorderElm.java` | `rec` | ❌ | 数据记录器 |
| `StopTriggerElm.java` | `st` | ❌ | 触发停止仿真 |
| `TextElm.java` | `text` | ❌ | 文本标注（可编辑内容、字号） |
| `LabeledNodeElm.java` | `label` | ❌ | 命名节点（带标签） |
| `AudioOutputElm.java` | `audio` | ❌ | 音频输出（Web Audio API） |
| `AudioInputElm.java` | `aIn` | ❌ | 音频输入 |

---

## 模块 8 — 传感器与特殊器件

| 元件 | dump type | 状态 | 说明 |
|---|---|---|---|
| `PotElm.java` | `pot` | ❌ | 电位器（3 端，可拖动滑块百分比） |
| `ThermistorNTCElm.java` | `therm` | ❌ | NTC 热敏电阻（温度 → 电阻变化） |
| `LDRElm.java` | `ldr` | ❌ | 光敏电阻（照度 → 电阻变化） |
| `MemristorElm.java` | `mem` | ❌ | 忆阻器（电荷记忆电阻） |

---

## 模块 9 — 序列化/解析器

### 原始 Java 文件

| 文件 | 说明 |
|---|---|
| `CirSim.java` (dump/load 部分) | 电路序列化主入口 |
| `StringTokenizer.java` | 自定义字符串分词器（兼容原始格式） |
| `LoadFile.java` | 文件加载 |
| `QueryParameters.java` | URL 参数解析 |

### 目标 TS 文件

| 文件 | 说明 |
|---|---|
| `packages/core/circuit/Serializer.ts` | 序列化/反序列化 |

### 当前状态

- [x] 文本格式 `$ 1 ...` 头部解析
- [x] 部分元件 type 的反序列化
- [x] 文本格式 dump 输出
- [x] 基本 XML 格式支持

### 需要完整实现

#### 9.1 文本格式 (Falstad 格式)

电路以单行文本表示，结构为：

```
$ 1 timestep maxVoltage flags
t id x1 y1 x2 y2 flags ...  # 每个元件一行
...                            # 更多元件
o ...                          # scope 配置
34 ...                         # Adjustable 滑块
```

- [ ] **完整 type id 表** — 枚举所有 ~60 种元件的 dumpId
- [ ] **Scope 行序列化**（`o ...` 行格式）
- [ ] **Adjustable 滑块行**（`% sliderIndex x y ...` 格式）
- [ ] **标签/文本元件序列化**（含多行文本转义）
- [ ] **初始条件**: 电容 voltdiff、电感 current 的正确读写
- [ ] **自定义模型**: CustomLogicModel、CustomCompositeModel 的序列化嵌入

#### 9.2 URL 压缩格式

- [ ] **lz-string 压缩/解压** — 将文本压缩为 URL 安全的 base64 字符串
- [ ] URL 参数 `?ct=` 解压加载

#### 9.3 XML 格式

- [ ] Falstad 也支持 XML 格式电路文件，需支持解析

#### 9.4 全部 DumpId 对照表

| dumpId | 元件 | dumpId | 元件 | dumpId | 元件 |
|---|---|---|---|---|---|
| `r` | Resistor | `c` | Capacitor | `C` | PolarCapacitor |
| `l` | Inductor | `w` | Wire | `s` | Switch |
| `S` | Switch2 | `p` | PushSwitch | `f` | Fuse |
| `b` | Box | `g` | Ground | `V` | Rail |
| `vr` | VarRail | `v` | Voltage | `i` | Current |
| `clk` | Clock | `sqr` | SquareRail | `d` | Diode |
| `z` | Zener | `vc` | Varactor | `td` | TunnelDiode |
| `t` | NPN Transistor | `T` | PNP Transistor | `dar` | Darlington |
| `ndar` | NDarlington | `pdar` | PDarlington | `f` | NMOS |
| `p` | PMOS | `njf` | NJFET | `pjf` | PJFET |
| `op` | OpAmp | `opr` | OpAmpReal | `ops` | OpAmpSwap |
| `ota` | OTA | `cc2` | CC2 | `cccs` | CCCS |
| `ccvs` | CCVS | `vccs` | VCCS | `vcvs` | VCVS |
| `scr` | SCR | `diac` | Diac | `triac` | Triac |
| `triode` | Triode | `opt` | Optocoupler | `AND` | AndGate |
| `ND` | NandGate | `OR` | OrGate | `NR` | NorGate |
| `XOR` | XorGate | `NOT` | Inverter | `li` | LogicInput |
| `lo` | LogicOutput | `D` | DFlipFlop | `JK` | JKFlipFlop |
| `T` | TFlipFlop | `D` | DFlipFlop | `D` | ... |
| `tform` | Transformer | `tform2` | TappedTransformer | `ctrans` | CustomTransformer |
| `tline` | TransLine | `xtal` | Crystal | `relay` | Relay |
| `tdrelay` | TimeDelayRelay | `dcm` | DCMotor | `lamp` | Lamp |
| `led` | LED | `ledarray` | LEDArray | `spark` | SparkGap |
| `probe` | Probe | `a` | Ammeter | `ohm` | OhmMeter |
| `o` | Output | `tp` | TestPoint | `scope` | ScopeElm |
| `pc` | PhaseComp | `rec` | DataRecorder | `st` | StopTrigger |
| `text` | TextElm | `label` | LabeledNode | `audio` | AudioOutput |
| `aIn` | AudioInput | `pot` | PotElm | `therm` | Thermistor |
| `ldr` | LDR | `mem` | Memristor | `am` | AMElm |
| `fm` | FMElm | `noise` | Noise | `sweep` | SweepElm |
| `ant` | Antenna | `vco` | VCO | `seq` | SeqGen |
| `timer` | Timer | `cl` | CustomLogic | `ccomp` | CustomComposite |
| `mux` | Multiplexer | `dmux` | DeMultiplexer | `counter` | Counter |
| `ring` | RingCounter | `adder` | FullAdder | `halfadder` | HalfAdder |
| `7seg` | SevenSeg | `7segdec` | SevenSegDecoder | `adc` | ADC |
| `dac` | DAC | `sram` | SRAM | `piso` | PisoShift |
| `sipo` | SipoShift | `mono` | Monostable | `schmitt` | Schmitt |
| `invschmitt` | InvertingSchmitt | `latch` | Latch | `ts` | TriState |
| `comp` | Comparator | `as` | AnalogSwitch | `asw` | AnalogSwitch2 |
| `MB` | MBBSwitch | | | | |

> 注意：部分 type id 可能有冲突（如 `T` 既是 PNP 晶体管也可能是 TFlipFlop），需通过 dump 的 flags 或参数数量区分。原始 GWT 代码中通过 `getDumpId()` 类层次决定。

---

## 模块 10 — Canvas 绘制系统

### 原始 Java 文件

| 文件 | 说明 |
|---|---|
| `Graphics.java` | 2D 图形上下文包装器 |
| `Color.java` | 颜色 |
| `Polygon.java` | 多边形 |

### 目标 TS 文件

| 文件 | 说明 |
|---|---|
| `packages/ui/canvas/CanvasGraphics.ts` | Canvas 2D 包装 |
| `packages/ui/canvas/CircuitRenderer.ts` | 电路渲染主循环 |
| `packages/ui/canvas/renderer.ts` | 子渲染器 |

### 当前状态

- [x] 基本网格绘制
- [x] 电压着色导线
- [x] 元件绘制 dispatch
- [x] 节点圆点（junction dots）
- [x] 当前动画点（current dots）
- [x] 悬停高亮

### 待完善

- [ ] **`getVoltageColor(v)` 彩虹映射算法** — 精确复现原始映射：0V=绿, +5V=红, -5V=蓝，线性插值
- [ ] **`drawCoil(p1, p2, v1, v2, n)`** — 为电感绘制的 4 段圆弧线圈算法
- [ ] **`drawThickLine()` / `drawThickCircle()`** — 粗线绘制（元件主体轮廓）
- [ ] **`interpPoint(p1, p2, f)`** — 沿两点连线的线性插值，f=0→p1, f=1→p2
- [ ] **`interpPoint(p1, p2, f, g)`** — 带横向偏移的插值（for 多引脚元件）
- [ ] **`createArrow()`** — 箭头多边形生成
- [ ] **`drawDots(p1, p2, pos)`** — 电流方向动画点（沿导线移动的彩色圆点）
- [ ] **`fillPolygon()`** — 填充多边形（二极管三角形、箭头等）
- [ ] **选中高亮框** — 选中元件周围的蓝色虚线框
- [ ] **网格对齐** — 拖放时吸附到最近的网格交叉点
- [ ] **Scope 波形绘制** — 波形曲线、刻度网格、触发标记
- [ ] **抗锯齿设置** — 全局 `imageSmoothingEnabled` 控制
- [ ] **缩放居中** — zoom 以鼠标位置为中心缩放

---

## 模块 11 — 交互系统

### 原始 Java 文件

| 文件 | 说明 |
|---|---|
| `CirSim.java` (鼠标事件处理) | 鼠标/触摸事件分发 |
| `Scrollbar.java` | 滚动条 |
| `ScrollValuePopup.java` | 值弹出滑块 |

### 目标 TS 文件

| 文件 | 说明 |
|---|---|
| `packages/ui/canvas/InteractionHandler.ts` | 鼠标/键盘事件处理 |
| `packages/ui/components/CircuitCanvas.tsx` | Canvas React 封装 |

### 当前状态

- [x] 基本鼠标事件（mousedown/mousemove/mouseup）
- [x] 悬停检测
- [x] 开关点击切换
- [x] 端点拖拽
- [x] 平移（中键/Alt）
- [x] 滚轮缩放
- [x] add-element 创建模式（拖出 type 创建）

### 待完善

- [ ] **拾取优先级**：元件 > 节点 > 导线（当前可能不完整）
- [ ] **元件移动 drag** — 选中元件后拖拽移动
- [ ] **元件旋转 flip** — X/Y 轴翻转（快捷键 X/Y），存储为 flags
- [ ] **导线绘制** — 从空白处拖拽创建设置两个端点的导线
- [ ] **导线分割** — 拖拽已有导线中间点，生成两个导线 + 一个节点
- [ ] **框选** — 按住 shift 拖出矩形选择多个元件
- [ ] **复制/粘贴** — Ctrl+C（复制选中）、Ctrl+V（粘贴带偏移）
- [ ] **删除** — Delete/Backspace 删除选中元件
- [ ] **撤销/重做** — 原始维护 `undoStack`，`maxUndo=32`
- [ ] **右键上下文菜单** — 在元件/空白区域弹出不同菜单
- [ ] **双击编辑属性** — 双击元件打开 EditDialog
- [ ] **键盘快捷键**:
  - Delete: 删除选中
  - X: 水平翻转
  - Y: 垂直翻转
  - Ctrl+C: 复制
  - Ctrl+V: 粘贴
  - Ctrl+Z: 撤销
  - Ctrl+Y: 重做
  - Ctrl+A: 全选
  - ↑↓←→: 微调位置
  - Space: 仿真启停
- [ ] **触摸支持** — 移动设备手势（双指缩放/平移）
- [ ] **撤销栈序列化** — circuit dump 中保存 undo 栈

---

## 模块 12 — UI 层（菜单、工具栏、对话框）

### 原始 Java 文件

| 文件 | 说明 |
|---|---|
| `CirSim.java` (UI 部分) | 菜单、工具栏创建 |
| `EditDialog.java` | 通用属性编辑对话框 |
| `EditInfo.java` | 编辑字段描述 |
| `EditOptions.java` | 全局选项对话框 |
| `EditDiodeModelDialog.java` | 二极管模型编辑 |
| `EditTransistorModelDialog.java` | 晶体管模型编辑 |
| `EditCompositeModelDialog.java` | 复合元件模型编辑 |
| `ExportAsTextDialog.java` | 导出为文本 |
| `ExportAsUrlDialog.java` | 导出为压缩 URL |
| `ExportAsImageDialog.java` | 导出为图片 |
| `ExportAsLocalFileDialog.java` | 导出为本地文件 |
| `ImportFromTextDialog.java` | 从文本导入 |
| `ImportFromDropboxDialog.java` | 从 Dropbox 导入 |
| `LoadFile.java` | 文件加载 |
| `SliderDialog.java` | 滑块参数调整 |
| `AboutBox.java` | 关于对话框 |
| `ShortcutsDialog.java` | 快捷键列表 |
| `Checkbox.java`, `Choice.java` | GWT UI 控件包装 |
| `checkboxMenuItem.java` | 菜单项 |

### 目标 TS 文件

| 文件 | 说明 |
|---|---|
| `packages/ui/components/App.tsx` | 主布局 |
| `packages/ui/components/CircuitCanvas.tsx` | Canvas 容器 |
| `packages/ui/store/circuitStore.ts` | 状态管理 |
| (新建) `packages/ui/components/MenuBar.tsx` | 菜单栏 |
| (新建) `packages/ui/components/Toolbar.tsx` | 工具栏 |
| (新建) `packages/ui/components/EditDialog.tsx` | 编辑对话框 |
| (新建) `packages/ui/components/dialogs/` | 各种对话框 |

### 当前状态

- [x] 基本 App 布局（菜单栏占位、Canvas、状态栏）
- [x] 仿真控制按钮（Start, Stop, Step）
- [x] 状态栏显示

### 待完善 — 菜单系统

#### 12.1.1 File 菜单
- [ ] **New Circuit** — 清除当前电路
- [ ] **Open File** — 打开 .circuit 或 .txt 文件
- [ ] **Save As** — 导出为文件
- [ ] **Import From Text** — 弹出文本编辑框粘贴电路文本
- [ ] **Export As Text** — 复制电路文本到剪贴板
- [ ] **Export As URL** — 生成可分享的压缩 URL
- [ ] **Export As Image** — 下载 PNG 截图
- [ ] **Examples** → 子菜单列出所有示例电路
- [ ] **Print** — 打印电路

#### 12.1.2 Edit 菜单
- [ ] Undo / Redo
- [ ] Cut / Copy / Paste
- [ ] Select All / Delete

#### 12.1.3 Draw 菜单（元件菜单）

按类别分组的全部元件，分为：

**Passive 无源元件：**
- Resistor, Capacitor, Polarized Capacitor, Inductor, Potentiometer, Lamp, Memristor, Thermistor, LDR, LED, LED Array

**Sources 电源：**
- DC Voltage, AC Voltage, Square Wave, Clock, Variable Voltage, Current Source, Sweep, Noise, AM/FM, Antenna, VCO, Seq Gen

**Outputs 输出/探针：**
- Output, Probe, Ammeter, Ohmmeter, Test Point, Scope, Data Recorder, Audio Out, Stop Trigger

**Analog 模拟：**
- Diode, Zener, Varactor, Tunnel Diode, NPN/PNP, NMOS/PMOS, NJF/PJF, OpAmp, OpAmpReal, OTA, CC2, CCCS/CCVS/VCCS/VCVS, SCR, Diac, Triac, Triode, Optocoupler, Darlington, Schmitt

**Logic 逻辑：**
- Logic Input/Output, AND, NAND, OR, NOR, XOR, Inverter, Schmitt Inverter, Analog Switch, TriState, Latch, Flip-Flops (D, JK, T), Monostable, Multiplexer, Demux, Adder (Half/Full)

**Chips 芯片：**
- Counter, Ring Counter, ADC, DAC, 7-Segment, 7-Seg Decoder, SRAM, Shift Registers (PISO, SIPO)

**Transformers/Inductors 变压器：**
- Transformer, Tapped Transformer, Custom Transformer, Transmission Line, Crystal, Relay

**机电/特殊：**
- DC Motor, Fuse, Spark Gap, Switch, SPDT Switch, Push Switch, MBB Switch, Timer, Voltage Rail, Clock, Text, Box, Labeled Node, Ground

#### 12.1.4 Scope 菜单
- [ ] Add Scope / Remove Scope
- [ ] Scope 属性配置

#### 12.1.5 Options 菜单
- [ ] **Show Voltage/Circuit Colors** — 显示电压着色
- [ ] **Show Current** — 显示电流值
- [ ] **Show Values** — 显示元件值
- [ ] **Show Power** — 显示功率
- [ ] **Show Power Consumed** — 显示功耗
- [ ] **Euro Resistors** — 欧式电阻画法（矩形 vs 折线）
- [ ] **Small Grid** — 小格模式
- [ ] **Conventional Current Motion** — 传统电流方向
- [ ] **Backward Euler vs Trapezoid** — 积分方法
- [ ] **Speed** — 仿真速度滑块
- [ ] **Default Resistor/Capacitor/Inductor** — 新建时的默认值

#### 12.1.6 Help 菜单
- [ ] Shortcuts — 快捷键列表
- [ ] About — 关于

### 12.2 属性编辑对话框 EditDialog

通用编辑框架支持字段类型：
- [ ] **文本编辑** — 标签、名称
- [ ] **数值编辑** — 带单位的数字（自动解析 k/M/m/μ/n）
- [ ] **复选框** — 布尔选项（显示值、翻转等）
- [ ] **下拉选择** — 枚举选项
- [ ] **颜色选择** — 自定义元件颜色
- [ ] **按钮** — 操作按钮（删除、翻转等）

### 12.3 滑块系统 SliderDialog

- [ ] **`Adjustable` 接口** — 元件实现此接口即可绑定滑块
- [ ] 滑块面板：侧边栏显示所有活动滑块
- [ ] 支持同时多个滑块

---

## 模块 13 — 示波器 (Scope)

### 原始 Java 文件

| 文件 | 说明 |
|---|---|
| `Scope.java` | 示波器主类 — 波形绘制、触发、FFT |
| `ScopeElm.java` | 电路中嵌入的示波器元件 |
| `ScopePopupMenu.java` | 示波器右键菜单 |
| `ScopePropertiesDialog.java` | 示波器属性对话框 |
| `FFT.java` | 快速傅里叶变换 |

### 目标 TS 文件

| 文件 | 说明 |
|---|---|
| (新建) `packages/ui/scope/ScopePanel.tsx` | Scope 面板 |
| (新建) `packages/ui/scope/ScopeModel.ts` | Scope 数据模型 |
| (新建) `packages/core/math/FFT.ts` | FFT 算法 |

### 当前状态

> **完全未实现。** Scope 是 CircuitJS 的核心功能之一，需完整搬运。

### 需要实现

#### 13.1 Scope 数据模型
- [ ] **Channel 绑定** — 每个 Scope 绑定到电路中的某个探测点
- [ ] **采样缓冲区** — 滚动缓冲区存储最近 N 个采样点
- [ ] **时间基础** — 每格时间宽度（可调）
- [ ] **电压范围** — Y 轴每格电压值（可调）
- [ ] **偏移** — Y 轴位置偏移
- [ ] **触发系统**：
  - 触发模式：Auto, Normal, Once, None
  - 触发斜率：上升沿/下降沿
  - 触发电平：可调电压阈值
  - 触发源：选择绑定通道

#### 13.2 Scope 绘制
- [ ] 网格绘制（浅色方格背景）
- [ ] 波形绘制（彩色曲线）
- [ ] 触发标记（箭头或横线表示触发电平）
- [ ] 时间/电压刻度标签
- [ ] 多轨迹同时显示（每个探针一条曲线）
- [ ] 通道名称/颜色标识

#### 13.3 Scope 菜单 & 交互
- [ ] **右键菜单**：清除波形、停止/运行、切换 X-Y 模式、Max 模式、Stack 模式
- [ ] **拖拽**：调整 Scope 面板高度
- [ ] **鼠标滚轮**：缩放时间基础
- [ ] **Scope 属性对话框**：绑定探针、调参

#### 13.4 FFT 频谱分析
- [ ] 波形数据 → FFT → 频谱显示
- [ ] 频率轴刻度
- [ ] 对数/线性刻度切换

#### 13.5 Scope 配置序列化
- [ ] 电路文本格式中 `o ...` 行保存 Scope 配置
- [ ] `maxScopeCount = 8` — 最多 8 个 Scope

---

## 模块 14 — 自定义复合元件

### 原始 Java 文件

| 文件 | 说明 |
|---|---|
| `CompositeElm.java` | 复合元件基类（内部包含子电路） |
| `CustomCompositeElm.java` | 用户自定义复合元件 |
| `CustomCompositeModel.java` | 复合元件模型数据 |
| `CustomCompositeChipElm.java` | 复合芯片封装 |
| `CustomLogicElm.java` | 自定义逻辑元件（布尔表达式） |
| `CustomLogicModel.java` | 逻辑模型数据 |
| `EditCompositeModelDialog.java` | 编辑对话框 |

### 目标 TS 文件

所有文件状态：❌ 未实现

### 功能概述

**自定义复合元件允许用户：**

1. 将一组电路封装为单个元件
2. 暴露引脚（输入/输出引脚定义）
3. 保存和加载自定义元件模型

**自定义逻辑元件允许用户：**

1. 用布尔表达式定义芯片行为（如 `D = (A & B) | C`）
2. 输入/输出引脚延迟定义
3. Not/TriState 输出配置

**需要实现的序列化格式：**
- 模型数据嵌入到电路文本中
- 全局模型库（已保存的型号可在不同电路中复用）

---

## 模块 15 — 高级模型

### 原始 Java 文件

| 文件 | 说明 |
|---|---|
| `Expr.java` | 数学表达式解析器和求值器 |
| `DiodeModel.java` | 二极管模型参数数据库 |
| `TransistorModel.java` | 晶体管模型参数数据库 |

### 目标 TS 文件

| 文件 | 状态 |
|---|---|
| (新建) `packages/core/models/Expr.ts` | ❌ |
| (新建) `packages/core/models/DiodeModels.ts` | ❌ |
| (新建) `packages/core/models/TransistorModels.ts` | ❌ |

### 15.1 `Expr.java` — 表达式解析器

- 支持变量、数值常量、数学函数（sin, cos, sqrt, abs, sign）
- 支持运算符 `+ - * / ^ %`
- 用于自定义逻辑、自定义函数元件

需实现：
- [ ] 词法分析（tokenization）
- [ ] 语法分析（递归下降 or 调车场算法）
- [ ] 求值执行
- [ ] 错误处理

### 15.2 `DiodeModel.java`

内置二极管模型库：
- [ ] 1N4148（通用开关二极管）
- [ ] 1N4001（整流二极管）
- [ ] 自定义模型参数编辑

模型参数：
```
saturationCurrent (Is), seriesResistance, emissionCoefficient (N)
breakdownVoltage, breakdownCurrent
```

### 15.3 `TransistorModel.java`

内置晶体管模型库：
- [ ] NPN 型号库（2N3904, BC547, ...）
- [ ] PNP 型号库（2N3906, BC557, ...）
- [ ] MOSFET 型号库
- [ ] 自定义模型参数编辑

模型参数：
```
beta (forward), beta_r (reverse), Vt (thermal voltage)
Vbe (base-emitter voltage), Va (early voltage)
```

---

## 模块 16 — Electron 桌面应用

### 原始文件

| 文件 | 说明 |
|---|---|
| `app/main.js` | Electron 主进程 |
| `app/preload.js` | 预加载桥接 |
| `app/renderer.js` | 渲染进程辅助 |
| `app/package.json` | Electron 配置 |

### 目标 TS 文件

| 文件 | 状态 |
|---|---|
| `packages/electron/src/main.ts` | ❌ 仅占位符 |

### 需要实现

- [ ] **BrowserWindow 创建** — 加载 UI 包构建后的 index.html
- [ ] **原生菜单** — File Open/Save 使用系统对话框
- [ ] **文件系统访问** — preload 桥接提供 `window.circuitApi` 接口：
  - `readFile(path)` — 读取电路文件
  - `writeFile(path, data)` — 保存电路文件
  - `showOpenDialog()` — 弹出文件选择器
  - `showSaveDialog()` — 弹出保存对话框
- [ ] **拖放加载** — 拖拽文件到窗口自动加载
- [ ] **剪贴板操作** — 系统剪贴板集成
- [ ] **窗口配置** — 窗口大小、图标、标题

---

## 模块 17 — MCP Server

### 原始参考实现

`circuitjs1/app/main.js` 中已有 MCP-over-SSE 的实验性实现，提供：

```
- load_circuit      — 上传电路文件
- export_circuit    — 导出电路数据
- start_simulation  — 启动仿真
- stop_simulation   — 停止仿真
- get_voltage       — 查询节点电压
- take_screenshot   — 截图输出
```

### 目标 TS 文件

| 文件 | 状态 |
|---|---|
| `packages/mcp-server/src/index.ts` | ❌ 仅占位符 |

### 需要实现

- [ ] StdioTransport (基于 `@modelcontextprotocol/sdk`)
- [ ] 工具定义：
  - `load_circuit`
  - `export_circuit`
  - `start_simulation` / `stop_simulation`
  - `get_voltage`
  - `step_simulation`
  - `take_screenshot`
  - `list_components`
  - `get_node_list`
- [ ] 与 `@circuitjs/core` 的集成（使用 SimulationManager）

---

## 模块 18 — 示例电路库

### 原始文件

`E:\circuitjs1\src\com\lushprojects\circuitjs1\public\`

```
circuits\            — 大量 .txt 格式示例电路
setuplist.txt        — 示例索引 / 分类清单
```

### 目标文件

| 文件 | 状态 |
|---|---|
| `packages/circuits/` | ❌ 空目录 |
| `packages/ui/public/circuits/` | ❌ |

### 需要实现

- [ ] 将所有原始示例电路 `.txt` 复制到重构项目中
- [ ] `setuplist.txt` 解析 — 分类/排序/子菜单生成
- [ ] 示例浏览器 UI — 分类展示、搜索、预览

---

## 执行优先级路线图

### 第一阶段：核心仿真正确性

```
目标：重建的电路仿真结果与 circuitjs1 完全一致
```

| 优先级 | 模块 | 交付物 | 耗时估计 |
|---|---|---|---|
| P0 | 模块 0 — 基类对齐 | CircuitComponent 完整接口 | 3 天 |
| P0 | 模块 1 — MNA 求解器验证 | 验证 RC/RL 瞬态、二极管整流的数值一致性 | 2 天 |
| P0 | 模块 2 — 无源元件完整 | R, C, L, W, S 完整功能 + 绘制 | 3 天 |
| P0 | 模块 3 — 电源与信号源 | Voltage, Current, Ground, Rail 完整 | 3 天 |
| P0 | 模块 9 — 序列化 | 完整 dumpId 表，导入导出验证 | 4 天 |

**验证标准：** 用 RC 滤波、RLC 谐振、二极管整流三个测试电路，仿真结果与原始 JS 偏差 < 1%

### 第二阶段：模拟/数字元件补全

```
目标：覆盖 80% 以上的常用元件
```

| 优先级 | 模块 | 交付物 | 耗时估计 |
|---|---|---|---|
| P1 | 模块 4.1-4.6 | 二极管、BJT、MOSFET、JFET、OpAmp | 8 天 |
| P1 | 模块 5.1-5.4 | 逻辑门、触发器、芯片 | 10 天 |
| P1 | 模块 6 | 变压器、传输线、晶振 | 5 天 |
| P1 | 模块 7 | 探针、测量仪器 | 4 天 |

### 第三阶段：UI 和交互系统

```
目标：用户可完整操作电路
```

| 优先级 | 模块 | 交付物 | 耗时估计 |
|---|---|---|---|
| P2 | 模块 11 — 交互 | 移动/旋转/复制/粘贴/撤销/右键菜单 | 6 天 |
| P2 | 模块 12 — UI | 菜单系统、工具栏、编辑对话框 | 8 天 |
| P2 | 模块 10 — 绘制完善 | 颜色映射、电流动画、Scope 波形绘制 | 5 天 |

### 第四阶段：高级功能

```
目标：功能完整、可与原始版本互换使用
```

| 优先级 | 模块 | 交付物 | 耗时估计 |
|---|---|---|---|
| P3 | 模块 13 — Scope | 示波器完整功能 + FFT | 8 天 |
| P3 | 模块 14 — 自定义元件 | CustomComposite / CustomLogic | 6 天 |
| P3 | 模块 15 — 高级模型 | Expr, Diode/Transistor 模型库 | 5 天 |
| P3 | 模块 8 — 传感器 | Pot, Thermistor, LDR, Memristor | 3 天 |

### 第五阶段：部署与扩展

```
目标：多平台部署
```

| 优先级 | 模块 | 交付物 | 耗时估计 |
|---|---|---|---|
| P4 | 模块 16 — Electron | 桌面应用 | 3 天 |
| P4 | 模块 17 — MCP | MCP Server | 2 天 |
| P4 | 模块 18 — 示例库 | 导入全部示例电路 | 2 天 |

---

## 附录：当前组件注册表

截至当前，`packages/core/src/components/registry.ts` 中已注册的元件：

| 文件 | 元件 | dump type | 状态 |
|---|---|---|---|
| `ResistorComponent.ts` | Resistor | `r` | ✅ |
| `CapacitorComponent.ts` | Capacitor | `c` | ✅ |
| `InductorComponent.ts` | Inductor | `l` | ✅ |
| `WireComponent.ts` | Wire | `w` | ✅ |
| `SwitchComponent.ts` | Switch | `s` | ✅ |
| `OutputComponent.ts` | Output | `o` | ✅ |
| `DCVoltageComponent.ts` | DC Voltage | `v` | ✅ |
| `RailComponent.ts` | Rail | `V` | ✅ |
| `CurrentComponent.ts` | Current Source | `i` | ✅ |
| `GroundComponent.ts` | Ground | `g` | ✅ |
| `DiodeComponent.ts` | Diode | `d` | ✅ |
| `TransistorComponent.ts` | Transistor | `t`/`T` | ✅ |

共计 **12 个元件**，原始版本约 **90+ 种元件**（含芯片变体约 175 个 Java 文件）。

---

## 附录：核心文件对照表

### 仿真引擎

| circuitjs1 (Java) | circuitjs-next (TS) | 状态 |
|---|---|---|
| `CirSim.java` | `SimulationManager.ts` | ✅ 核心 |
| `CircuitElm.java` | `CircuitComponent.ts` | ✅ 核心 |
| `RowInfo.java` | `RowInfo.ts` | ✅ |
| `Diode.java` | (在 `DiodeComponent.ts` 中) | ✅ |
| `Inductor.java` | (在 `InductorComponent.ts` 中) | ✅ |
| `StringTokenizer.java` | (内联在 `Serializer.ts`) | ✅ |
| `Expr.java` | ❌ | ❌ |

### 基类与类型

| circuitjs1 | circuitjs-next | 状态 |
|---|---|---|
| `CircuitNode.java` | `types.ts:CircuitNode` | ✅ |
| `CircuitNodeLink.java` | `types.ts:CircuitNodeLink` | ✅ |
| `Point.java` | `types.ts:Point` | ✅ |
| `Polygon.java` | ❌ | ❌ |
| `Color.java` | `CanvasGraphics.ts` | ✅ |
| `Font.java` | `CanvasGraphics.ts` | ✅ |
| `Graphics.java` | `CanvasGraphics.ts` | ✅ |

### UI

| circuitjs1 | circuitjs-next | 状态 |
|---|---|---|
| `Scope.java` | ❌ | ❌ |
| `EditDialog.java` | ❌ | ❌ |
| `EditInfo.java` | ❌ | ❌ |
| `AboutBox.java` | ❌ | ❌ |
| `SliderDialog.java` | ❌ | ❌ |
| `FFT.java` | ❌ | ❌ |

---

> 本文档应随项目进度持续更新。完成每个模块后，将对应 checkbox 标记为 ✅。
