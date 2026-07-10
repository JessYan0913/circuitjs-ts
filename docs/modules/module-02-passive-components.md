# 模块 2 — 无源元件

> **目标**: 完整实现所有无源元件的电气行为、绘制、序列化。
> **优先级**: P0 — 核心仿真正确性
> **原始 Java 源码位置**: `E:\circuitjs1\src\com\lushprojects\circuitjs1\client\`

---

## 2.1 电阻 `ResistorElm.java`

**TS**: `packages/core/components/passive/ResistorComponent.ts`

- [x] **dump type**: `r` — 格式: `r x1 y1 x2 y2 flags resistance`
- [x] **stamp**: `stampResistor(n0, n1, resistance)`
- [x] **绘制**: 蜿蜒折线（zigzag），`interpPointPerpOut` 沿线 4 段折线
- [x] **值标签**: 欧姆值 k/M 前缀格式化
- [x] **getInfo()**: `["Resistor: XΩ"]`
- [x] **getEditInfo**: Resistance (ohms)
- [x] **getShortcut**: `r`
- [x] **handleDumpData**: 读取 resistance 参数

---

## 2.2 电容 `CapacitorElm.java`

**TS**: `packages/core/components/passive/CapacitorComponent.ts`

- [x] **dump type**: `c` — 格式: `c x1 y1 x2 y2 flags capacitance`
- [x] **伴随模型**: 梯形积分 `compResistance = dt / (2*C)`
- [x] **绘制**: 两条平行板 + 电压着色引线
- [x] **getInfo()**: `["Capacitor: XF"]`
- [x] **getEditInfo**: Capacitance (F)
- [x] **getShortcut**: `c`
- [x] **handleDumpData**: 读取 capacitance

### 2.2.1 有极性电容 `PolarCapacitorElm.java`

- [x] **dump type**: `C`（大写, Java 中 type=209）
- [x] **绘制**: 同电容 + 正极标记 `+`

---

## 2.3 电感 `InductorElm.java`

**TS**: `packages/core/components/passive/InductorComponent.ts`

- [x] **dump type**: `l` — 格式: `l x1 y1 x2 y2 flags inductance`
- [x] **伴随模型**: 梯形积分 `compResistance = 2*L/dt`，电流源并联
- [x] **绘制**: 线圈 `drawCoil()` + 电压着色引线
- [x] **getInfo()**: `["Inductor: X H"]`
- [x] **getEditInfo**: Inductance (H)
- [x] **getShortcut**: `l`
- [x] **handleDumpData**: 读取 inductance

### 待完善

- [ ] **梯形 vs 后向欧拉选项** — 目前固定梯形积分
- [x] **初始条件**: dump/load 含初始电流（Java 中 `dump()` 会输出 `current`）

---

## 2.4 导线 `WireElm.java`

**TS**: `packages/core/components/passive/WireComponent.ts`

- [x] **dump type**: `w`
- [x] **stamp**: `stampVoltageSource(n0, n1, vs, 0)` — 0V 电压源强制等电位
- [x] **getInfo()**: `["Wire"]`
- [x] **isWire()**: 返回 true（供 SimulationManager 优化用）

---

## 2.5 开关系列

### 2.5.1 单刀单掷 `SwitchElm.java`

**TS**: `packages/core/components/passive/SwitchComponent.ts`

- [x] **dump type**: `s` — 格式: `s x1 y1 x2 y2 flags position momentary`
- [x] **stamp**: 闭合=导线(`stampVoltageSource + 0V`)，断开=断路
- [x] **交互**: `toggle()` 切换（`mouseUp()` 触发）
- [x] **绘制**: 开=断开间隙，关=直线
- [x] **getShortcut**: `s`

### 2.5.2 单刀双掷 `Switch2Elm.java`

- [x] **dump type**: `S`（大写, Java 中字符代码 `'S'`）
- [x] **3 post**: 公共端 + 两个选择端
- [x] **dump 额外**: `position`（0 或 1）

### 2.5.3 推动开关 `PushSwitchElm.java`

- [x] **dump type**: `p`（Java 中字符代码 `'p'`，未在 CirSim 中注册）
- [x] **交互**: 按下=闭合，松开=断开（momentary）
- [x] **绘制**: 推动按钮符号

### 2.5.4 先通后断开关 `MBBSwitchElm.java`

- [x] **dump type**: `MB`（Java 中 type=416）
- [x] Make-Before-Break：切换瞬间两端都连通

---

## 2.6 保险丝 `FuseElm.java`

- [x] **dump type**: `f`（Java 中 type=404）
- [x] **trip 状态**: `blown`，电流超过 `maxCurrent` 熔断
- [x] **绘制**: 正常=直线，熔断=断裂

---

## 2.7 方框 `BoxElm.java`

- [x] **dump type**: `b`（Java 中字符代码 `'b'`）
- [x] **特性**: 纯图形元件，无电气作用，继承自 `GraphicElm`

---

## Java type 代码对照

| 元件 | Java dump type | 数值代码 |
|------|---------------|---------|
| Resistor | `r` | 字符 `'r'` |
| Capacitor | `c` | 字符 `'c'` |
| PolarCapacitor | `C` (dumps as `209`) | **209** |
| Inductor | `l` | 字符 `'l'` |
| Wire | `w` | 字符 `'w'` |
| Switch (SPST) | `s` | 字符 `'s'` |
| Switch2 (SPDT) | `S` | 字符 `'S'` |
| PushSwitch | `p` | 字符 `'p'` |
| MBB Switch | `MB` (dumps as `416`) | **416** |
| Fuse | `f` (dumps as `404`) | **404** |
| Box | `b` | 字符 `'b'` |

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
