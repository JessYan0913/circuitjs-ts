# 模块 14 — 自定义复合元件

> **目标**: 实现用户自定义复合元件（子电路封装）和自定义逻辑元件（布尔表达式）。
> **优先级**: P3 — 高级功能

---

## 原始 Java → 目标 TS

| Java | TS | 状态 |
|------|-----|------|
| `CompositeElm.java` | ❌ | ❌ |
| `CustomCompositeElm.java` | ❌ | ❌ |
| `CustomCompositeModel.java` | ❌ | ❌ |
| `CustomCompositeChipElm.java` | ❌ | ❌ |
| `CustomLogicElm.java` | ❌ | ❌ |
| `CustomLogicModel.java` | ❌ | ❌ |
| `EditCompositeModelDialog.java` | ❌ | ❌ |

---

## 功能概述

**自定义复合元件允许用户:**
1. 将一组电路封装为单个元件
2. 暴露引脚（输入/输出引脚定义）
3. 保存和加载自定义元件模型

**自定义逻辑元件允许用户:**
1. 用布尔表达式定义芯片行为（如 `D = (A & B) | C`）
2. 输入/输出引脚延迟定义
3. Not/TriState 输出配置

---

## 待实现

### 复合元件
- [ ] `CompositeElm` 基类 — 内部包含子电路
- [ ] 引脚映射: 子电路的内部节点 ↔ 封装引脚
- [ ] 模型数据序列化嵌入电路文本
- [ ] 全局模型库（跨电路复用）

### 自定义逻辑
- [ ] 布尔表达式解析器
- [ ] 引脚延迟定义
- [ ] 输出类型配置（Normal, Not, TriState）
- [ ] 模型编辑对话框

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
