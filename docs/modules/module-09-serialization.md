# 模块 9 — 序列化/解析器

> **目标**: 完整实现电路序列化/反序列化，支持 Falstad 文本格式、URL 压缩格式和 XML 格式。
> **优先级**: P0 — 核心仿真正确性
> **原始 Java 源码位置**: `E:\circuitjs1\src\com\lushprojects\circuitjs1\client\`

---

## 原始 Java → 目标 TS

| Java | TS | 状态 |
|------|-----|------|
| `CirSim.java` (dump/load 部分) | `packages/core/circuit/Serializer.ts` | ✅ 已实现 |
| `StringTokenizer.java` | (内联在 Serializer.ts) | ✅ 已实现 |
| `LoadFile.java` | — | ❌ |
| `QueryParameters.java` | — | ❌ |

---

## 当前状态

- [x] 文本格式 `$ 1 ...` 头部解析
- [x] 各已实现元件的 dumpType 反序列化
- [x] 文本格式 dump 输出（`dumpCircuit()`）
- [x] XML 格式支持（`<cir>` + 自闭合标签）
- [x] 各元件 `handleDumpData()` 读取额外参数
- [x] 模型行解析（`!` CustomLogicModel、`.` CustomCompositeModel、`34` DiodeModel、`32` TransistorModel）
- [x] 模型行序列化输出（`dumpModel()` + `clearDumpedFlags()`）
- [x] Scope 行（`o ...`）解析与输出
- [x] Adjustable 滑块行（`38 ...`）解析与输出
- [x] Hint 行（`h ...`）解析与输出
- [x] URL 压缩格式（lz-string + hash fragment / `?ctz=` 参数）
- [x] 完整 XML 标签映射（95+ 元件）
- [x] 共享文本转义工具（`util/textEscape.ts`）
- [x] 电容初值条件序列化（`voltdiff`）

---

## 9.1 文本格式 (Falstad 格式)

电路格式:
```
$ 1 maxTimeStep iterCount currentBar voltageRange powerBar minTimeStep
t id x1 y1 x2 y2 flags ...  # 每个元件一行
o ...                          # scope 配置
34 ...                         # Adjustable 滑块
```

### 当前已支持序列化的元件（dump type → 组件）:

| dumpType | 组件 | 状态 |
|----------|------|------|
| `r` | ResistorComponent | ✅ |
| `c` | CapacitorComponent | ✅ |
| `l` | InductorComponent | ✅ |
| `w` | WireComponent | ✅ |
| `s` | SwitchComponent | ✅ |
| `v` | VoltageComponent | ✅ |
| `g` | GroundComponent | ✅ |
| `R` | RailComponent (+ ACRail/SquareRail/Clock) | ✅ |
| `i` | CurrentComponent | ✅ |
| `d` | DiodeComponent | ✅ |
| `t` | TransistorComponent | ✅ |
| `O` | OutputComponent | ✅ |

### 待完善

- [ ] **完整 type id 表** — 枚举所有 ~60 种元件的 dumpId（已实现，但文档需同步）
- [ ] **Scope 行完整属性映射** — per-plot flags 解析优化
- [ ] **Adjustable 滑块 UI 重建** — 从 `AdjustableData` 恢复滑块控件
- [ ] **自定义模型引用** — 元件通过 `modelName` 引用已加载的模型（当前模型参数在元件内部内联）
- [ ] **初始条件**: 电容 `voltdiff`、电感 `current` 在仿真启动时正确设置

---

## 9.2 URL 压缩格式

- [x] **lz-string 压缩/解压** — 文本→URL safe base64（`UrlSerializer.ts`）
- [x] URL 参数 `?ctz=` 解压加载（兼容 `?cct=` 旧格式）
- [x] URL hash 片段格式（`#<compressed>`）

---

## 9.3 XML 格式

- [x] Falstad XML 格式基本解析
- [x] 属性映射: `r`(电阻), `c`(电容), `l`(电感), `v`(电压源), 等
- [x] 完整的元件标签映射（95+ 种元件，含半导体/数字/机电/传感器）

---

## 9.4 完整 DumpId 对照表

