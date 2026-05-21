# Baklib Theme i18n Hover — 完整项目规格

> 版本：0.1.0-draft  
> 目标编辑器：VS Code ≥ 1.85、Cursor（兼容 VS Code 扩展生态）  
> 目标用户：Baklib 主题（Liquid 模板）开发者

---

## 1. 背景与问题

### 1.1 现状

Baklib 主题国际化采用与 Shopify 相近的约定：

- **页面文案**：`{{ "layout.theme.search_input_placeholder" | t }}` → `locales/<lang>.json`
- **Schema 文案**：`"t:schema.templates.index.maple.settings.home_help_title.label"` → `locales/<lang>.schema.json`

在 `{% schema %}` 或 `config/settings_schema.json` 中编写时，编辑器默认只对 JSON 字段显示 Schema 说明（如 *"The default value for the setting."*），**不会**显示各语言的真实译文。

### 1.2 目标

构建 VS Code / Cursor 扩展，当鼠标悬停在翻译 key 上时：

1. 识别 Baklib 的 `t:schema.*` 与 `| t` 两种写法；
2. 自动定位当前文件所属**主题根目录**（含 `locales/` 的目录）；
3. 读取该主题下所有 `locales/<lang>.json` 与 `locales/<lang>.schema.json`；
4. 在 Hover 浮层中**按语言列出译文**（缺失时标注 `(missing)`）；
5. locale 文件变更后自动刷新，无需重启编辑器。

### 1.3 非目标（v1 不做）

- 不提供在线机器翻译；
- 不替代 `baklib-theme-i18n-cli` 的 extract / translate；
- 不修改 locale 文件（v2 可考虑「点击编辑」）；
- 不实现 Theme Check / Liquid 语法检查（可与其他扩展共存）。

---

## 2. 用户故事

| ID | 作为… | 我希望… | 以便… |
|----|--------|---------|--------|
| U1 | 主题开发者 | 悬停 `t:schema.xxx` 看到 zh-CN、en 等译文 | 确认 schema 文案是否已提取、翻译是否正确 |
| U2 | 主题开发者 | 悬停 `{{ "snippets.header.ask_ai" \| t }}` 看到各语言 | 改 Liquid 时不用切文件查 JSON |
| U3 | 主题开发者 | 打开 monorepo 子目录 `themes/wiki/docs` 仍能解析 locales | 工作区不必是主题根目录 |
| U4 | 主题开发者 | key 不存在时 Hover 显示 missing | 发现未跑 `extract-keys` 的遗漏 |
| U5 | 团队 | 通过 VSIX 或 Marketplace 分发 | 统一开发体验 |

---

## 3. Baklib i18n 约定摘要

