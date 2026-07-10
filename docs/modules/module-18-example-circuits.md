# 模块 18 — 示例电路库

> **目标**: 导入原始示例电路，实现示例浏览器 UI。
> **优先级**: P4 — 部署与扩展

---

## 源 → 目标

| 原始 | 目标 | 状态 |
|------|------|------|
| `circuitjs1/public/circuits/` | `packages/circuits/` | ❌ 空 |
| `setuplist.txt` | `packages/ui/public/circuits/` | ❌ |
| — | 示例浏览器 UI | ❌ |

---

## 待实现

- [ ] **复制所有示例电路 `.txt`** 到重构项目
- [ ] **`setuplist.txt` 解析** — 分类/排序/子菜单生成
- [ ] **示例浏览器 UI**:
  - 分类展示
  - 搜索功能
  - 预览（电路名称 + 简短描述）
  - 点击加载

---

## 清单要点

- 原始示例库包含大量 .txt 格式电路文件
- 文本格式与模块 9 序列化兼容，可直接加载
- `setuplist.txt` 包含分类索引

---

> **进度同步**: 修改本文件后，请同步更新 [progress-tracker.md](../progress-tracker.md) 中的进度数值和状态。
