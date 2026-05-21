import * as path from 'path';
import * as vscode from 'vscode';
import { getByPath } from './jsonPath';
import { getLocaleIndex, LanguageBundle } from './localeIndex';
import { I18nBucket, resolveKeyAtPosition } from './keyResolver';
import { getThemeLanguages } from './settingsSchema';
import { findThemeRoot } from './themeRoot';

function localeFileUri(
  themeRoot: string,
  localesPath: string,
  lang: string,
  bucket: I18nBucket
): vscode.Uri {
  const filename =
    bucket === 'schema' ? `${lang}.schema.json` : `${lang}.json`;
  return vscode.Uri.file(path.join(themeRoot, localesPath, filename));
}

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

    const lines: string[] = [
      `**locale 路径** \`${resolved.path}\``,
      `**CLI key** \`${resolved.fullKey}\``,
      `**文件** ${resolved.bucket === 'schema' ? '`*.schema.json`' : '`*.json`'}`,
      '',
    ];

    const languages = languagesInSchemaOrder(
      index.languages,
      themeLanguages
    ).slice(0, maxLanguages);

    for (const bundle of languages) {
      const obj = resolved.bucket === 'schema' ? bundle.schema : bundle.page;
      const value = getByPath(obj, resolved.path);
      const missing = value === undefined;

      if (showMissingOnly && !missing) {
        continue;
      }

      const fileUri = localeFileUri(
        themeRoot,
        localesPath,
        bundle.lang,
        resolved.bucket
      );
      const langLink = `[**${bundle.lang}**](${fileUri.toString()})`;

      lines.push(
        missing
          ? `- ${langLink}: _(missing)_`
          : `- ${langLink}: ${value}`
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
