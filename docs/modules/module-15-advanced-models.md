# 模块 15 — 高级模型

> **目标**: 实现数学表达式解析器、二极管/晶体管模型参数库。
> **优先级**: P3 — 高级功能
> **原始 Java 源码位置**: `E:\circuitjs1\src\com\lushprojects\circuitjs1\client\`

---

## 原始 Java → 目标 TS

| Java | TS | 状态 |
|------|-----|------|
| `Expr.java` | (新建) `packages/core/models/Expr.ts` | ✅ |
| `DiodeModel.java` | `packages/core/components/active/DiodeModel.ts` | ✅ 已实现 |
| `TransistorModel.java` | (新建) `packages/core/models/TransistorModels.ts` → `packages/core/components/active/TransistorModel.ts` | ✅ 已增强 |

---

## 15.1 Expr.java — 表达式解析器

- 支持变量、数值常量、数学函数（sin, cos, sqrt, abs, sign）
- 运算符 `+ - * / ^ %`
- 用于自定义逻辑、自定义函数元件

**TS**: `packages/core/src/models/Expr.ts`

### 已实现

- [x] 词法分析（tokenization）
- [x] 语法分析（递归下降）
- [x] 求值执行
- [x] 错误处理

支持函数: sin, cos, abs, exp, log, sqrt, tan, min, max, pwl, mod, step, select, clamp, pwr, pwrs, tri, saw

---

## 15.2 DiodeModel.java

**TS**: `packages/core/components/active/DiodeModel.ts` — ✅ 完整实现

- [x] 肖特基二极管方程: `I = Is * (exp(V/(N*Vt)) - 1)`
- [x] `vscale = N * Vt`（热电压）
- [x] `vcrit` 临界电压计算
- [x] `limitStep()` — SPICE 电压限幅
- [x] `doStep()` — 牛顿迭代线性化（电导 + 诺顿等效电流源）
- [x] `getCurrent()` — 电流计算
- [x] gmin 步进辅助收敛

### 已实现增强

- [x] **内置模型库**: 1N4148（通用开关二极管）
- [x] **内置模型库**: 1N4004（整流二极管）
- [x] **内置模型库**: 1N5711, 1N5712, 1N34, LED 模型
- [x] **DiodeComponent UI**: 模型选择下拉菜单
- [x] **ZenerComponent UI**: 模型选择下拉菜单（Zener 过滤）
- [x] `getDescription()` / `getModelList()` / `createModelMap()`
- [ ] **自定义模型参数编辑**（通过独立模型编辑器对话框）

模型参数:
```
saturationCurrent (Is), seriesResistance, emissionCoefficient (N)
breakdownVoltage, breakdownCurrent
```

---

## 15.3 TransistorModel.java

**TS**: `packages/core/components/active/TransistorModel.ts` — ✅ 已增强

### 已实现

- [x] **封装 `TransistorModel` 类** — 从组件中分离模型参数
- [x] **内置 NPN 型号库**（2N3904, BC547）
- [x] **内置 PNP 型号库**（2N3906, BC557）
- [x] **`TransistorComponent.doStep()` 完整 Gummel-Poon 模型**
  - [x] 使用模型参数 (`satCur`, `emissionCoeffF/R`, `betaR`, `invEarlyVoltF/R`)
  - [x] 基区电荷调制（Early 效应 + 势垒电容滚降）
  - [x] BE/BC 泄漏电流
- [x] **模型选择 UI**: 下拉菜单选择内置型号
- [x] `getDescription()` / `getModelList()`
- [ ] **MOSFET 型号库**
- [ ] **自定义模型参数编辑**（通过独立模型编辑器对话框）

模型参数:
```
beta (forward), beta_r (reverse), Vt (thermal voltage)
Vbe (base-emitter voltage), Va (early voltage)
IS, IKF, IKR, ISE, ISC, NE, NC, NF, NR, VAF, VAR, BR
```

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
