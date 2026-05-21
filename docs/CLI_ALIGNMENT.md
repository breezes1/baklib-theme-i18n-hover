# 与 baklib-theme-i18n-cli 的对齐说明

Hover 扩展的 key 识别、locale 查找规则，以 **[baklib-theme-i18n-cli](https://github.com/breezes1/baklib-theme-i18n-cli)**（`/Users/mac/projects/tanmer/baklib-theme-i18n-cli`）为**事实来源**。实现代码应对齐 `lib/core/extractKeys.js`，并与 ThemeEngine `localization_filter` / `i18n_scope` 行为一致。

---

## 1. 职责边界

| 工具 | 职责 |
|------|------|
| **baklib-theme-i18n-cli** | 扫描源码 → 提取 key → 写入/合并 `locales/*.json`；可选翻译、`--clean-unused` |
| **baklib-theme-i18n-hover** | 只读：根据光标位置的 key，展示各语言已有译文 |

扩展**不**写入 locale 文件；若 Hover 为 `(missing)`，应提示先运行 `npx baklib-theme-i18n-cli extract-keys`。

---

## 2. 扫描范围（CLI）

`config/default.config.json` / `.baklib_theme_i18nrc.json`：

```json
{
  "paths": {
    "source": ["config", "templates", "layout", "snippets", "statics"],
    "locales": "locales",
    "schema": "config/settings_schema.json"
  }
}
```

| 文件类型 | 提取方式 |
|----------|----------|
| `.liquid` | `extractTKeys` + `extractSchemaTKeys` |
| `.json`（含 `settings_schema.json`） | 递归查找 value 以 `t:` 开头的字符串 |

Hover 扩展在任意已打开文件中解析 key，不限制目录；但 locale 仍从**主题根** `locales/` 读取。

---

## 3. Schema key：`t:...`

### 3.1 提取规则（CLI `extractSchemaTKeys`）

- 匹配 `{% schema %} ... {% endschema %}`，JSON 解析成功后递归遍历**所有字符串 value**；
- 若 `value.startsWith('t:')`，则 `key = value.slice(2)`（去掉 `t:`）。

示例：

| 源码 value | CLI 扁平 key | 写入文件 |
|------------|--------------|----------|
| `t:schema.templates.index.maple.name` | `schema.templates.index.maple.name` | `zh-CN.schema.json` → 嵌套 `templates.index.maple.name` |
| `t:schema.foo` | `schema.foo` | `*.schema.json` |
| `t:baz`（不规范） | `baz` | `*.json`（非 schema 前缀） |

### 3.2 分离规则（CLI `extractKeys`）

```javascript
if (k.startsWith('schema.')) {
  schemaPart[k.replace('schema.', '')] = keys[k];  // → *.schema.json
} else {
  normalPart[k] = keys[k];                         // → *.json
}
```

### 3.3 Hover 扩展映射（`schemaKeyParser.ts`）

| 悬停匹配 | `fullKey`（CLI） | `bucket` | `jsonPath`（locale 内查找） |
|----------|------------------|----------|----------------------------|
| `t:schema.templates.index.maple.settings.home_help_description.label` | `schema.templates.index.maple.settings.home_help_description.label` | `schema` | `templates.index.maple.settings.home_help_description.label` |
| `t:baz` | `baz` | `page` | `baz` |

实现：`parseSchemaKey()` — 若 `fullKey.startsWith('schema.')` 则查 `*.schema.json` 且 path 去掉 `schema.` 前缀。

正则：`/t:([^"'\s]+)/`，与 CLI `value.slice(2)` 等价（引号内 `t:` 后整段为 key，可含连字符等非字母字符）。

**已知差异（Hover 按行解析）**：

- 跨行的 `{{ ... | t }}` / `{% ... %}`：CLI 用 `[\s\S]*?` 可匹配；扩展仅解析**当前行**，跨行标签可能无法悬停（单行写法与 CLI 提取结果一致）。

---

## 4. 页面 key：`| t` filter（CLI `extractTKeys`）

### 4.1 解析流程

1. 用正则匹配所有 `{{ ... }}` 与 `{% ... %}`；
2. 按 `|` 分段，识别 filter 名为 `t`（`/t(?=\s|:|,|$)/`）；
3. 取 **t 前一段**中**最后一个**引号字符串为 raw key；
4. `resolveI18nKey(rawKey, filePath)` 展开相对 key。

### 4.2 相对 key（与 ThemeEngine 一致）

| 文件 | scope |
|------|-------|
| `templates/page.liquid` | `templates.page` |
| `templates/index.maple.liquid` | `templates.index.maple` |
| `layout/theme.liquid` | `layout.theme` |
| `snippets/index/maple/_header.liquid` | `snippets.index.maple.header` |
| `snippets/_header.liquid` | `snippets.header` |

规则（`i18nScopeFromFile`）：

- `layout/`、`templates/`、`sections/`：单层文件名，`+` 后缀截断（`page.style+variant` → `page.style`）；
- `snippets/`：路径各段去掉 `_` 前缀后 join；
- 相对 key：`.hello` → `{scope}.hello`。

扩展实现：`src/i18nScope.ts`（与 CLI 导出函数同逻辑）。

### 4.3 默认值（CLI 写入用，Hover 不展示）

`| t: '默认值'` 由 `parseTFilterDefault` 提取，仅 **extract-keys** 合并进 `mainLanguage` 的 json；Hover 只显示 locale 文件中已有值。

支持的写法（与 CLI 测试一致）：

- `{{ 'key' | t }}`
- `{{ 'key' | t, url: page.url }}`
- `{{ 'key' | t: 'default', url: page.url }}`
- `{{ 'key' | b | t: 'x' }}`（多 filter 链）
- `{% assign x = 'key' | t: '默认' %}`

---

## 5. Locale 文件结构

CLI 用 `setNestedKey` 将扁平 key 转为嵌套 JSON：

```javascript
setNestedKey(obj, 'templates.index.maple.name', value);
// → { templates: { index: { maple: { name: value } } } }
```

Hover 用 `getByPath(obj, 'templates.index.maple.name')` 读取，**必须与 CLI 写入结构一致**。

### 5.1 文件对

| 类型 | 路径 |
|------|------|
| page | `locales/<lang>.json` |
| schema | `locales/<lang>.schema.json` |

### 5.2 主语言与合并（CLI）

- `defaultLanguage`（如 `zh-CN`）来自 `.baklib_theme_i18nrc.json`；
- extract 时先更新主语言，其它语言用 `mergeLocaleObj(..., structureOnly: true)` 补结构；
- Hover 可配置 `languageOrder` 将主语言置顶（v0.2 可读 rc 的 `defaultLanguage`）。

---

## 6. 源码模块对照

| CLI (`extractKeys.js`) | Hover 扩展 |
|------------------------|------------|
| `i18nScopeFromFile` | `src/i18nScope.ts` |
| `resolveI18nKey` | `src/i18nScope.ts` |
| `extractTKeys` | `src/tFilterParser.ts` |
| `extractSchemaTKeys` | `src/schemaKeyParser.ts` |
| `setNestedKey` / 嵌套 JSON | `src/jsonPath.ts` `getByPath` |
| `walk` + `extractKeysFromContent` | 不实现（非 Hover 职责） |

---

## 7. 建议的后续共享方式

为避免双份逻辑漂移，可选：

1. **npm 依赖**：将 `extractTKeys`、`resolveI18nKey` 等从 CLI 包导出，扩展 `import` 使用（需 CLI 包提供 `exports` 字段）；
2. **共享子包**：`@baklib/theme-i18n-core` 供 CLI 与 Hover 共用；
3. **当前方案**：扩展内 TypeScript 移植，变更 CLI 时同步更新并跑对照测试。

---

## 8. 手工对照测试

在主题 `themes/wiki/docs` 上：

```bash
cd themes/wiki/docs
npx baklib-theme-i18n-cli extract-keys
```

然后在 `templates/index.maple.liquid` 悬停：

- `t:schema.templates.index.maple.settings.home_help_description.label` → 应等于 `zh-CN.schema.json` 同路径字符串；
- `{{ "snippets.header.ask_ai" | t }}` → 应等于 `zh-CN.json` 中 `snippets.header.ask_ai`。

相对 key 示例（`snippets/index/maple/_foo.liquid` 内 `{{ '.bar' | t }}`）：

- CLI 提取 key：`snippets.index.maple.foo.bar`
- Hover 应显示相同 path 下的各语言值。

---

## 9. 参考文件

- CLI 核心：`baklib-theme-i18n-cli/lib/core/extractKeys.js`
- CLI 测试：`test/extractTFilter.test.js`、`test/extractKeys.test.js`
- Baklib 运行时：`engines/theme_engine/.../localization_filter.rb`
- 产品文档：baklib-theme-dev `references/i18n-workflow.md`
