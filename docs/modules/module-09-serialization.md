# 模块 9 — 序列化/解析器

> **目标**: 完整实现电路序列化/反序列化，支持 Falstad 文本格式、URL 压缩格式和 XML 格式。
> **优先级**: P0 — 核心仿真正确性

---

## 原始 Java → 目标 TS

| Java | TS | 状态 |
|------|-----|------|
| `CirSim.java` (dump/load 部分) | `packages/core/circuit/Serializer.ts` | ✅ 基础 |
| `StringTokenizer.java` | (内联在 Serializer.ts) | ✅ |
| `LoadFile.java` | — | ❌ |
| `QueryParameters.java` | — | ❌ |

---

## 当前状态

- [x] 文本格式 `$ 1 ...` 头部解析
- [x] 部分元件 type 的反序列化
- [x] 文本格式 dump 输出
- [x] 基本 XML 格式支持

---

## 9.1 文本格式 (Falstad 格式)

电路格式:
```
$ 1 timestep maxVoltage flags
t id x1 y1 x2 y2 flags ...  # 每个元件一行
o ...                          # scope 配置
34 ...                         # Adjustable 滑块
```

- [ ] **完整 type id 表** — 枚举所有 ~60 种元件的 dumpId
- [ ] **Scope 行序列化**（`o ...` 行格式）
- [ ] **Adjustable 滑块行**（`% sliderIndex x y ...` 格式）
- [ ] **标签/文本元件序列化**（多行文本转义）
- [ ] **初始条件**: 电容 voltdiff、电感 current 正确读写
- [ ] **自定义模型**: CustomLogicModel、CustomCompositeModel 序列化嵌入

---

## 9.2 URL 压缩格式

- [ ] **lz-string 压缩/解压** — 文本→URL 安全 base64
- [ ] URL 参数 `?ct=` 解压加载

---

## 9.3 XML 格式

- [ ] Falstad XML 格式电路文件解析支持

---

## 9.4 完整 DumpId 对照表

| dumpId | 元件 | dumpId | 元件 | dumpId | 元件 |
|--------|------|--------|------|--------|------|
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
| `T` | TFlipFlop | `latch` | Latch | `schmitt` | Schmitt |
| `invschmitt` | InvertingSchmitt | `ts` | TriState | `comp` | Comparator |
| `as` | AnalogSwitch | `asw` | AnalogSwitch2 | `MB` | MBBSwitch |
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
| `sipo` | SipoShift | `mono` | Monostable | `clk` | Clock |

> 注意: 部分 type id 有冲突（如 `T` 既是 PNP 晶体管也是 TFlipFlop），需通过 flags 或参数数量区分。

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
