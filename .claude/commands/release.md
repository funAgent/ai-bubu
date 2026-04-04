# 发布新版本

当用户执行 `/project:release` 时，按以下步骤引导发布流程。
每一步执行前向用户确认，获得许可后再操作。

## Step 1: 预检

检查当前分支和工作区状态：

```bash
git status
git branch --show-current
```

**检查项**：
- 当前在 `main` 分支
- 工作区干净（无未提交变更）
- 远程分支已同步（`git pull origin main`）

如果不满足，提示用户先处理，不要继续。

## Step 2: 确认版本级别

询问用户本次发布的版本级别：

| 级别    | 说明       | 示例              |
| ------- | ---------- | ----------------- |
| `patch` | Bug 修复   | 0.1.0 → 0.1.1    |
| `minor` | 新功能     | 0.1.0 → 0.2.0    |
| `major` | 破坏性变更 | 0.1.0 → 1.0.0    |
| 直接指定 | 自定义版本 | 如 `0.2.0`       |

## Step 3: 更新版本号

```bash
pnpm bump <level>
```

脚本会同步更新三个文件：
- `packages/app/package.json`
- `packages/app/src-tauri/tauri.conf.json`
- `packages/app/src-tauri/Cargo.toml`

执行后确认输出正确。

## Step 4: 生成 Changelog

```bash
git-cliff -o CHANGELOG.md
```

生成后展示 CHANGELOG 中本次版本的变更摘要，请用户确认内容无误。

## Step 5: 提交发版 Commit

```bash
git add -A
git commit -m "chore(app): release v<VERSION>"
```

注意：此处直接使用规范的 release commit 格式，**不使用 panda-git-commit**。

## Step 6: 打 Tag

```bash
git tag v<VERSION>
```

## Step 7: 推送

**必须获得用户明确确认后才执行。**

```bash
git push origin main --tags
```

## Step 8: 告知后续

推送完成后，告知用户：

1. GitHub Actions 已触发自动构建（macOS 双架构 + Windows + Linux）
2. 构建会自动签名并生成 `latest.json`（应用内自动更新所需）
3. 构建完成后会在 GitHub Releases 创建 **Draft Release**，包含安装包和 `latest.json`
4. 需要到 https://github.com/funAgent/ai-bubu/releases 手动确认并发布
5. **发布后**，已安装的旧版本会在启动时自动检测到新版本并提示更新
6. 可以在 https://github.com/funAgent/ai-bubu/actions/workflows/release.yml 查看构建进度

## 首次配置（签名密钥）

如果仓库还未配置签名密钥，需要先完成以下一次性设置：

### 1. 生成密钥对

```bash
pnpm tauri signer generate -w ~/.tauri/aibubu.key
```

终端会输出公钥字符串（一长串 base64），将其填入 `packages/app/src-tauri/tauri.conf.json` 的 `plugins.updater.pubkey` 字段。

### 2. 配置 GitHub Secrets

到仓库 Settings → Secrets and variables → Actions 添加：

| Secret 名称 | 值 |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | `~/.tauri/aibubu.key` 文件的全部内容 |

> 生成密钥时不要设置密码（直接回车跳过），GitHub Secrets 不支持空值。

### 3. 提交公钥

将更新后的 `tauri.conf.json`（含 pubkey）提交到 main 分支。

## 约束

- 版本号**必须**使用 `pnpm bump`，不要手动修改文件
- release commit 格式固定为 `chore(app): release v<VERSION>`
- tag 格式固定为 `v<VERSION>`（如 `v0.2.0`）
- 推送前**必须**获得用户明确确认
- 如果任何步骤失败，停止并报告问题，不要跳过
