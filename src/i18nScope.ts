/**
 * 与 baklib-theme-i18n-cli / ThemeEngine::Liquid::Patchers::Context#i18n_scope 保持一致。
 * @see https://github.com/breezes1/baklib-theme-i18n-cli/blob/main/lib/core/extractKeys.js
 */

function liquidBasenameToScope(basename: string): string {
  return basename.split('+')[0];
}

/** 从 Liquid 模板路径推导 i18n_scope */
export function i18nScopeFromFile(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, '/');

  const layoutMatch = normalized.match(/(?:^|\/)layout\/([^/]+)\.liquid$/);
  if (layoutMatch) {
    return `layout.${liquidBasenameToScope(layoutMatch[1])}`;
  }

  const templateMatch = normalized.match(/(?:^|\/)templates\/([^/]+)\.liquid$/);
  if (templateMatch) {
    return `templates.${liquidBasenameToScope(templateMatch[1])}`;
  }

  const snippetMatch = normalized.match(/(?:^|\/)snippets\/(.+)\.liquid$/);
  if (snippetMatch) {
    const parts = snippetMatch[1].split('/').map((part) => {
      const name = part.replace(/^_/, '');
      return liquidBasenameToScope(name);
    });
    return `snippets.${parts.join('.')}`;
  }

  const sectionMatch = normalized.match(/(?:^|\/)sections\/([^/]+)\.liquid$/);
  if (sectionMatch) {
    return `sections.${liquidBasenameToScope(sectionMatch[1])}`;
  }

  return null;
}

/** 将以 . 开头的相对 key 解析为完整 key */
export function resolveI18nKey(key: string, filePath?: string): string {
  if (!key.startsWith('.')) {
    return key;
  }
  const scope = filePath ? i18nScopeFromFile(filePath) : null;
  if (!scope) {
    return key;
  }
  return `${scope}${key}`;
}
