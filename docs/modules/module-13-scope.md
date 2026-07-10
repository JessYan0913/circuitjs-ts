# 模块 13 — 示波器 (Scope)

> **目标**: 完整实现示波器功能，包括波形显示、触发系统、FFT 频谱分析。
> **优先级**: P3 — 高级功能

---

## 原始 Java → 目标 TS

| Java | TS | 状态 |
|------|-----|------|
| `Scope.java` | (新建) `packages/ui/scope/ScopePanel.tsx` | ❌ |
| `ScopeElm.java` | (新建) `packages/ui/scope/ScopeModel.ts` | ❌ |
| `ScopePopupMenu.java` | — | ❌ |
| `ScopePropertiesDialog.java` | — | ❌ |
| `FFT.java` | (新建) `packages/core/math/FFT.ts` | ❌ |

---

## 当前状态

> **完全未实现** — Scope 是 CircuitJS 的核心功能。

---

## 13.1 Scope 数据模型

- [ ] **Channel 绑定** — 每个 Scope 绑定到电路中的探测点
- [ ] **采样缓冲区** — 滚动缓冲区存储最近 N 个采样点
- [ ] **时间基础** — 每格时间宽度（可调）
- [ ] **电压范围** — Y 轴每格电压值（可调）
- [ ] **偏移** — Y 轴位置偏移

### 触发系统

- [ ] **触发模式**: Auto, Normal, Once, None
- [ ] **触发斜率**: 上升沿/下降沿
- [ ] **触发电平**: 可调电压阈值
- [ ] **触发源**: 选择绑定通道

---

## 13.2 Scope 绘制

- [ ] 网格绘制（浅色方格背景）
- [ ] 波形绘制（彩色曲线）
- [ ] 触发标记（箭头或横线）
- [ ] 时间/电压刻度标签
- [ ] 多轨迹同时显示
- [ ] 通道名称/颜色标识

---

## 13.3 Scope 菜单 & 交互

- [ ] **右键菜单**: 清除波形、停止/运行、X-Y 模式、Max 模式、Stack 模式
- [ ] **拖拽**: 调整 Scope 面板高度
- [ ] **鼠标滚轮**: 缩放时间基础
- [ ] **Scope 属性对话框**: 绑定探针、调参

---

## 13.4 FFT 频谱分析

- [ ] 波形数据 → FFT → 频谱显示
- [ ] 频率轴刻度
- [ ] 对数/线性刻度切换

---

## 13.5 Scope 配置序列化

- [ ] 电路文本 `o ...` 行保存 Scope 配置
- [ ] `maxScopeCount = 8` — 最多 8 个 Scope

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
