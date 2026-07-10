# 模块 8 — 传感器与特殊器件

> **目标**: 完整实现电位器、热敏电阻、光敏电阻、忆阻器等特殊器件。
> **优先级**: P3 — 高级功能
> **原始 Java 源码位置**: `E:\circuitjs1\src\com\lushprojects\circuitjs1\client\`

---

## 元件清单

| 元件 | dump type | Java type | 状态 | 说明 |
|------|-----------|-----------|------|------|
| `PotElm.java` | `pot` | 174 | ✅ | 电位器（3 端，可拖动滑块百分比，实现 `Adjustable`） |
| `ThermistorNTCElm.java` | `therm` | 350 | ✅ | NTC 热敏电阻（温度→电阻变化） |
| `LDRElm.java` | `ldr` | 374 | ✅ | 光敏电阻（照度→电阻变化） |
| `MemristorElm.java` | `mem` | 字符 `'m'` | ✅ | 忆阻器（电荷记忆电阻） |

---

## 实现要点

### 电位器 `PotElm`
- 3 端元件：两端固定电阻，中间滑动抽头
- `Adjustable` 接口：滑块控制分压比
- stamp：两个串联电阻，分压点随滑块位置变化

### NTC 热敏电阻 `ThermistorNTCElm`
- 电阻随温度升高而降低
- 默认 25°C 标称值
- 温度可以设为外部参数

### 光敏电阻 `LDRElm`
- 电阻随光照强度变化
- 暗电阻高 (~MΩ)，亮电阻低 (~kΩ)

### 忆阻器 `MemristorElm`
- 电荷记忆效应
- 非线性 I-V 特性
- 需要历史状态跟踪

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
