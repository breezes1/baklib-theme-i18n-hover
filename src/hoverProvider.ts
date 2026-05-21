import * as vscode from 'vscode';
import { getByPath } from './jsonPath';
import { getLocaleIndex, LanguageBundle } from './localeIndex';
import { resolveKeyAtPosition } from './keyResolver';
import { findThemeRoot } from './themeRoot';

function sortLanguages(
  languages: LanguageBundle[],
  order: string[]
): LanguageBundle[] {
  if (!order.length) {
    return languages;
  }

  const rank = new Map(order.map((lang, index) => [lang, index]));
  return [...languages].sort((a, b) => {
    const ra = rank.get(a.lang) ?? 999;
    const rb = rank.get(b.lang) ?? 999;
    if (ra !== rb) {
      return ra - rb;
    }
    return a.lang.localeCompare(b.lang);
  });
}

export class BaklibI18nHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Hover | undefined {
    const config = vscode.workspace.getConfiguration('baklibThemeI18nHover');
    if (!config.get<boolean>('enabled', true)) {
      return undefined;
    }

    const resolved = resolveKeyAtPosition(document, position);
    if (!resolved) {
      return undefined;
    }

    const themeRoot = findThemeRoot(
      document.uri.fsPath,
      config.get<string>('themeRoot')
    );
    if (!themeRoot) {
      return new vscode.Hover(
        '未找到主题 `locales/` 目录。请打开含 locales 的主题文件夹，或配置 `baklibThemeI18nHover.themeRoot`。'
      );
    }

    const localesPath = config.get<string>('localesPath', 'locales');
    const index = getLocaleIndex(themeRoot, localesPath);
    const showMissingOnly = config.get<boolean>('showMissingOnly', false);
    const maxLanguages = config.get<number>('maxLanguages', 20);
    const languageOrder = config.get<string[]>('languageOrder', []);

    const lines: string[] = [
      `**locale 路径** \`${resolved.path}\``,
      `**CLI key** \`${resolved.fullKey}\``,
      `**文件** ${resolved.bucket === 'schema' ? '`*.schema.json`' : '`*.json`'}`,
      '',
    ];

    const languages = sortLanguages(index.languages, languageOrder).slice(
      0,
      maxLanguages
    );

    for (const bundle of languages) {
      const obj = resolved.bucket === 'schema' ? bundle.schema : bundle.page;
      const value = getByPath(obj, resolved.path);
      const missing = value === undefined;

      if (showMissingOnly && !missing) {
        continue;
      }

      lines.push(
        missing
          ? `- **${bundle.lang}:** _(missing)_`
          : `- **${bundle.lang}:** ${value}`
      );
    }

    if (lines.length === 2) {
      lines.push('_（无匹配语言或均已翻译）_');
    }

    const markdown = new vscode.MarkdownString(lines.join('\n'));
    markdown.isTrusted = true;
    return new vscode.Hover(markdown, resolved.range);
  }
}
