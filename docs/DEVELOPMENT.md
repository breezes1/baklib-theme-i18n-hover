# 本地开发与调试

## 1. 环境要求

| 工具 | 版本 |
|------|------|
| Node.js | ≥ 18 |
| npm / pnpm / yarn | 任选 |
| VS Code 或 Cursor | ≥ 1.85 |

## 2. 初始化仓库

```bash
# 若从本骨架复制
cd baklib-theme-i18n-hover
npm install
```

或使用 Yeoman 官方脚手架新建后合并本仓库 `src/` 与 `docs/`：

```bash
npm install -g yo generator-code
yo code
# ? New Extension (TypeScript)
# ? Extension name: baklib-theme-i18n-hover
```

## 3. 脚本（package.json）

```json
{
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "package": "vsce package",
    "lint": "eslint src --ext ts"
  }
}
```

## 4. 调试（F5）

`.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "${workspaceFolder}/test/fixtures/mini-theme"
      ],
      "outFiles": ["${workspaceFolder}/out/**/*.js"]
    }
  ]
}
```

步骤：

1. 打开 `baklib-theme-i18n-hover` 文件夹；
2. `npm run watch`（或先 `compile`）；
3. 按 **F5** 启动「扩展开发主机」；
4. 在新窗口打开 `test/fixtures/mini-theme` 或真实主题 `themes/wiki/docs`；
5. 打开 `templates/index.maple.liquid`，悬停 `t:schema...` 验证。

## 5. 在 Cursor 中调试

与 VS Code 相同：Cursor 基于 VS Code，**Run Extension** 配置通用。

若 F5 无反应，检查是否已安装 **Extension Development** 相关组件，或从命令面板运行 **Developer: Reload Window**。

## 6. 打包 VSIX 并安装到本机

开发完成后，若要在**日常使用的** VS Code / Cursor 中启用扩展（而非 F5 开发主机），请打包并安装 VSIX。

### 6.1 打包

```bash
npm install
npm run compile
npm run package
# 或：npx vsce package
# 生成 baklib-theme-i18n-hover-<version>.vsix（版本号见 package.json）
```

`@vscode/vsce` 已列入 `devDependencies`，一般无需单独安装。

### 6.2 安装（图形界面）

1. 打开扩展面板（`Cmd+Shift+X` / `Ctrl+Shift+X`）
2. 右上角 `...` → **Install from VSIX...**
3. 选择仓库根目录下生成的 `.vsix`
4. **Reload Window** 重新加载窗口

### 6.3 安装（命令行）

```bash
# VS Code
code --install-extension ./baklib-theme-i18n-hover-0.1.0.vsix

# Cursor
cursor --install-extension ./baklib-theme-i18n-hover-0.1.0.vsix
```

若终端找不到 `cursor`，在 Cursor 命令面板执行 **Shell Command: Install 'cursor' command in PATH**。

### 6.4 更新已安装版本

1. 修改 `package.json` 中的 `version`
2. 重新执行 `npm run package`
3. 再次 **Install from VSIX**（会覆盖同 publisher 的旧版本）

### 6.5 安装后验证

- 扩展列表中有 **Baklib Theme i18n Hover**
- 打开含 `locales/` 的主题目录
- 在 `.liquid` 悬停 `{{ "sample.title" | t }}` 或 JSON 中的 `t:schema.*` 应显示各语言译文
- 配置见 [CONFIGURATION.md](./CONFIGURATION.md)

| 场景 | 推荐方式 |
|------|----------|
| 本机长期使用 | VSIX 安装（§6） |
| 修改扩展源码 | F5 扩展开发主机（§4） |
| 团队 / 公开发布 | Marketplace（§10） |

## 7. 联调真实主题

在扩展开发主机中：

**File → Open Folder** → 选择：

```
/Users/mac/projects/tanmer/baklib/themes/wiki/docs
```

验证点见 [PROJECT_SPEC.md §7.3](./PROJECT_SPEC.md#73-手工测试清单)。

## 8. Liquid 语言支持

若 Hover 在 `.liquid` 不触发，安装其一：

- [Shopify Liquid](https://marketplace.visualstudio.com/items?itemName=shopify.theme-check-vscode)
- 或在工作区 `.vscode/settings.json` 中：

```json
{
  "files.associations": {
    "*.liquid": "liquid"
  }
}
```

扩展 `activationEvents` 含 `onLanguage:liquid`；无 Liquid 语法包时语言 ID 可能为 `plaintext`，需在 v0.2 增加 `onStartupFinished` 并对 `plaintext` 注册（慎用，易误触发）。

## 9. 推荐协作配置

扩展仓库 `.vscode/extensions.json`：

```json
{
  "recommendations": [
    "shopify.theme-check-vscode",
    "dbaeumer.vscode-eslint"
  ]
}
```

主题仓库 `.vscode/settings.json`（可选）：

```json
{
  "baklibThemeI18nHover.languageOrder": ["zh-CN", "en", "ja"],
  "baklibThemeI18nHover.themeRoot": "."
}
```

## 10. 发布到 Marketplace

适用于对外分发：用户可在扩展市场搜索安装，无需手动传 VSIX。

### 10.1 前置条件

1. 在 [Azure DevOps](https://dev.azure.com) 创建组织（若尚无）
2. 在 [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage) 创建 **Publisher**（本仓库 `package.json` 中为 `tanmer`）
3. 在 Azure DevOps → User settings → Personal access tokens 创建 PAT：
   - **Scopes**：`Marketplace` → **Manage**
4. 登录 CLI：

```bash
npx vsce login tanmer
# 按提示输入 PAT；或设置环境变量 VSCE_PAT
```

### 10.2 发布命令

```bash
npm run compile
npx vsce publish
# 指定 semver 段：npx vsce publish minor
```

`package.json` 的 `vscode:prepublish` 会在发布前自动执行 `compile`。

### 10.3 Cursor 用户

Cursor 基于 VS Code，通常可直接从 Marketplace 安装同一扩展。若市场搜不到，仍使用 §6 的 VSIX 方式。

### 10.4 发布检查清单

- [ ] `package.json`：`publisher`、`repository`、`license`、`icon`（128×128 PNG）
- [ ] `README.md`：功能说明与截图/GIF
- [ ] `CHANGELOG.md`：版本变更记录
- [ ] `npx vsce ls`：确认未误打包 `node_modules`、`.vscode` 等
- [ ] 在干净 Profile 下安装 VSIX 或市场版做冒烟测试
