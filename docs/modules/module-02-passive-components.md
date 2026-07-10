# 模块 2 — 无源元件

> **目标**: 完整实现所有无源元件的电气行为、绘制、序列化。
> **优先级**: P0 — 核心仿真正确性

---

## 2.1 电阻 `ResistorElm.java`

**TS**: `packages/core/components/passive/ResistorComponent.ts`

- [x] 基础已实现
- [ ] **dump type**: `r` — 格式: `r x1 y1 x2 y2 flags resistance`
- [ ] **stamp**: `stampResistor(n0, n1, resistance)`
- [ ] **绘制**: 蜿蜒折线（zigzag），`interpPoint` 沿线 5 段折线，振幅 1/8 长度
- [ ] **值标签**: 欧姆值 k/M 前缀格式化
- [ ] **getInfo()**: `["Resistor", "I = XmA", "Vd = XV"]`
- [ ] **EditInfo**: Resistance (ohms)

---

## 2.2 电容 `CapacitorElm.java`

**TS**: `packages/core/components/passive/CapacitorComponent.ts`

- [x] 基础已实现
- [ ] **dump type**: `c` — 格式: `c x1 y1 x2 y2 flags capacitance voltdiff`
- [ ] **伴随模型**: Backward Euler `I = C*(V - Vprev)/dt + Iprev`
- [ ] **绘制**: 两条平行线（间距固定，与元件长度无关）
- [ ] **初始条件**: dump/load 含初始电压 `voltdiff`
- [ ] **getInfo()**: `["Capacitor", "I = XmA", "Vd = XV"]`

### 2.2.1 有极性电容 `PolarCapacitorElm.java`

- [ ] **dump type**: `C`（大写）
- [ ] **绘制**: 同电容 + 正极标记 `+`

---

## 2.3 电感 `InductorElm.java`

**TS**: `packages/core/components/passive/InductorComponent.ts`

- [x] 基础已实现
- [ ] **dump type**: `l` — 格式: `l x1 y1 x2 y2 flags inductance current`
- [ ] **伴随模型**: 电流源并联电阻
- [ ] **绘制**: 4 半圆弧线圈 `drawCoil()`
- [ ] **初始条件**: dump/load 含初始电流
- [ ] **梯形 vs 后向欧拉选项**
- [ ] **getInfo()**: `["Inductor", "I = XmA", "Vd = XV"]`

---

## 2.4 导线 `WireElm.java`

**TS**: `packages/core/components/passive/WireComponent.ts`

- [x] 基础已实现
- [ ] **dump type**: `w`
- [ ] **stamp**: 两端短接（KVL 行 `stampVoltageSource(n0, n1, vs, 0)`）
- [ ] **绘制**: 直线，`getVoltageColor()` 电压着色
- [ ] **电压标签**: 悬停/选中时显示

---

## 2.5 开关系列

### 2.5.1 单刀单掷 `SwitchElm.java`

**TS**: `packages/core/components/passive/SwitchComponent.ts`

- [x] 基础已实现
- [ ] **dump type**: `s` — 格式: `s x1 y1 x2 y2 flags`
- [ ] **stamp**: 开=断路(0)，关=导线(`stampVoltageSource + 0V`)
- [ ] **交互**: 点击切换（`mouseUp()` → `toggle()`）
- [ ] **绘制**: 开=断开缺口+小圆触点，关=直线
- [ ] **getInfo()**: `["switch", "I = XmA", "Vd = XV"]`

### 2.5.2 单刀双掷 `Switch2Elm.java`

- [ ] **dump type**: `S`（大写）
- [ ] **3 post**: 公共端 + 两个选择端
- [ ] **dump 额外**: `position`（0 或 1）

### 2.5.3 推动开关 `PushSwitchElm.java`

- [ ] **dump type**: `p`
- [ ] **交互**: 按下=闭合，松开=断开（momentary）
- [ ] **绘制**: 推动按钮符号

### 2.5.4 先通后断开关 `MBBSwitchElm.java`

- [ ] **dump type**: `MB`
- [ ] Make-Before-Break：切换瞬间两端都连通

---

## 2.6 保险丝 `FuseElm.java`

- [ ] **status**: ❌ 未实现
- [ ] **dump type**: `f`
- [ ] **trip 状态**: `blown`，电流超过 `maxCurrent` 熔断
- [ ] **绘制**: 正常=直线，熔断=断裂

---

## 2.7 方框 `BoxElm.java`

- [ ] **status**: ❌ 未实现
- [ ] **dump type**: `b`
- [ ] **特性**: 纯图形元件，无电气作用，继承自 `GraphicElm`

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