| dumpId | Java type | 元件 | dumpId | Java type | 元件 |
|--------|-----------|------|--------|-----------|------|
| `r` | `'r'` | Resistor | `c` | `'c'` | Capacitor |
| `C` | 209 | PolarCapacitor | `l` | `'l'` | Inductor |
| `w` | `'w'` | Wire | `s` | `'s'` | Switch (SPST) |
| `S` | `'S'` | Switch2 (SPDT) | `p` | `'p'` | PushSwitch |
| `MB` | 416 | MBB Switch | `f` | 404 | Fuse |
| `b` | `'b'` | Box | `g` | `'g'` | Ground |
| `R` | `'R'` | Rail | `V` | `'V'` | — |
| `vr` | 172 | VarRail | `v` | `'v'` | Voltage |
| `i` | `'i'` | Current | `clk` | — | Clock (alias of Rail) |
| `sqr` | — | SquareRail (alias) | `d` | `'d'` | Diode |
| `z` | `'z'` | Zener | `vc` | 176 | Varactor |
| `td` | 175 | TunnelDiode | `t` | `'t'` | NPN Transistor |
| `T` | — | PNP Transistor (alt) | `dar` | 400 | Darlington |
| `ndar` | — | NDarlington | `pdar` | — | PDarlington |
| `f` | `'f'` | NMOS | `p` | `'p'` | PMOS (conflict) |
| `njf` | — | NJFET | `pjf` | — | PJFET |
| `j` | `'j'` | JFET | `op` | `'a'` | OpAmp |
| `opr` | 409 | OpAmpReal | `ops` | — | OpAmpSwap |
| `ota` | 402 | OTA | `cc2` | 179 | CC2 |
| `cccs` | 215 | CCCS | `ccvs` | 214 | CCVS |
| `vccs` | 213 | VCCS | `vcvs` | 212 | VCVS |
| `scr` | 177 | SCR | `diac` | 203 | Diac |
| `triac` | 206 | Triac | `triode` | 173 | Triode |
| `opt` | 407 | Optocoupler | `AND` | 150 | AndGate |
| `ND` | 151 | NandGate | `OR` | 152 | OrGate |
| `NR` | 153 | NorGate | `XOR` | 154 | XorGate |
| `NOT` | `'I'` | Inverter | `li` | `'L'` | LogicInput |
| `lo` | `'M'` | LogicOutput | `D` | 155 | DFlipFlop |
| `JK` | 156 | JKFlipFlop | `T` | 193 | TFlipFlop |
| `latch` | 168 | Latch | `schmitt` | 182 | Schmitt |
| `invschmitt` | 183 | InvertingSchmitt | `ts` | 180 | TriState |
| `comp` | 401 | Comparator | `as` | 159 | AnalogSwitch |
| `asw` | 160 | AnalogSwitch2 | `mux` | 184 | Multiplexer |
| `dmux` | 185 | DeMultiplexer | `counter` | 164 | Counter |
| `ring` | 163 | RingCounter | `adder` | 196 | FullAdder |
| `halfadder` | 195 | HalfAdder | `7seg` | 157 | SevenSeg |
| `7segdec` | 197 | SevenSegDecoder | `adc` | 167 | ADC |
| `dac` | 166 | DAC | `sram` | 413 | SRAM |
| `piso` | 186 | PisoShift | `sipo` | 189 | SipoShift |
| `mono` | 194 | Monostable | `tform` | `'T'` | Transformer |
| `tform2` | 169 | TappedTransformer | `ctrans` | 406 | CustomTransformer |
| `tline` | 171 | TransLine | `xtal` | 412 | Crystal |
| `relay` | 178 | Relay | `tdrelay` | 414 | TimeDelayRelay |
| `dcm` | 415 | DCMotor | `lamp` | 181 | Lamp |
| `led` | 162 | LED | `ledarray` | 405 | LEDArray |
| `spark` | 187 | SparkGap | `probe` | `'p'` | Probe |
| `a` | 370 | Ammeter | `ohm` | 216 | OhmMeter |
| `o` | `'O'` | Output | `tp` | 368 | TestPoint |
| `scope` | 403 | ScopeElm | `pc` | 161 | PhaseComp |
| `rec` | 210 | DataRecorder | `st` | 408 | StopTrigger |
| `text` | `'x'` | TextElm | `label` | 207 | LabeledNode |
| `audio` | 211 | AudioOutput | `aIn` | 411 | AudioInput |
| `pot` | 174 | PotElm | `therm` | 350 | ThermistorNTC |
| `ldr` | 374 | LDR | `mem` | `'m'` | Memristor |
| `am` | 200 | AMElm | `fm` | 201 | FMElm |
| `noise` | `'n'` | Noise | `sweep` | 170 | SweepElm |
| `ant` | `'A'` | Antenna | `vco` | 158 | VCO |
| `seq` | 188 | SeqGen | `timer` | 165 | Timer |
| `cl` | 208 | CustomLogic | `ccomp` | 410 | CustomComposite |

> **注意**: 部分 type id 有冲突（如 `'T'` 既是 Transformer 也是 TFlipFlop），需通过上下文或 flags 区分。Java CirSim 中单字符优先走 `switch(getDumpType())` 数值分支，长名称走 `constructElement(name)` 字符串分支。

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
