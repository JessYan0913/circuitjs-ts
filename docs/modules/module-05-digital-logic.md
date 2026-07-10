# 模块 5 — 数字逻辑

> **目标**: 完整实现数字逻辑元件：逻辑门、触发器、芯片基类。
> **优先级**: P1 — 模拟/数字元件补全

---

## 5.1 基础逻辑输入输出

| 元件 | dump type | 状态 |
|------|-----------|------|
| `LogicInputElm.java` | `li` | ❌ |
| `LogicOutputElm.java` | `lo` | ❌ |

- 逻辑输入：点击切换 0/1，可设高/低电压值和 label
- 逻辑输出：显示高/低状态（颜色+标签）

---

## 5.2 逻辑门

**基类**: `GateElm.java`（抽象基类）

| 元件 | dump type | 状态 | 门数配置 |
|------|-----------|------|----------|
| `AndGateElm.java` | `AND` | ❌ | 2-8 输入 |
| `NandGateElm.java` | `ND` | ❌ | 2-8 输入 |
| `OrGateElm.java` | `OR` | ❌ | 2-8 输入 |
| `NorGateElm.java` | `NR` | ❌ | 2-8 输入 |
| `XorGateElm.java` | `XOR` | ❌ | 2-8 输入 |
| `InverterElm.java` | `NOT` | ❌ | 单输入 |
| `SchmittElm.java` | `schmitt` | ❌ | 施密特触发器缓冲 |
| `InvertingSchmittElm.java` | `invschmitt` | ❌ | 施密特触发器反相 |

**关键实现要点:**

- [ ] RC 延迟模型替代理想门（避免代数环）
- [ ] `calcOutput()` 方法
- [ ] 每个元件容纳多个门（如 4×2-input NAND）
- [ ] 绘制：AND=D 形，OR=弧形

---

## 5.3 触发器

| 元件 | dump type | 状态 |
|------|-----------|------|
| `DFlipFlopElm.java` | `D` | ❌ |
| `JKFlipFlopElm.java` | `JK` | ❌ |
| `TFlipFlopElm.java` | `T` | ❌ |
| `LatchElm.java` | `latch` | ❌ |

- Reset/Preset 引脚
- 时钟触发（上升沿/下降沿）

---

## 5.4 芯片基类 `ChipElm.java`

| 元件 | dump type | 状态 | 说明 |
|------|-----------|------|------|
| `MultiplexerElm.java` | `mux` | ❌ | 数据选择器 |
| `DeMultiplexerElm.java` | `dmux` | ❌ | 数据分配器 |
| `CounterElm.java` | `counter` | ❌ | 计数器 |
| `RingCounterElm.java` | `ring` | ❌ | 环形计数器 |
| `FullAdderElm.java` | `adder` | ❌ | 全加器 |
| `HalfAdderElm.java` | `halfadder` | ❌ | 半加器 |
| `SevenSegElm.java` | `7seg` | ❌ | 7 段数码管 |
| `SevenSegDecoderElm.java` | `7segdec` | ❌ | 7 段译码器 |
| `ADCElm.java` | `adc` | ❌ | 模数转换器 |
| `DACElm.java` | `dac` | ❌ | 数模转换器 |
| `SRAMElm.java` | `sram` | ❌ | 静态随机存取存储器 |
| `PisoShiftElm.java` | `piso` | ❌ | 并行输入串行输出 |
| `SipoShiftElm.java` | `sipo` | ❌ | 串行输入并行输出 |
| `MonostableElm.java` | `mono` | ❌ | 单稳态触发器 |

**ChipElm 基类提供:**

- [ ] 多引脚布局（芯片两侧排列）
- [ ] 引脚编号和命名
- [ ] 默认绘制：矩形 + 引脚线 + 标签

---

## 5.5 模拟开关

| 元件 | dump type | 状态 |
|------|-----------|------|
| `AnalogSwitchElm.java` | `as` | ❌ |
| `AnalogSwitch2Elm.java` | `asw` | ❌ |
| `TriStateElm.java` | `ts` | ❌ |
| `ComparatorElm.java` | `comp` | ❌ |

---

## 5.6 自定义逻辑

| 元件 | dump type | 状态 |
|------|-----------|------|
| `CustomLogicElm.java` | `cl` | ❌ |
| `CustomCompositeElm.java` | `ccomp` | ❌ |
| `CustomCompositeChipElm.java` | `ccchip` | ❌ |

- `CustomLogicModel`: 布尔表达式字符串
- `CustomCompositeModel`: 子电路网络

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
