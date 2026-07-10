# 模块 3 — 电源与信号源

> **目标**: 完整实现所有电源和信号源元件的电气行为、绘制、序列化。
> **优先级**: P0 — 核心仿真正确性

---

## 3.1 DC 电压源 `VoltageElm.java` / `DCVoltageElm.java`

**TS**: `packages/core/components/sources/DCVoltageComponent.ts`

- [x] 基础已实现
- [ ] **dump type**: `v` — 格式: `v x1 y1 x2 y2 flags waveform maxVoltage frequency bias phaseShift timeShift`
- [ ] **`VoltageElm` 是基类** — DC 是 `waveform=0` 子情况
- [ ] **stamp**: `stampVoltageSource(n0, n1, vsIndex, voltage)`
- [ ] **绘制**: 圆形 + `+`/`-` 记号 + 对齐引线

---

## 3.2 AC 电压源 `ACVoltageElm.java`

- [ ] **status**: ❌ 未实现（`VoltageElm` 参数化实例）
- [ ] **waveform = 1**
- [ ] **公式**: `getVoltage(t) = maxVoltage * sin(2π*frequency*t + phaseShift) + bias`

---

## 3.3 方波/时钟

| 元件 | dump type | 状态 | 说明 |
|------|-----------|------|------|
| `SquareRailElm.java` | `sqr` | ❌ | 常高/常低方波输出 |
| `ClockElm.java` | `clk` | ❌ | 可设频率 |

---

## 3.4 可变电压源 `VarRailElm.java`

- [ ] **dump type**: `vr`
- [ ] **实现 `Adjustable` 接口**：关联滑块
- [ ] **绘制**: 箭头穿过圆形

---

## 3.5 信号发生器系列

| 元件 | dump type | 状态 | 说明 |
|------|-----------|------|------|
| `SweepElm.java` | `swp` | ❌ | 扫频发生器 |
| `AMElm.java` | `am` | ❌ | 调幅 |
| `FMElm.java` | `fm` | ❌ | 调频 |
| `NoiseElm.java` | `noise` | ❌ | 白噪声 |
| `AntennaElm.java` | `ant` | ❌ | 天线输入 |
| `VCOElm.java` | `vco` | ❌ | 压控振荡器 |
| `SeqGenElm.java` | `seq` | ❌ | 序列发生器 |
| `TimerElm.java` | `timer` | ❌ | 555 定时器行为模型 |

---

## 3.6 地 `GroundElm.java`

**TS**: `packages/core/components/sources/GroundComponent.ts`

- [x] 基础已实现
- [ ] **dump type**: `g`
- [ ] **stamp**: 节点电压强制为 0，连接到 node 0
- [ ] **绘制**: 三条递减水平线（标准地符号）

---

## 3.7 轨道 `RailElm.java`

**TS**: `packages/core/components/sources/RailComponent.ts`

- [x] 基础已实现
- [ ] **dump type**: `V`（大写）
- [ ] **单端电压源**: + 端到地，常用于数字电路 VCC/VDD
- [ ] **绘制**: 箭头符号 + 肩线

---

## 3.8 电流源 `CurrentElm.java`

**TS**: `packages/core/components/sources/CurrentComponent.ts`

- [x] 基础已实现
- [ ] **dump type**: `i`
- [ ] **stamp**: `stampCurrentSource(n0, n1, current)`
- [ ] **绘制**: 圆形 + 箭头

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
