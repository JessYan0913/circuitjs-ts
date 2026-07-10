# 模块 3 — 电源与信号源

> **目标**: 完整实现所有电源和信号源元件的电气行为、绘制、序列化。
> **优先级**: P0 — 核心仿真正确性
> **原始 Java 源码位置**: `E:\circuitjs1\src\com\lushprojects\circuitjs1\client\`

---

## 3.1 电压源基类 `VoltageElm.java`

**TS**: `packages/core/components/sources/DCVoltageComponent.ts` — `VoltageComponent`

- [x] **dump type**: `v` — 格式: `v x1 y1 x2 y2 flags waveform frequency maxVoltage bias phaseShift dutyCycle`
- [x] **`VoltageElm` 是基类** — DC 是 `waveform=0` 子情况
- [x] **stamp**: `stampVoltageSource(n0, n1, vsIndex, voltage)` — DC 直接设值，其他波形动态更新
- [x] **doStep**: 非 DC 波形调用 `updateVoltageSource()`
- [x] **波形支持**: DC(0), AC/正弦(1), 方波(2), 三角波(3), 锯齿波(4), 脉冲(5), 可变(6), 噪声(7)
- [x] **绘制**: DC=电池符号（粗细两板），AC=圆形+正弦/波形符号
- [x] **handleDumpData**: 读取 waveform/frequency/maxVoltage/bias/phaseShift/dutyCycle
- [x] **getShortcut**: `v`

---

## 3.2 AC 电压源 `ACVoltageElm.java`

- [x] **使用 `VoltageComponent` 参数化** — `waveform=WF_AC(1)`
- [x] **公式**: `getVoltage(t) = bias + maxVoltage * sin(2π*frequency*t + phaseShift)`

---

## 3.3 地 `GroundElm.java`

**TS**: `packages/core/components/sources/GroundComponent.ts`

- [x] **dump type**: `g`
- [x] **stamp**: 端点绑定到 node 0（由 SimulationManager 的 assignNodeNumbers 处理）
- [x] **绘制**: 三条递减水平线（标准地符号）
- [x] **getShortcut**: `g`

---

## 3.4 轨道 `RailElm.java`

**TS**: `packages/core/components/sources/RailComponent.ts`

- [x] **dump type**: `R`（大写 `'R'`）
- [x] **继承自 `VoltageComponent`** — 单端（另一端接 GND）
- [x] **getShortcut**: `R`

**子类:**
- `ACRailElm` — `waveform=WF_AC`
- `SquareRailElm` — `waveform=WF_SQUARE`
- `ClockElm` — `waveform=WF_SQUARE`, 默认 5V/100Hz

---

## 3.5 电流源 `CurrentElm.java`

**TS**: `packages/core/components/sources/CurrentComponent.ts`

- [x] **dump type**: `i`
- [x] **stamp**: `stampCurrentSource(n0, n1, current)`
- [x] **绘制**: 圆形 + `I` 标签
- [x] **getEditInfo**: 电流值

---

## 3.6 可变电压源 `VarRailElm.java`

- [ ] **dump type**: `vr`（Java 中 type=172）
- [ ] **实现 `Adjustable` 接口**：关联滑块
- [ ] **绘制**: 箭头穿过圆形

---

## 3.7 信号发生器系列

| 元件 | dump type | Java type | 状态 | 说明 |
|------|-----------|-----------|------|------|
| `SweepElm.java` | `swp` | 170 | ❌ | 扫频发生器 |
| `AMElm.java` | `am` | 200 | ❌ | 调幅 |
| `FMElm.java` | `fm` | 201 | ❌ | 调频 |
| `NoiseElm.java` | `noise` | 字符 `'n'` | ❌ | 白噪声 |
| `AntennaElm.java` | `ant` | 字符 `'A'` | ❌ | 天线输入 |
| `VCOElm.java` | `vco` | 158 | ❌ | 压控振荡器 |
| `SeqGenElm.java` | `seq` | 188 | ❌ | 序列发生器 |
| `TimerElm.java` | `timer` | 165 | ❌ | 555 定时器行为模型 |

---

## Java type 代码对照

| 元件 | Java dump type | 数值代码 |
|------|---------------|---------|
| VoltageElm (DC/AC/波形) | `v` | 字符 `'v'` |
| Ground | `g` | 字符 `'g'` |
| Rail | `R` | 字符 `'R'` |
| ACRail | `R` | 字符 `'R'` |
| SquareRail | `R` | 字符 `'R'` |
| Clock | `R` | 字符 `'R'` |
| Current | `i` | 字符 `'i'` |
| VarRail | `vr` | 172 |
| Sweep | `swp` | 170 |
| AM | `am` | 200 |
| FM | `fm` | 201 |
| Noise | `noise` | 字符 `'n'` |
| Antenna | `ant` | 字符 `'A'` |
| VCO | `vco` | 158 |
| SeqGen | `seq` | 188 |
| Timer | `timer` | 165 |

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