详细规则见 [BAKLIB_I18N_CONVENTIONS.md](./BAKLIB_I18N_CONVENTIONS.md)。**Key 提取/解析逻辑必须与 [baklib-theme-i18n-cli](https://github.com/breezes1/baklib-theme-i18n-cli) 一致**，见 [CLI_ALIGNMENT.md](./CLI_ALIGNMENT.md)。

### 3.1 文件命名

```
<theme-root>/
  locales/
    zh-CN.json          # 页面/片段文案
    zh-CN.schema.json   # schema / settings_schema 文案
    en.json
    en.schema.json
    de.json
    de.schema.json
    ...
```

- 语言标识与 `config/settings_schema.json` 中 `theme_languages` 一致（如 `zh-CN`、`en`、`zh-TW`）。
- **禁止**使用 `t:settings_schema.*`（Baklib 规范要求使用 `t:schema.*`）。

### 3.2 Key 前缀与 JSON 路径映射

| 源码形式 | 去掉前缀后的 JSON 点路径 | 读取文件 |
|----------|-------------------------|----------|
| `t:schema.templates.index.maple.name` | `templates.index.maple.name` | `*.schema.json` |
| `{{ "layout.theme.search_input_placeholder" \| t }}` | `layout.theme.search_input_placeholder` | `*.json` |
| `{{ ".ask_ai" \| t }}`（相对 key） | 需拼接模板作用域前缀（v2） | `*.json` |

### 3.3 Schema 内可出现翻译 key 的字段

`name`、`description`、`label`、`info`、`placeholder`、`default`（值为 `t:schema...` 时）、`choices[].label` 等字符串字段。

### 3.4 与 CLI 的关系

| 工具 | 职责 |
|------|------|
| **本扩展** | 开发时**只读**展示已有 locale 译文 |
| **baklib-theme-i18n-cli** | `extract-keys`、`translate`、维护 `.baklib_theme_i18nrc.json` |

扩展**不**负责从直写文案生成 key；开发者须先完成 `| t` / `t:schema.*` 改造再 extract。

---

## 4. 功能规格

### 4.1 Hover Provider（MVP 必须）

**触发语言**：`liquid`（若未安装 Liquid 语法扩展，可同时注册 `plaintext` 或通过 `files.associations` 关联 `*.liquid`）。

**识别正则**：

```typescript
// Schema 翻译 key（悬停范围 = 整段 t:schema.xxx）
const T_SCHEMA = /t:schema\.([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)/g;

// 页面翻译 key（悬停范围 = 引号内 key 或整段 "key" | t）
const T_FILTER = /["']([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)["']\s*\|\s*t\b/g;
```

**悬停内容示例**（Markdown）：

```markdown
**i18n key** `templates.index.maple.settings.home_help_description.label`  
**bucket** schema

| 语言 | 译文 |
|------|------|
| zh-CN | 底部求助说明 |
| en | Can't find what you need? |
| de | _(missing)_ |
```

**行为细则**：

- 光标须在匹配到的 key 字符串范围内才显示 Hover；
- 若主题根目录找不到 `locales/`，显示提示：*未找到 locales 目录，请打开含 locales 的主题文件夹*；
- JSON 解析失败时显示文件名与错误信息，不崩溃；
- 支持 `//` 不在 JSON 中（标准 JSON）；若未来 locale 含注释，v2 用 `jsonc` 解析。

### 4.2 主题根目录解析

从当前文档路径向上遍历父目录，**第一个**包含 `locales/` 且其中至少有一个 `*.json` 的目录即为 `themeRoot`。

```
/Users/.../baklib/themes/wiki/docs/templates/index.maple.liquid
  → themeRoot = .../themes/wiki/docs
```

**配置覆盖**（可选）：`baklibThemeI18nHover.themeRoot` 显式指定绝对或相对工作区路径。

### 4.3 Locale 加载与缓存

```
LocaleIndex {
  themeRoot: string
  mtime: number          // locales 目录最新 mtime
  languages: Map<lang, { page: object, schema: object }>
}
```

- 首次 Hover 或 `mtime` 变化时重建索引；
- 监听 `workspace.createFileSystemWatcher('**/locales/**')` 的 create/change/delete；
- 单语言文件约 15–50KB，全量解析可接受；超大主题（>500KB/文件）v2 改为按需读单 key。

### 4.4 配置项

见 [CONFIGURATION.md](./CONFIGURATION.md)。

| 配置键 | 类型 | 默认 | 说明 |
|--------|------|------|------|
| `baklibThemeI18nHover.enabled` | boolean | `true` | 总开关 |
| `baklibThemeI18nHover.localesPath` | string | `locales` | 相对 themeRoot |
| `baklibThemeI18nHover.themeRoot` | string | `""` | 强制主题根，空则自动向上查找 |
| `baklibThemeI18nHover.languageOrder` | string[] | `[]` | 悬停语言顺序，空则按文件名排序 |
| `baklibThemeI18nHover.maxLanguages` | number | `20` | 最多显示语言数 |
| `baklibThemeI18nHover.showMissingOnly` | boolean | `false` | 为 true 时仅列出 missing 的语言（调试用） |

### 4.5 可选功能（里程碑）

| 版本 | 功能 |
|------|------|
| **v0.1 MVP** | Hover 多语言、`t:schema` + `\| t`、自动 themeRoot、文件监听 |
| **v0.2** | 相对 key `.xxx` 根据文件路径解析前缀；`settings_schema.json` 内 `t:schema` |
| **v0.3** | Completion：输入 `t:schema.` 时补全已有 key；Definition：跳转到 locale JSON |
| **v0.4** | 内联 Inlay Hint（行尾灰色显示默认语言译文）；可配置 sourceLanguage |
| **v0.5** | 从 Hover 一键复制 key；Sidebar 树形浏览所有 keys |

---

## 5. 技术架构

```
┌─────────────────────────────────────────────────────────┐
│  VS Code / Cursor                                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  extension.ts (activate)                          │  │
│  │    ├─ registerHoverProvider(liquid, json)         │  │
│  │    ├─ FileSystemWatcher(locales/**)               │  │
│  │    └─ ConfigurationChangeListener                 │  │
│  └───────────────────────────────────────────────────┘  │
│         │                                                │
│         ▼                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ themeRoot    │  │ localeIndex  │  │ hoverBuilder │  │
│  │ resolver     │→ │ loader/cache │→ │ (markdown)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
         │ read
         ▼
  <theme-root>/locales/{lang}.json
  <theme-root>/locales/{lang}.schema.json
```

### 5.1 模块划分

| 模块 | 文件 | 职责 |
|------|------|------|
| 入口 | `src/extension.ts` | 注册 provider、生命周期 |
| 主题根 | `src/themeRoot.ts` | 向上查找 + 配置覆盖 |
| 索引 | `src/localeIndex.ts` | 扫描、解析、缓存 locale |
| 解析 | `src/keyResolver.ts` | 正则匹配、schema vs page bucket |
| 悬停 | `src/hoverProvider.ts` | `provideHover` 实现 |
| 工具 | `src/jsonPath.ts` | `a.b.c` → 嵌套对象取值 |

### 5.2 依赖

- 运行时：仅 Node.js（`fs`、`path`），**无** npm 运行时依赖；
- 开发：`typescript`、`@types/vscode`、`@vscode/vsce`（打包）、`eslint`（可选）、`@vscode/test-electron`（集成测试，v0.2+）。

### 5.3 扩展清单（package.json contributes）

```json
{
  "activationEvents": ["onLanguage:liquid", "onLanguage:json"],
  "capabilities": {
    "virtualWorkspaces": false,
    "untrustedWorkspaces": { "supported": true }
  },
  "contributes": {
    "configuration": { "title": "Baklib Theme i18n", "properties": { } }
  }
}
```

---

## 6. 项目结构

```
baklib-theme-i18n-hover/
├── .vscode/
│   ├── launch.json          # F5 调试配置
│   └── extensions.json      # 推荐安装 Shopify Liquid 等
├── docs/
│   ├── PROJECT_SPEC.md      # 本文件
│   ├── BAKLIB_I18N_CONVENTIONS.md
│   ├── IMPLEMENTATION.md
│   ├── DEVELOPMENT.md
│   └── CONFIGURATION.md
├── src/
│   ├── extension.ts
│   ├── themeRoot.ts
│   ├── localeIndex.ts
│   ├── keyResolver.ts
│   ├── hoverProvider.ts
│   └── jsonPath.ts
├── test/
│   └── fixtures/            # 迷你主题样本，供单元测试
│       └── mini-theme/
│           ├── locales/
│           │   ├── zh-CN.json
│           │   └── zh-CN.schema.json
│           └── templates/
│               └── sample.liquid
├── package.json
├── tsconfig.json
├── .gitignore
├── .vscodeignore
├── LICENSE
└── README.md
```

---

## 7. 测试策略

### 7.1 单元测试（Node）

对 `jsonPath.getByPath`、`localeIndex.parseFilename('zh-CN.schema.json')` 等纯函数测试。

### 7.2 集成测试（@vscode/test-electron）

- 打开 `test/fixtures/mini-theme`；
- 悬停 `t:schema.templates.sample.name` 断言 Hover 含 `zh-CN` 与字符串；
- 修改 locale 文件后再次 Hover 断言更新。

### 7.3 手工测试清单

在真实主题 `themes/wiki/docs` 上验证：

- [ ] `templates/index.maple.liquid` 第 109 行 `home_help_description.default`
- [ ] `snippets/index/maple/_home_content.liquid` 内 `| t` key
- [ ] `config/settings_schema.json` 内 `t:schema`（v0.2）
- [ ] 删除某 key 后显示 `(missing)`
- [ ] 工作区根为 `baklib` monorepo 子文件夹时仍能解析

---

## 8. 发布与分发

### 8.1 本地 VSIX

```bash
npm run package   # vsce package
```

团队成员：**Extensions → ⋯ → Install from VSIX**。

### 8.2 Marketplace（可选）

- Publisher ID 需注册；
- `package.json` 中 `publisher`、`repository`、`icon`（128×128 PNG）；
- README 英文摘要 + 中文详细说明可放 `README.zh-CN.md`。

### 8.3 版本号

语义化版本：`MAJOR.MINOR.PATCH`，与 `package.json` version 同步。

---

## 9. 里程碑与工时估算

| 阶段 | 交付物 | 预估 |
|------|--------|------|
| M0 | 本规格文档 + 仓库骨架 | ✅ |
| M1 | MVP Hover（schema + \| t）| 1–2 天 |
| M2 | 配置项、语言排序、错误提示完善 | 0.5 天 |
| M3 | 单元测试 + mini fixture | 1 天 |
| M4 | 相对 key、settings_schema.json | 1–2 天 |
| M5 | Completion + Go to Definition | 2–3 天 |
| M6 | Marketplace 发布 | 0.5 天 |

---

## 10. 风险与对策

| 风险 | 对策 |
|------|------|
| Cursor 未注册 `liquid` 语言 ID | `package.json` 增加 `onStartupFinished`；文档说明安装 Liquid 扩展或 `files.associations` |
| monorepo 多主题多个 `locales/` | 取离当前文件最近的主题根；v2 支持 `baklibThemeI18nHover.themeRoots` 映射 |
| schema JSON 嵌套深、路径错误 | Hover 显示完整 dot path；missing 时提示检查是否已 `extract-keys` |
| 与 Shopify 扩展重复 Hover | 仅当光标落在 `t:schema` 或 `\| t` 匹配范围内时返回 Hover，减少冲突 |

---

## 11. 参考链接

- [VS Code Extension API — HoverProvider](https://code.visualstudio.com/api/references/vscode-api#HoverProvider)
- [VS Code Extension Guides](https://code.visualstudio.com/api/get-started/your-first-extension)
- [vsce 打包工具](https://github.com/microsoft/vscode-vsce)
- Baklib 主题 i18n：[baklib-theme-dev skill i18n-workflow](https://github.com/breezes1/baklib-theme-i18n-cli)
- 现有类似扩展：[Shopify Schema Helper](https://marketplace.visualstudio.com/items?itemName=LuizVenturote.shopify-schema-helper)

---

## 12. 附录：真实 key 解析示例

**源码**（`templates/index.maple.liquid`）：

```json
"label": "t:schema.templates.index.maple.settings.home_help_description.label"
```

**解析**：

- bucket = `schema`
- dotPath = `templates.index.maple.settings.home_help_description.label`
- 读取 `locales/zh-CN.schema.json` → `templates.index.maple.settings.home_help_description.label` → `"底部求助说明"`

**源码**（Liquid）：

```liquid
{{ "snippets.header.ask_ai" | t }}
```

**解析**：

- bucket = `page`
- dotPath = `snippets.header.ask_ai`
- 读取 `locales/zh-CN.json` → `snippets.header.ask_ai` → `"问 AI"`

---

*文档结束。实现细节见 [IMPLEMENTATION.md](./IMPLEMENTATION.md)，本地开发见 [DEVELOPMENT.md](./DEVELOPMENT.md)。*
