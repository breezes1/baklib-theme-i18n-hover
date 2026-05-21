# 配置说明

在 VS Code / Cursor 的 **用户** 或 **工作区** `settings.json` 中配置。

## 配置项一览

| 键 | 类型 | 默认 | 说明 |
|----|------|------|------|
| `baklibThemeI18nHover.enabled` | `boolean` | `true` | 关闭后不再注册 Hover |
| `baklibThemeI18nHover.localesPath` | `string` | `"locales"` | 相对主题根目录的 locale 子路径 |
| `baklibThemeI18nHover.themeRoot` | `string` | `""` | 强制指定主题根（须含 `config/settings_schema.json`）。空则自动向上查找 |
| `baklibThemeI18nHover.languageOrder` | `string[]` | `[]` | **已弃用**。语言顺序由 `settings_schema.json` 中 `theme_languages` 决定 |
| `baklibThemeI18nHover.maxLanguages` | `number` | `20` | 单次 Hover 最多显示语言数 |
| `baklibThemeI18nHover.showMissingOnly` | `boolean` | `false` | 为 `true` 时仅列出缺少译文的语言（调试用） |

## package.json contributes 片段

```json
{
  "contributes": {
    "configuration": {
      "title": "Baklib Theme i18n",
      "properties": {
        "baklibThemeI18nHover.enabled": {
          "type": "boolean",
          "default": true,
          "description": "启用 Baklib 主题 i18n 悬停翻译预览"
        },
        "baklibThemeI18nHover.localesPath": {
          "type": "string",
          "default": "locales",
          "description": "locale 文件目录（相对主题根）"
        },
        "baklibThemeI18nHover.themeRoot": {
          "type": "string",
          "default": "",
          "description": "主题根目录。留空则根据当前文件自动向上查找"
        },
        "baklibThemeI18nHover.languageOrder": {
          "type": "array",
          "items": { "type": "string" },
          "default": [],
          "description": "悬停时语言显示顺序，如 [\"zh-CN\", \"en\"]"
        },
        "baklibThemeI18nHover.maxLanguages": {
          "type": "number",
          "default": 20,
          "minimum": 1,
          "description": "悬停最多显示的语言数量"
        },
        "baklibThemeI18nHover.showMissingOnly": {
          "type": "boolean",
          "default": false,
          "description": "仅显示缺少译文的语言"
        }
      }
    }
  }
}
```

## 使用场景示例

### Monorepo 中打开子主题

工作区根为 `baklib`，实际主题为 `themes/wiki/docs`：

```json
{
  "baklibThemeI18nHover.themeRoot": "themes/wiki/docs"
}
```

或继续依赖自动向上查找（打开 `themes/wiki/docs` 下文件时无需配置）。

### 语言显示顺序

在主题的 `config/settings_schema.json` 中配置 `theme_info.theme_languages`，悬停列表按其中 `value` 的顺序展示，与 baklib-theme-i18n-cli 一致。

### 排查未翻译语言

```json
{
  "baklibThemeI18nHover.showMissingOnly": true
}
```

悬停时仅看到如 `de: _(missing)_` 的语言。

## 读取配置的代码

```typescript
const config = vscode.workspace.getConfiguration('baklibThemeI18nHover');
const enabled = config.get<boolean>('enabled', true);
const themeLanguages = getThemeLanguages(themeRoot);
```

`getConfiguration` 会自动合并用户 / 工作区 / 文件夹级设置。

## 生效条件

扩展仅在当前工作区能解析到含 **`config/settings_schema.json`** 的主题根时提供 Hover；且该文件中 `theme_info.theme_languages` 非空。否则不显示悬停面板（静默不生效）。
