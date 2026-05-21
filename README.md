# Baklib Theme i18n Hover

为 **VS Code / Cursor** 提供的 Baklib 主题国际化开发辅助扩展：在 Liquid 与 JSON 中悬停 `t:schema.*` 或 `{{ "key" | t }}` 时，直接展示各语言 locale 文件中的译文。

## 文档索引

| 文档 | 说明 |
|------|------|
| [docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md) | **完整项目规格**（需求、架构、API、里程碑）— 新开仓库请先读此文件 |
| [docs/CLI_ALIGNMENT.md](docs/CLI_ALIGNMENT.md) | **与 baklib-theme-i18n-cli 对齐**（提取规则、key 映射、模块对照） |
| [docs/BAKLIB_I18N_CONVENTIONS.md](docs/BAKLIB_I18N_CONVENTIONS.md) | Baklib 主题 i18n 约定与 key 解析规则 |
| [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) | 实现指南（Hover、缓存、测试、发布） |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | 本地开发、F5 调试、VSIX 安装、Marketplace 发布 |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | 用户与工作区配置项说明 |

## 安装与使用（本机 VS Code / Cursor）

开发完成后，在本地编辑器中启用扩展有三种方式：

| 场景 | 做法 |
|------|------|
| 自己本机长期用 | 打包 VSIX → **从 VSIX 安装**（推荐） |
| 还在改扩展代码 | 按 **F5** 启动扩展开发主机 |
| 对外分发 | 发布到 VS Code Marketplace |

### 方式一：打包 VSIX 并安装（推荐）

```bash
cd baklib-theme-i18n-hover
npm install
npm run compile
npm run package
# 生成 baklib-theme-i18n-hover-<version>.vsix
```

**图形界面安装：**

1. 打开扩展面板（`Cmd+Shift+X` / `Ctrl+Shift+X`）
2. 右上角 `...` → **Install from VSIX...**（从 VSIX 安装…）
3. 选择生成的 `.vsix` 文件
4. 按提示 **Reload Window**（重新加载窗口）

**命令行安装：**

```bash
# VS Code
code --install-extension baklib-theme-i18n-hover-0.1.0.vsix

# Cursor（需已安装 cursor 命令；可在命令面板执行 Shell Command: Install 'cursor' command in PATH）
cursor --install-extension baklib-theme-i18n-hover-0.1.0.vsix
```

安装后打开含 `config/settings_schema.json` 的 Baklib 主题目录即可使用。配置项见 [docs/CONFIGURATION.md](docs/CONFIGURATION.md)。

### 方式二：F5 调试（仅开发时）

1. 用 VS Code / Cursor 打开本仓库
2. `npm run watch`（或 `npm run compile`）
3. 按 **F5** 启动「扩展开发主机」
4. 在新窗口打开真实主题或 `test/fixtures/mini-theme` 验证 Hover

扩展开发主机关闭后，扩展不会保留在日常使用的编辑器中。详见 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。

### 方式三：发布到 Marketplace

1. 在 [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage) 创建 Publisher（当前为 `tanmer`）
2. 在 Azure DevOps 生成 PAT（范围：**Marketplace → Manage**）
3. 登录并发布：

```bash
npx vsce login tanmer
npm run compile
npx vsce publish
```

发布后可在 VS Code / Cursor 扩展市场搜索 **Baklib Theme i18n Hover** 安装。Cursor 一般支持从 VS Code Marketplace 安装；若搜不到，仍可用 VSIX。

发布前检查清单见 [docs/DEVELOPMENT.md §10](docs/DEVELOPMENT.md#10-发布到-marketplace)。

### 安装后验证

- 扩展列表中出现 **Baklib Theme i18n Hover**
- 在 `.liquid` 中悬停 `{{ "key" | t }}` 或 `t:schema.*` 可看到各语言译文
- 若 `.liquid` 无 Hover：安装 [Shopify Liquid](https://marketplace.visualstudio.com/items?itemName=shopify.theme-check-vscode)，或在 `.vscode/settings.json` 中设置 `"files.associations": { "*.liquid": "liquid" }`

## 快速开始（开发者）

```bash
cd baklib-theme-i18n-hover
npm install
npm run compile
# 在 VS Code / Cursor 中按 F5 启动「扩展开发主机」
```

## 仓库状态

当前为 **规格 + 骨架** 阶段：`src/extension.ts` 含最小可运行 Hover 实现，可按 `docs/PROJECT_SPEC.md` 中的里程碑迭代。

## 许可证

MIT（可在 `package.json` 中调整）
