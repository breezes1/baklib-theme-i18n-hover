# 实现指南

## 0. 与 CLI 对齐

Key 解析已拆分为与 **baklib-theme-i18n-cli** 对应的模块：

| 模块 | 对齐 CLI 函数 |
|------|----------------|
| `i18nScope.ts` | `i18nScopeFromFile`, `resolveI18nKey` |
| `tFilterParser.ts` | `extractTKeys` |
| `schemaKeyParser.ts` | `extractSchemaTKeys` + `schema.` 前缀分离 |

完整对照表见 [CLI_ALIGNMENT.md](./CLI_ALIGNMENT.md)。

## 1. 核心类型

```typescript
// src/types.ts

export type I18nBucket = 'page' | 'schema';

export interface ResolvedKey {
  bucket: I18nBucket;
  /** dot-separated path inside JSON */
  path: string;
  /** original matched source, e.g. t:schema.foo.bar */
  raw: string;
  range: vscode.Range;
}

export interface LanguageBundle {
  lang: string;
  page: Record<string, unknown>;
  schema: Record<string, unknown>;
}

export interface LocaleIndex {
  themeRoot: string;
  languages: LanguageBundle[];
  loadedAt: number;
}
```

## 2. jsonPath.ts

```typescript
export function getByPath(obj: unknown, dotPath: string): string | undefined {
  if (!obj || !dotPath) return undefined;
  const value = dotPath.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  return typeof value === 'string' ? value : undefined;
}
```

**注意**：若 leaf 为 number/boolean（极少），v1 可 `String(value)` 或标为 unsupported。

## 3. localeIndex.ts

### 3.1 文件名解析

```typescript
const LOCALE_FILE = /^([a-z]{2}(?:-[A-Z]{2})?)\.(schema\.)?json$/;

export function parseLocaleFilename(filename: string): { lang: string; bucket: 'page' | 'schema' } | null {
  const m = filename.match(LOCALE_FILE);
  if (!m) return null;
  return { lang: m[1], bucket: m[2] ? 'schema' : 'page' };
}
```

### 3.2 构建索引

```typescript
export function buildLocaleIndex(themeRoot: string, localesPath = 'locales'): LocaleIndex {
  const dir = path.join(themeRoot, localesPath);
  const map = new Map<string, LanguageBundle>();

  for (const file of fs.readdirSync(dir)) {
    const parsed = parseLocaleFilename(file);
    if (!parsed) continue;
    const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const bundle = map.get(parsed.lang) ?? { lang: parsed.lang, page: {}, schema: {} };
    if (parsed.bucket === 'schema') bundle.schema = content;
    else bundle.page = content;
    map.set(parsed.lang, bundle);
  }

  return {
    themeRoot,
    languages: [...map.values()].sort((a, b) => a.lang.localeCompare(b.lang)),
    loadedAt: Date.now(),
  };
}
```

### 3.3 缓存失效

```typescript
let cache: { root: string; index: LocaleIndex } | undefined;

export function getLocaleIndex(themeRoot: string): LocaleIndex {
  const localesDir = path.join(themeRoot, 'locales');
  const mtime = latestMtime(localesDir);
  if (cache?.root === themeRoot && cache.index.loadedAt >= mtime) {
    return cache.index;
  }
  const index = buildLocaleIndex(themeRoot);
  cache = { root: themeRoot, index };
  return index;
}
```

## 4. themeRoot.ts

```typescript
export function findThemeRoot(startFile: string, configRoot?: string): string | undefined {
  if (configRoot) {
    const abs = path.isAbsolute(configRoot)
      ? configRoot
      : path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '', configRoot);
    if (fs.existsSync(path.join(abs, 'locales'))) return abs;
  }

  let dir = path.dirname(startFile);
  while (dir !== path.dirname(dir)) {
    const locales = path.join(dir, 'locales');
    if (fs.existsSync(locales) && fs.readdirSync(locales).some(f => f.endsWith('.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return undefined;
}
```

## 5. keyResolver.ts

组合 `schemaKeyParser`（`t:schema.*`）与 `tFilterParser`（`| t` + 相对 key）：

```typescript
// 光标在 t:schema.templates... 上 → bucket schema, jsonPath templates...
// 光标在 {{ '.hello' | t }} 的 key 上 → resolveI18nKey → snippets.xxx.hello
```

见 `src/keyResolver.ts`、`src/schemaKeyParser.ts`、`src/tFilterParser.ts`。

## 6. hoverProvider.ts

```typescript
export class BaklibI18nHoverProvider implements vscode.HoverProvider {
  provideHover(document, position, _token): vscode.Hover | undefined {
    const config = vscode.workspace.getConfiguration('baklibThemeI18nHover');
    if (!config.get<boolean>('enabled', true)) return;

    const resolved = resolveKeyAtPosition(document, position);
    if (!resolved) return;

    const themeRoot = findThemeRoot(
      document.uri.fsPath,
      config.get<string>('themeRoot')
    );
    if (!themeRoot) {
      return new vscode.Hover('未找到主题 `locales/` 目录');
    }

    const index = getLocaleIndex(themeRoot);
    const lines: string[] = [
      `**i18n key** \`${resolved.path}\``,
      `**类型** ${resolved.bucket === 'schema' ? 'schema (.schema.json)' : 'page (.json)'}`,
      '',
    ];

    const order = config.get<string[]>('languageOrder', []);
    const langs = sortLanguages(index.languages, order);
    const max = config.get<number>('maxLanguages', 20);

    for (const bundle of langs.slice(0, max)) {
      const obj = resolved.bucket === 'schema' ? bundle.schema : bundle.page;
      const val = getByPath(obj, resolved.path);
      lines.push(val !== undefined ? `- **${bundle.lang}:** ${val}` : `- **${bundle.lang}:** _(missing)_`);
    }

    const md = new vscode.MarkdownString(lines.join('\n'));
    md.isTrusted = true;
    return new vscode.Hover(md, resolved.range);
  }
}
```

## 7. extension.ts

```typescript
export function activate(context: vscode.ExtensionContext) {
  const provider = new BaklibI18nHoverProvider();
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      [{ language: 'liquid' }, { language: 'json' }],
      provider
    )
  );

  const watcher = vscode.workspace.createFileSystemWatcher('**/locales/**/*.json');
  const invalidate = () => { clearLocaleIndexCache(); };
  watcher.onDidChange(invalidate);
  watcher.onDidCreate(invalidate);
  watcher.onDidDelete(invalidate);
  context.subscriptions.push(watcher);
}
```

## 8. 与 Shopify 扩展共存

- 仅在 `resolveKeyAtPosition` 有结果时返回 `Hover`；
- 否则返回 `undefined`，让其他 provider 处理。

## 9. 错误处理

| 场景 | 处理 |
|------|------|
| JSON 语法错误 | Hover 显示 `解析失败: <file>: <message>`，不抛异常 |
| 无 workspace | 使用 `document.uri.fsPath` 向上查找 |
| 空 locales | 提示运行 `extract-keys` |

## 10. 性能

- 典型主题 7 语言 × 2 文件 ≈ 14 个 JSON，合计 < 300KB，全量 parse 可接受；
- `loadedAt` + 目录 mtime 避免重复 IO；
- v2：按 path 单文件增量索引（Map path → lang → string）。
