# 1Password Core Vault Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在现有 Stash 中交付安全优先的 Vault MVP（Login + Secure Note、主密码+Touch ID、恢复码、密码生成、TOTP、自动输入回退）。

**Architecture:** 新增独立 Vault 领域层（`main/vault`）与数据库表，主进程只做编排和 IPC，渲染层通过新 `Vault` 视图调用 API。MVP 先完成安全底座和高频操作，再补自动输入与审计。

**Tech Stack:** Electron, TypeScript, better-sqlite3, Node crypto, React, Zustand

---

### Task 1: 建立 Vault 数据层（Schema + Repository）

**Files:**
- Modify: `src/main/database/schema.ts`
- Create: `src/main/database/vault-repository.ts`
- Modify: `src/main/index.ts`（仅注册最小可用 IPC）

**Step 1: 写失败验证（RED）**

Run: `npm run typecheck:node`  
Expected: 在新增 `vault:` IPC 前，`index.ts` 与新模块引用不存在。

**Step 2: 新增表结构**

- 在 `schema.ts` 增加 `vault_items`, `vault_item_secrets`, `vault_crypto_meta`, `vault_audit_events`。
- 为 `type`, `updated_at`, `last_used_at`, `event_type` 建索引。

**Step 3: 新增 Repository**

- 新建 `vault-repository.ts`，实现：
  - `listVaultItems`
  - `getVaultItemMetaById`
  - `getVaultItemSecretById`
  - `insertVaultItem`
  - `updateVaultItem`
  - `deleteVaultItem`
  - `upsertVaultCryptoMeta`
  - `getVaultCryptoMeta`
  - `appendVaultAuditEvent`

**Step 4: 注册最小 IPC**

- `vault:list`, `vault:get`, `vault:delete`。
- 先返回元数据与加密占位结果，不暴露明文。

**Step 5: 验证（GREEN）**

Run: `npm run typecheck`  
Expected: PASS

Run: `npm run build`  
Expected: PASS

**Step 6: Commit**

```bash
git add src/main/database/schema.ts src/main/database/vault-repository.ts src/main/index.ts
git commit -m "feat: add vault schema and repository foundation"
```

### Task 2: 解锁状态机与会话安全

**Files:**
- Create: `src/main/vault/session.ts`
- Create: `src/main/vault/crypto.ts`
- Modify: `src/main/index.ts`

**Step 1: RED**

Run: `npm run typecheck:node`  
Expected: 新增 `vault:unlock`/`vault:lock` handler 未实现。

**Step 2: 实现会话状态**

- 状态：`locked | unlocked`
- 方法：`unlockWithMasterPassword`, `unlockWithRecoveryKey`, `lock`, `isUnlocked`
- 增加空闲超时自动锁定（默认 10 分钟）

**Step 3: 实现密钥封装 API（MVP）**

- 生成随机 `DEK`
- 主密码派生密钥包裹 `DEK`
- 恢复码派生密钥包裹 `DEK`
- 仅 Worker/Session 层可访问解包后 `DEK`

**Step 4: 注册 IPC**

- `vault:setupMasterPassword`
- `vault:unlock`
- `vault:unlockWithRecoveryKey`
- `vault:lock`
- `vault:getSecurityState`

**Step 5: GREEN**

Run: `npm run typecheck && npm run build`  
Expected: PASS

**Step 6: Commit**

```bash
git add src/main/vault/session.ts src/main/vault/crypto.ts src/main/index.ts
git commit -m "feat: add vault lock state and key wrapping flow"
```

### Task 3: Login / Secure Note CRUD（密文载荷）

**Files:**
- Create: `src/main/vault/service.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

**Step 1: RED**

Run: `npm run typecheck:web`  
Expected: preload 与 renderer API 类型缺少 `vault` 方法。

**Step 2: 实现 Service**

- `createLogin`, `createSecureNote`, `updateItem`, `deleteItem`, `listItems`, `getItemDetail`
- 敏感字段统一通过 `DEK` 加密后入库
- `listItems` 仅返回元数据，不返回明文敏感字段

**Step 3: 接入 IPC + preload**

- `vault:createLogin`
- `vault:createSecureNote`
- `vault:updateItem`
- `vault:getItemDetail`
- `vault:listItems`

**Step 4: GREEN**

Run: `npm run typecheck && npm run build`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/vault/service.ts src/main/index.ts src/preload/index.ts src/preload/index.d.ts
git commit -m "feat: add encrypted vault item CRUD APIs"
```

### Task 4: 密码生成器与 TOTP

