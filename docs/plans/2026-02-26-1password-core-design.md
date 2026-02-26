# Z-Paste 1Password Core Design (MVP)

日期：2026-02-26  
状态：已评审（Brainstorming 结果沉淀）  
目标：在现有 Z-Paste 项目中实现类似 1Password 的“最核心、最高频”功能，优先安全边界。

## 1. 范围与决策

### 已确认范围

- 集成形态：集成到现有快捷面板，新增 `Vault` 分区，不做独立应用窗口
- 条目类型：`Login` + `Secure Note`
- 解锁方式：`主密码 + Touch ID`
- 恢复机制：`Recovery Key`（恢复码）
- 高频能力：密码生成器、TOTP、一键复制、自动输入（Auto-Type）

### 非目标（MVP 不做）

- 浏览器扩展级自动填充
- 团队共享、多人协作、权限系统
- 云端托管密钥或远程恢复后门
- 除 Login/Note 外的复杂条目（信用卡、身份等）

## 2. 方案选择与理由

选择方案：`B 安全优先重构`。

核心理由：

- 密码管理与现有剪贴板历史属于不同安全等级，必须隔离运行边界
- UI 与主进程不应长期持有明文机密或主密钥
- 需要为未来审计、导出策略、恢复流程保留可证明的安全结构

本方案通过独立 `Vault Core Worker` 承担解密/加密与密钥生命周期管理，主进程只编排，渲染层只拿脱敏数据和一次性操作结果。

## 3. 总体架构

新增 4 个逻辑层：

1. `Renderer (Vault UI)`  
负责条目列表、编辑、搜索、密码生成、TOTP 展示、交互反馈。默认不渲染明文密码，仅在用户动作下请求一次性值。

2. `Main Orchestrator`  
负责 IPC 路由、解锁状态机、会话超时、调用 Auto-Type Agent、剪贴板清空计时器、审计事件写入。

3. `Vault Core Worker`（独立进程）  
唯一可接触明文机密与密钥材料的进程。职责：KDF、密钥包裹/解包、条目加解密、TOTP 计算、恢复码恢复流程。

4. `Auto-Type Agent`  
仅接受一次性凭据 payload，执行键盘注入（username -> tab -> password -> enter 可选）。不落盘敏感数据，失败快速回退复制。

### 安全边界

- Renderer/Main 不保存主密码，不缓存明文条目
- Worker 维护短会话密钥，锁定后内存清零
- 所有错误日志默认脱敏
- 审计记录只写事件元数据，不写明文内容

## 4. 密码学与密钥管理

### 密钥分层

- 主密码 -> `Argon2id` -> `KEK`
- `KEK` 解包 `DEK`（数据加密密钥）
- 每条条目生成随机 `itemKey` 加密敏感载荷
- `itemKey` 再由 `DEK` 包裹存储

这样可实现条目级隔离，支持密钥轮换，且降低单点泄露影响。

### 恢复码（Recovery Key）

- 初始化时生成高熵恢复码（建议 128-bit 以上，分组可读格式）
- 恢复码派生 `Recovery KEK`，用于包裹同一个 `DEK` 的备份副本
- 忘记主密码时，通过恢复码解包 `DEK`，再设置新主密码并重建 `KEK` 包裹
- 恢复成功后提示用户立即轮换恢复码

### Touch ID

- Touch ID 只用于“本机快速解锁会话”
- 通过 macOS Keychain 保存受生物识别保护的短期解锁材料
- 不将主密码本体写入 Keychain
- Touch ID 不可用时退回主密码

## 5. 数据模型（新增）

建议新增表：

- `vault_items`
  - `id`, `type(login|note)`, `title`, `website`, `favorite`, `tags`, `created_at`, `updated_at`, `last_used_at`
- `vault_item_secrets`
  - `item_id`, `encrypted_payload`, `wrapped_item_key`, `enc_version`
- `vault_crypto_meta`
  - `id(singleton)`, `kdf_type`, `kdf_params`, `salt`, `dek_wrapped_by_master`, `dek_wrapped_by_recovery`, `created_at`, `updated_at`
