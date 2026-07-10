# 模块 5 — 数字逻辑

> **目标**: 完整实现数字逻辑元件：逻辑门、触发器、芯片基类。
> **优先级**: P1 — 模拟/数字元件补全
> **原始 Java 源码位置**: `E:\circuitjs1\src\com\lushprojects\circuitjs1\client\`

---

## 5.1 基础逻辑输入输出

| 元件 | dump type | Java type | 状态 |
|------|-----------|-----------|------|
| `LogicInputElm.java` | `li` | 字符 `'L'` | ✅ |
| `LogicOutputElm.java` | `lo` | 字符 `'M'` | ✅ |

- 逻辑输入：点击切换 0/1，可设高/低电压值和 label
- 逻辑输出：显示高/低状态（颜色+标签）

---

## 5.2 逻辑门

**基类**: `GateElm.java`（抽象基类）

| 元件 | dump type | Java type | 状态 | 门数配置 |
|------|-----------|-----------|------|----------|
| `AndGateElm.java` | `AND` | 150 | ✅ | 2-8 输入 |
| `NandGateElm.java` | `ND` | 151 | ✅ | 2-8 输入 |
| `OrGateElm.java` | `OR` | 152 | ✅ | 2-8 输入 |
| `NorGateElm.java` | `NR` | 153 | ✅ | 2-8 输入 |
| `XorGateElm.java` | `XOR` | 154 | ✅ | 2-8 输入 |
| `InverterElm.java` | `NOT` | 字符 `'I'` | ✅ | 单输入 |
| `SchmittElm.java` | `schmitt` | 182 | ✅ | 施密特触发器缓冲 |
| `InvertingSchmittElm.java` | `invschmitt` | 183 | ✅ | 施密特触发器反相 |

**关键实现要点:**
- [x] RC 延迟模型替代理想门（避免代数环）
- [x] `calcOutput()` 方法
- [x] 每个元件容纳多个门（如 4×2-input NAND）
- [x] 绘制：AND=D 形，OR=弧形

---

## 5.3 触发器

| 元件 | dump type | Java type | 状态 |
|------|-----------|-----------|------|
| `DFlipFlopElm.java` | `D` | 155 | ✅ |
| `JKFlipFlopElm.java` | `JK` | 156 | ✅ |
| `TFlipFlopElm.java` | `T` | 193 | ✅ |
| `LatchElm.java` | `latch` | 168 | ✅ |

- Reset/Preset 引脚
- 时钟触发（上升沿/下降沿）

---

## 5.4 芯片基类 `ChipElm.java`

| 元件 | dump type | Java type | 状态 | 说明 |
|------|-----------|-----------|------|------|
| `MultiplexerElm.java` | `mux` | 184 | ✅ | 数据选择器 |
| `DeMultiplexerElm.java` | `dmux` | 185 | ✅ | 数据分配器 |
| `CounterElm.java` | `counter` | 164 | ✅ | 计数器 |
| `RingCounterElm.java` | `ring` | 163 | ✅ | 环形计数器 |
| `FullAdderElm.java` | `adder` | 196 | ✅ | 全加器 |
| `HalfAdderElm.java` | `halfadder` | 195 | ✅ | 半加器 |
| `SevenSegElm.java` | `7seg` | 157 | ✅ | 7 段数码管 |
| `SevenSegDecoderElm.java` | `7segdec` | 197 | ✅ | 7 段译码器 |
| `ADCElm.java` | `adc` | 167 | ✅ | 模数转换器 |
| `DACElm.java` | `dac` | 166 | ✅ | 数模转换器 |
| `SRAMElm.java` | `sram` | 413 | ✅ | 静态随机存取存储器 |
| `PisoShiftElm.java` | `piso` | 186 | ✅ | 并行输入串行输出 |
| `SipoShiftElm.java` | `sipo` | 189 | ✅ | 串行输入并行输出 |
| `MonostableElm.java` | `mono` | 194 | ✅ | 单稳态触发器 |

**ChipElm 基类提供:**
- [x] 多引脚布局（芯片两侧排列）
- [x] 引脚编号和命名
- [x] 默认绘制：矩形 + 引脚线 + 标签

---

## 5.5 模拟开关

| 元件 | dump type | Java type | 状态 |
|------|-----------|-----------|------|
| `AnalogSwitchElm.java` | `as` | 159 | ✅ |
| `AnalogSwitch2Elm.java` | `asw` | 160 | ✅ |
| `TriStateElm.java` | `ts` | 180 | ✅ |

---

## 5.6 自定义逻辑

| 元件 | dump type | Java type | 状态 |
|------|-----------|-----------|------|
| `CustomLogicElm.java` | `cl` | 208 | ✅ |
| `CustomCompositeElm.java` | `ccomp` | 410 | ✅ |
| `CustomCompositeChipElm.java` | `cchip` | — | ✅ |

- `CustomLogicModel`: 布尔表达式字符串
- `CustomCompositeModel`: 子电路网络

---

## Java type 代码对照

| 元件 | dump type | 数值代码 |
|------|-----------|---------|
| LogicInput | `li` | `'L'` |
| LogicOutput | `lo` | `'M'` |
| AndGate | `AND` | 150 |
| NandGate | `ND` | 151 |
| OrGate | `OR` | 152 |
| NorGate | `NR` | 153 |
| XorGate | `XOR` | 154 |
| Inverter | `NOT` | `'I'` |
| Schmitt | `schmitt` | 182 |
| InvertingSchmitt | `invschmitt` | 183 |
| DFlipFlop | `D` | 155 |
| JKFlipFlop | `JK` | 156 |
| TFlipFlop | `T` | 193 |
| Latch | `latch` | 168 |
| Multiplexer | `mux` | 184 |
| DeMultiplexer | `dmux` | 185 |
| Counter | `counter` | 164 |
| RingCounter | `ring` | 163 |
| FullAdder | `adder` | 196 |
| HalfAdder | `halfadder` | 195 |
| SevenSeg | `7seg` | 157 |
| SevenSegDecoder | `7segdec` | 197 |
| ADC | `adc` | 167 |
| DAC | `dac` | 166 |
| SRAM | `sram` | 413 |
| PisoShift | `piso` | 186 |
| SipoShift | `sipo` | 189 |
| Monostable | `mono` | 194 |
| AnalogSwitch | `as` | 159 |
| AnalogSwitch2 | `asw` | 160 |
| TriState | `ts` | 180 |
| CustomLogic | `cl` | 208 |
| CustomComposite | `ccomp` | 410 |

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
