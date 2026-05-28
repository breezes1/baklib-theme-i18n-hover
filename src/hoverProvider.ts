import * as vscode from 'vscode';
import { getByPath } from './jsonPath';
import { getLocaleIndex, LanguageBundle } from './localeIndex';
import { resolveKeyAtPosition } from './keyResolver';
import { buildLocaleFileMarkdownLink } from './localePaths';
import { getThemeLanguages } from './settingsSchema';
import { findThemeRoot } from './themeRoot';

function languagesInSchemaOrder(
  bundles: LanguageBundle[],
  order: string[]
): LanguageBundle[] {
  const byLang = new Map(bundles.map((bundle) => [bundle.lang, bundle]));
  return order.map(
    (lang) => byLang.get(lang) ?? { lang, page: {}, schema: {} }
  );
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
      return undefined;
    }

    const themeLanguages = getThemeLanguages(themeRoot);
    if (!themeLanguages.length) {
      return undefined;
    }

    const localesPath = config.get<string>('localesPath', 'locales');
    const index = getLocaleIndex(themeRoot, localesPath);
    const showMissingOnly = config.get<boolean>('showMissingOnly', false);
    const maxLanguages = config.get<number>('maxLanguages', 20);

    const markdown = new vscode.MarkdownString();
    // file:// 链接需受信任；译文用 appendText 转义，避免注入
    markdown.isTrusted = true;
    markdown.supportHtml = false;

    markdown.appendMarkdown(
      [
        `**locale 路径** \`${resolved.path}\``,
        `**CLI key** \`${resolved.fullKey}\``,
        `**文件** ${resolved.bucket === 'schema' ? '`*.schema.json`' : '`*.json`'}`,
        '',
      ].join('\n')
    );

    const languages = languagesInSchemaOrder(
      index.languages,
      themeLanguages
    ).slice(0, maxLanguages);

    let languageLines = 0;
    for (const bundle of languages) {
      const obj = resolved.bucket === 'schema' ? bundle.schema : bundle.page;
      const value = getByPath(obj, resolved.path);
      const missing = value === undefined;

      if (showMissingOnly && !missing) {
        continue;
      }

      languageLines += 1;
      markdown.appendMarkdown('- ');
      markdown.appendMarkdown(
        buildLocaleFileMarkdownLink({
          themeRoot,
          localesPath,
          lang: bundle.lang,
          bucket: resolved.bucket,
          jsonPath: resolved.path,
        })
      );
      if (missing) {
        markdown.appendMarkdown(': _(missing)_\n');
      } else {
        markdown.appendMarkdown(': ');
        markdown.appendText(String(value));
        markdown.appendMarkdown('\n');
      }
    }

    if (languageLines === 0) {
      markdown.appendMarkdown('_（无匹配语言或均已翻译）_\n');
    }

    return new vscode.Hover(markdown, resolved.range);
  }
}