- `vault_audit_events`
  - `id`, `event_type`, `result`, `reason_code`, `created_at`

说明：

- `Login` 敏感字段（username/password/notes/totpSecret）放入 `encrypted_payload`
- `Secure Note` 的正文放入 `encrypted_payload`
- 可检索字段（title/website/tag）保留明文或低敏摘要，避免全表解密搜索

## 6. 核心功能流

### 6.1 新建与编辑条目

- UI 输入后提交给 Main，再转发 Worker 加密写库
- 保存返回 `itemId` 与最小展示数据
- 编辑流程同理，Worker 内部做版本校验与覆盖

### 6.2 密码生成器

- 参数：长度、大小写、数字、符号、易读模式
- 本地生成，不联网
- 生成后可直接填入登录条目或复制，复制触发自动清空

### 6.3 搜索与列表

- 搜索先在可检索元数据层执行（title/website/tag/favorite）
- 打开详情时按需解密对应条目
- 列表默认只显示脱敏摘要

### 6.4 一键复制

- 复制 username/password/TOTP 时才解密目标字段
- Main 设置 30-90 秒自动清空剪贴板
- 应用锁定或退出时清空敏感缓存

### 6.5 自动输入（Auto-Type）

- 指令模型：`username -> tab -> password -> enter?`
- 可配置步间延迟（如 50-150ms）
- 任一步骤失败（焦点丢失、权限问题、超时）立即中断
- 中断后回退为复制模式并提示用户

### 6.6 TOTP

- Login 可绑定 `otpauth secret`
- Worker 计算当前 6 位码（30 秒窗口）
- UI 显示剩余秒数并支持一键复制
- 不持久化明文动态码

## 7. 锁定策略与状态机

状态：

- `Locked`：仅允许解锁与恢复入口
- `Unlocked`：允许读取/编辑/复制/自动输入
- `GraceUnlocked`：Touch ID 快速续解阶段（短时）

触发锁定：

- 手动锁定
- 空闲超时（如 5-15 分钟可配置）
- 应用进入敏感状态（可选：系统休眠后锁定）

解锁失败防护：

- 连续失败阈值后指数退避
- 错误提示统一，不暴露具体失败原因

## 8. 错误处理与回退策略

- Touch ID 失败：回退主密码
- Keychain 绑定失效：要求重新绑定，不影响历史密文
- 恢复码错误：拒绝部分恢复，完整校验后才重建会话
- 自动输入失败：中断并回退复制
- 数据损坏：通过 `enc_version` 与完整性校验快速识别并提示恢复流程

## 9. 测试与验收

### 测试分层

- 单元测试：Argon2 参数、密钥包裹/解包、密码生成、TOTP 时间窗口
- 集成测试：Renderer/Main/Worker IPC、锁定状态机、恢复码重建
- E2E：创建 Login、复制密码、自动输入、剪贴板自动清空、锁定后拒绝操作
- 安全回归：日志脱敏、明文生命周期、异常路径泄露检查

### MVP 验收标准

- 能稳定创建/编辑/搜索 Login 与 Secure Note
- 主密码、Touch ID、恢复码均可完成解锁或恢复闭环
- 自动输入在主流应用可用，失败时可靠回退复制
- 敏感复制后剪贴板自动清空
- 锁定后无明文读取路径

## 10. 实施里程碑

### M1：安全底座

- Worker 隔离进程与 IPC 协议
- 主密码初始化、Argon2id、密钥分层
- 恢复码生成与恢复闭环
- 锁定/解锁状态机

### M2：核心 Vault 功能

- Login + Secure Note CRUD
- Vault 列表与搜索
- 密码生成器
- TOTP 计算与复制

### M3：高频体验与稳态

- Auto-Type Agent 与失败回退
- Touch ID 绑定/续解
- 审计事件与故障提示
- E2E 与安全回归收尾

---

本设计遵循 YAGNI：只交付 1Password 的核心高频路径，不提前引入浏览器扩展和复杂条目体系。后续若进入二期，可在保持当前安全边界不变的前提下扩展类型、导入导出与跨端能力。