**Files:**
- Create: `src/main/vault/password-generator.ts`
- Create: `src/main/vault/totp.ts`
- Modify: `src/main/vault/service.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

**Step 1: RED**

Run: `npm run typecheck:node`  
Expected: `vault:generatePassword` / `vault:getTotpCode` 未定义。

**Step 2: 实现生成器**

- 支持：长度、大写、小写、数字、符号、可读模式
- 默认策略：20 位，包含全部字符集

**Step 3: 实现 TOTP**

- 基于 RFC 6238（30 秒窗口，6 位）
- 输入：base32 secret
- 输出：`code`, `remainingSeconds`

**Step 4: 连接 IPC**

- `vault:generatePassword`
- `vault:getTotpCode`

**Step 5: GREEN**

Run: `npm run typecheck && npm run build`  
Expected: PASS

**Step 6: Commit**

```bash
git add src/main/vault/password-generator.ts src/main/vault/totp.ts src/main/vault/service.ts src/main/index.ts src/preload/index.ts src/preload/index.d.ts
git commit -m "feat: add password generator and totp support"
```

### Task 5: Vault UI（列表 + 详情 + 新建）

**Files:**
- Create: `src/renderer/src/stores/vaultStore.ts`
- Create: `src/renderer/src/components/Vault/VaultView.tsx`
- Create: `src/renderer/src/components/Vault/VaultList.tsx`
- Create: `src/renderer/src/components/Vault/VaultDetail.tsx`
- Create: `src/renderer/src/components/Vault/VaultEditor.tsx`
- Modify: `src/renderer/src/components/Panel/PanelWindow.tsx`
- Modify: `src/renderer/src/locales/en.json`
- Modify: `src/renderer/src/locales/zh-CN.json`
- Modify: `src/renderer/src/locales/zh-TW.json`

**Step 1: RED**

Run: `npm run typecheck:web`  
Expected: 新组件和 store 未接入时报错。

**Step 2: 新增 Vault Tab**

- 在现有顶部 Tab 增加 `Vault`
- 复用现有窗口布局，不改变 clipboard 主流程

**Step 3: 基础交互**

- 列表检索（title/website/tag）
- 详情页脱敏展示
- 新建/编辑 Login 与 Secure Note

**Step 4: GREEN**

Run: `npm run typecheck && npm run build`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/src/stores/vaultStore.ts src/renderer/src/components/Vault src/renderer/src/components/Panel/PanelWindow.tsx src/renderer/src/locales/en.json src/renderer/src/locales/zh-CN.json src/renderer/src/locales/zh-TW.json
git commit -m "feat: add vault tab with login and note management"
```

### Task 6: 自动输入与复制回退

**Files:**
- Create: `src/main/vault/auto-type.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`
- Modify: `src/renderer/src/components/Vault/VaultDetail.tsx`

**Step 1: RED**

Run: `npm run typecheck`  
Expected: `vault:autoType` 与复制回退 API 未实现。

**Step 2: Auto-Type Agent**

- 顺序：username -> tab -> password -> enter(可选)
- 可配置步间延迟
- 超时/焦点异常时抛出可识别错误码

**Step 3: 回退策略**

- Auto-Type 失败自动执行 `copyPassword`
- UI 提示“已回退到复制”

**Step 4: GREEN**

Run: `npm run typecheck && npm run build`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/vault/auto-type.ts src/main/index.ts src/preload/index.ts src/preload/index.d.ts src/renderer/src/components/Vault/VaultDetail.tsx
git commit -m "feat: add vault auto-type with copy fallback"
```

### Task 7: 安全事件与收尾

**Files:**
- Modify: `src/main/vault/service.ts`
- Modify: `src/main/vault/session.ts`
- Modify: `src/main/database/vault-repository.ts`
- Modify: `src/main/index.ts`
- Modify: `src/renderer/src/components/Settings/SettingsPage.tsx`

**Step 1: RED**

Run: `npm run typecheck`  
Expected: 审计查询/显示入口未定义。

**Step 2: 写审计事件**

- 记录：setup/unlock/lock/recovery/autotype-failed/export（若有）
- 仅记录元数据和结果，不记录敏感明文

**Step 3: UI 最小展示**

- 在设置页新增 Vault 安全状态区块（已锁定/已解锁、上次失败时间等）

**Step 4: GREEN**

Run: `npm run typecheck && npm run build`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/vault/service.ts src/main/vault/session.ts src/main/database/vault-repository.ts src/main/index.ts src/renderer/src/components/Settings/SettingsPage.tsx
git commit -m "feat: add vault audit events and security status"
```
