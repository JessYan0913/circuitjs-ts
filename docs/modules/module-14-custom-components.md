# 模块 14 — 自定义复合元件

> **目标**: 实现用户自定义复合元件（子电路封装）和自定义逻辑元件（布尔表达式）。
> **优先级**: P3 — 高级功能
> **原始 Java 源码位置**: `E:\circuitjs1\src\com\lushprojects\circuitjs1\client\`

---

## 原始 Java → 目标 TS

| Java | TS | 状态 |
|------|-----|------|
| `CompositeElm.java` | ✅ `CompositeElm.ts` | ✅ |
| `CustomCompositeElm.java` | ✅ `CustomCompositeComponent.ts` | ✅ |
| `CustomCompositeModel.java` | ✅ `CustomCompositeModel.ts` | ✅ |
| `CustomCompositeChipElm.java` | ✅ `CustomCompositeChipComponent.ts` | ✅ |
| `CustomLogicElm.java` | ✅ `CustomLogicComponent.ts` | ✅ |
| `CustomLogicModel.java` | ✅ `CustomLogicModel.ts` | ✅ |
| `EditCompositeModelDialog.java` | ✅ `EditCompositeModelDialog.tsx` | ✅ |

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

## 已实现

### 复合元件
- [x] `CompositeElm` 基类 — 内部包含子电路，管理子元件列表和节点映射
- [x] 引脚映射: 子电路的内部节点 ↔ 封装引脚，支持 stamp/doStep 委托给子元件
- [x] 模型数据序列化嵌入电路文本（`.` 开头的模型行）
- [x] 全局模型库（跨电路复用，`CustomCompositeModel.modelMap`）
- [x] 电压源路由：子元件电压源通过 CompositeElm 聚合

### 自定义逻辑
- [x] 布尔表达式解析器（支持 `&`, `|`, `^`, `!`, `()`, 变量、常量）
- [x] 引脚延迟定义（hold/latch 功能）
- [x] 输出类型配置（Normal, Not — 通过布尔表达式）
- [x] 模型编辑对话框（EditCompositeModelDialog — 可视化的芯片引脚编辑器）
  - [x] Canvas 展示芯片轮廓和引脚位置
  - [x] 拖拽引脚重新定位
  - [x] 宽度/高度调整
  - [x] 引脚名称编辑
  - [x] 引脚侧边切换（左/右）

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
