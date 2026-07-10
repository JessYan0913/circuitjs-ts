# 模块 12 — UI 层（菜单、工具栏、对话框）

> **目标**: 完整实现菜单系统、工具栏、编辑对话框、滑块系统。
> **优先级**: P2 — UI 和交互系统
> **原始 Java 源码位置**: `E:\circuitjs1\src\com\lushprojects\circuitjs1\client\`

---

## 原始 Java → 目标 TS

| Java | TS | 状态 |
|------|-----|------|
| `CirSim.java` (UI 部分) | `packages/ui/components/App.tsx` | ✅ 已实现（基础布局） |
| `EditDialog.java` | `packages/ui/components/dialogs/EditDialog.tsx` | ❌ |
| `EditInfo.java` | `packages/shared/src/types.ts:EditInfo` | ✅ 接口定义 |
| `EditOptions.java` | — | ❌ |
| `EditDiodeModelDialog.java` | — | ❌ |
| `EditTransistorModelDialog.java` | — | ❌ |
| `EditCompositeModelDialog.java` | — | ❌ |
| `ExportAsTextDialog.java` | — | ❌ |
| `ExportAsUrlDialog.java` | — | ❌ |
| `ExportAsImageDialog.java` | — | ❌ |
| `ExportAsLocalFileDialog.java` | — | ❌ |
| `ImportFromTextDialog.java` | — | ❌ |
| `ImportFromDropbox.java` / `ImportFromDropboxDialog.java` | — | ❌ |
| `SliderDialog.java` | — | ❌ |
| `AboutBox.java` | — | ❌ |
| `ShortcutsDialog.java` | — | ❌ |
| `MyCommand.java` | — | ❌ |
| `Checkbox.java` / `CheckboxMenuItem.java` / `CheckboxAlignedMenuItem.java` | — | ❌ |
| `Choice.java` | — | ❌ |
| `Scrollbar.java` | — | ❌ |
| `ScrollValuePopup.java` | — | ❌ |
| — | `packages/ui/store/circuitStore.ts` | ✅ 已实现 |
| — | `packages/ui/store/types.ts` | ✅ 已实现 |

---

## 当前状态

- [x] 基本 App 布局（菜单栏占位、Canvas、状态栏）
- [x] 仿真控制按钮（Start, Stop, Step）
- [x] 状态栏显示
- [x] `EditInfo` 接口定义（含 name/value/text/choices/checkbox/button 等）

---

## 12.1 菜单系统

### File 菜单
- [ ] **New Circuit** — 清除当前电路
- [ ] **Open File** — 打开 .circuit/.txt 文件
- [ ] **Save As** — 导出为文件
- [ ] **Import From Text** — 文本编辑框粘贴
- [ ] **Import From Dropbox** — Dropbox 导入
- [ ] **Export As Text** — 复制电路文本
- [ ] **Export As URL** — 压缩 URL
- [ ] **Export As Image** — PNG 截图
- [ ] **Examples** — 子菜单示例列表
- [ ] **Print** — 打印电路

### Edit 菜单
- [ ] Undo / Redo
- [ ] Cut / Copy / Paste
- [ ] Select All / Delete

### Draw 菜单（元件分类）

**Passive:** Resistor, Capacitor, Polarized Cap, Inductor, Pot, Lamp, Memristor, Thermistor, LDR, LED, LED Array

**Sources:** DC Voltage, AC Voltage, Square Wave, Clock, Variable Voltage, Current Source, Sweep, Noise, AM/FM, Antenna, VCO, Seq Gen

**Outputs:** Output, Probe, Ammeter, Ohmmeter, Test Point, Scope, Data Recorder, Audio Out, Stop Trigger

**Analog:** Diode, Zener, Varactor, Tunnel Diode, NPN/PNP, NMOS/PMOS, NJF/PJF, OpAmp, OpAmpReal, OTA, CC2, CCCS/CCVS/VCCS/VCVS, SCR, Diac, Triac, Triode, Optocoupler, Darlington, Schmitt

**Logic:** Logic Input/Output, AND, NAND, OR, NOR, XOR, Inverter, Schmitt Inverter, Analog Switch, TriState, Latch, Flip-Flops (D, JK, T), Monostable, Multiplexer, Demux, Half/Full Adder

**Chips:** Counter, Ring Counter, ADC, DAC, 7-Segment, 7-Seg Decoder, SRAM, PISO, SIPO

**Transformers:** Transformer, Tapped Transformer, Custom Transformer, Transmission Line, Crystal, Relay

**机电/特殊:** DC Motor, Fuse, Spark Gap, Switch, SPDT, Push Switch, MBB Switch, Timer, Voltage Rail, Clock, Text, Box, Labeled Node, Ground

### Scope 菜单
- [ ] Add Scope / Remove Scope
- [ ] Scope 参数配置

### Options 菜单
- [ ] Show Voltage/Circuit Colors
- [ ] Show Current
- [ ] Show Values
- [ ] Show Power / Power Consumed
- [ ] Euro Resistors
- [ ] Small Grid
- [ ] Conventional Current Motion
- [ ] Backward Euler vs Trapezoid
- [ ] Speed 滑块
- [ ] Default Resistor/Capacitor/Inductor 默认值

### Help 菜单
- [ ] Shortcuts — 快捷键列表
- [ ] About — 关于

---

## 12.2 属性编辑对话框 EditDialog

- [ ] **文本编辑** — 标签、名称
- [ ] **数值编辑** — 带单位解析（k/M/m/μ/n）
- [ ] **复选框** — 布尔选项
- [ ] **下拉选择** — 枚举选项
- [ ] **颜色选择** — 自定义颜色
- [ ] **按钮** — 操作按钮

---

## 12.3 滑块系统 SliderDialog

- [ ] **`Adjustable` 接口** — 元件绑定滑块
- [ ] 滑块面板：侧边栏显示所有活动滑块
- [ ] 支持同时多个滑块

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
