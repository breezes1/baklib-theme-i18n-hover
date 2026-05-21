# Baklib 主题 i18n 约定（扩展必读）

本文档供 **Baklib Theme i18n Hover** 扩展实现时解析 key、定位 locale 文件使用。与产品侧 `baklib-theme-i18n-cli`、`localization_filter` 保持一致。

> **实现细节以 CLI 为准**：详见 [CLI_ALIGNMENT.md](./CLI_ALIGNMENT.md)，对照仓库 `baklib-theme-i18n-cli/lib/core/extractKeys.js`。

---

## 1. 目录与文件

```
<theme-root>/
  config/
    settings_schema.json    # 主题级设置，含 theme_languages
  templates/
  layout/
  snippets/
  statics/
  locales/
    <lang>.json             # 页面、片段、布局等可见文案
    <lang>.schema.json      # schema / settings_schema 文案
  .baklib_theme_i18nrc.json # 可选：defaultLanguage、翻译 API 等
```

### 1.1 语言文件命名规则

扩展扫描 `locales/` 下符合下列模式的文件：

| 文件名 | 语言 ID | 类型 |
|--------|---------|------|
| `zh-CN.json` | `zh-CN` | page |
| `zh-CN.schema.json` | `zh-CN` | schema |
| `en.json` | `en` | page |
| `en.schema.json` | `en` | schema |

**正则**：

```typescript
/^([a-z]{2}(?:-[A-Z]{2})?)\.(schema\.)?json$/
```

不匹配的文件忽略（如 `README.md`、`.baklib_theme_i18nrc.json` 若在 locales 内也应忽略）。

### 1.2 与 Shopify 的差异

| 项目 | Shopify 常见 | Baklib |
|------|--------------|--------|
| 默认语言文件 | `en.default.json` | `zh-CN.json` 等（由 `theme_languages` 决定） |
| Schema 翻译文件 | `en.default.schema.json` | `<lang>.schema.json` |
| Schema key 前缀 | `t:settings_schema` 等 | **`t:schema.*`（禁止 `t:settings_schema.*`）** |
| 页面 key | `{{ 'key' \| t }}` | 同左 |

扩展**不要**假设 `en.default` 命名；应动态发现所有 `<lang>.json`。

---

## 2. 两类翻译 key

### 2.1 Schema 文案：`t:schema.*`

**出现位置**：

- `{% schema %} ... {% endschema %}` 内 JSON 字符串；
- `config/settings_schema.json` 的 `theme_label`、`label`、`info`、`placeholder`、`default` 等。

**格式**：

```
t:schema.<dot-separated-path>
```

**示例**：

```
t:schema.templates.index.maple.settings.home_help_description.label
t:schema.generic.settings.screen_width.choices.wide
t:schema.theme_label
```

**JSON 查找路径**：去掉前缀 `t:schema.` 后的部分：

```
templates.index.maple.settings.home_help_description.label
```

**读取文件**：`<lang>.schema.json`，按嵌套对象路径取值。

### 2.2 页面文案：`{{ "key" | t }}`

**出现位置**：`templates/`、`layout/`、`snippets/`、`statics/` 等 Liquid 文件。

**格式**：

```liquid
{{ "snippets.header.ask_ai" | t }}
{{ "batch_import.loading" | t: "正在加载目录信息..." }}
{{ "x.hello" | t: "你好 %{name}", name: "张三" }}
```

扩展 MVP 仅解析 **key 字符串**（第一个参数），不解析默认值、插值参数。

**JSON 查找路径**：引号内字符串原样作为 dot path。

**读取文件**：`<lang>.json`。

### 2.3 相对 key（v0.2+）

```liquid
{{ ".ask_ai" | t }}
```

以 `.` 开头时，运行时拼接「当前模板作用域前缀」：

| 文件路径 | 前缀 |
|----------|------|
| `templates/index.liquid` | `templates.index` |
| `snippets/index/maple/_header.liquid` | `snippets.index.maple.header`（具体规则以实现为准） |

MVP 可暂不实现；Hover 时提示「相对 key，请查 i18n-localization-filter 文档」。

---

## 3. JSON 结构示例

### 3.1 `zh-CN.schema.json` 片段

```json
{
  "theme_label": "Docs",
  "templates": {
    "index": {
      "maple": {
        "name": "Maple（Mintlify 文档壳）",
        "settings": {
          "home_help_description": {
            "label": "底部求助说明",
            "default": "如果您发现了文档内容遗漏..."
          }
        }
      }
    }
  }
}
```

Key `t:schema.templates.index.maple.settings.home_help_description.label` → 值 `"底部求助说明"`。

### 3.2 `zh-CN.json` 片段

```json
{
  "snippets": {
    "header": {
      "ask_ai": "问 AI"
    }
  }
}
```

Key `snippets.header.ask_ai` → 值 `"问 AI"`。

---

## 4. 默认值与 extract-keys

- `| t: "默认值"` 中的默认值必须是**源语言**文案；
- Schema **不能**写 `| t: "默认值"`，源语言值必须写在 **默认语言的 `*.schema.json`** 中；
- 扩展只**读取**已有 JSON，不推断默认值。

若 Hover 显示 `(missing)`，常见原因：

1. 未执行 `npx baklib-theme-i18n-cli extract-keys`；
2. dot path 与 JSON 结构不一致（typo）；
3. 只在 `zh-CN.schema.json` 有值，其他语言未翻译。

---

## 5. 扩展解析算法（伪代码）

```
function resolveHover(text, cursorOffset):
  match = findTSchemaAtCursor(text, cursorOffset)
  if match:
    return { bucket: 'schema', path: match.path }

  match = findTFilterAtCursor(text, cursorOffset)
  if match:
    return { bucket: 'page', path: match.path }

  return null

function lookup(themeRoot, bucket, path):
  for each lang in loadLocaleIndex(themeRoot):
    obj = bucket == 'schema' ? lang.schema : lang.page
    value = getByPath(obj, path)
    yield { lang, value: value ?? MISSING }
```

### 5.1 `getByPath` 规则

- 路径按 `.` 分割；
- 仅当最终值为 **string** 时返回（不把 object/array 当译文）；
- 中间节点缺失 → `undefined` → 显示 `(missing)`。

---

## 6. 配置与源语言

`.baklib_theme_i18nrc.json` 示例：

```json
{
  "defaultLanguage": "zh-CN"
}
```

扩展 v0.2 可用 `defaultLanguage`：

- 在 Hover 中**置顶**显示源语言；
- Inlay Hint 默认显示源语言译文。

MVP 可将 `zh-CN` 或按 `languageOrder` 配置排序。

---

## 7. 相关工具链

| 工具 | 用途 |
|------|------|
| [baklib-theme-i18n-cli](https://github.com/breezes1/baklib-theme-i18n-cli) | extract-keys、translate |
| baklib-theme-dev skill | 工作流、Hard Stop 闸门 |
| `localization_filter.rb` | 运行时 `t` 过滤器行为 |

---

*实现代码见 `src/keyResolver.ts`、`src/localeIndex.ts`。*
