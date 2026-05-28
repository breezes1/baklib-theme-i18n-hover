import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { findJsonKeyRangeInText } from './jsonKeyLocation';
import { I18nBucket } from './keyResolver';
import { resolveAbsoluteThemeRoot } from './themeRoot';

const openLocaleKeyStash = new Map<string, OpenLocaleKeyArgs>();
const STASH_MAX = 128;

export interface OpenLocaleKeyArgs {
  themeRoot: string;
  localesPath: string;
  lang: string;
  bucket: I18nBucket;
  jsonPath: string;
}

export const OPEN_LOCALE_KEY_COMMAND = 'baklibThemeI18nHover.openLocaleKey';

export function localeFileUri(
  themeRoot: string,
  localesPath: string,
  lang: string,
  bucket: I18nBucket
): vscode.Uri {
  const filename =
    bucket === 'schema' ? `${lang}.schema.json` : `${lang}.json`;
  const root = resolveAbsoluteThemeRoot(themeRoot);
  const filePath = path.resolve(root, localesPath || 'locales', filename);
  return vscode.Uri.file(filePath);
}

function stashOpenLocaleKeyArgs(args: OpenLocaleKeyArgs): string {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  openLocaleKeyStash.set(id, args);
  if (openLocaleKeyStash.size > STASH_MAX) {
    const oldest = openLocaleKeyStash.keys().next().value;
    if (oldest) {
      openLocaleKeyStash.delete(oldest);
    }
  }
  return id;
}

function resolveStashedArgs(id: string): OpenLocaleKeyArgs | undefined {
  return openLocaleKeyStash.get(id);
}

function finalizeOpenLocaleKeyArgs(args: OpenLocaleKeyArgs): OpenLocaleKeyArgs {
  return {
    themeRoot: resolveAbsoluteThemeRoot(args.themeRoot),
    localesPath: args.localesPath?.trim() || 'locales',
    lang: args.lang,
    bucket: args.bucket === 'schema' ? 'schema' : 'page',
    jsonPath: args.jsonPath,
  };
}

export function normalizeOpenLocaleKeyArgs(raw: unknown): OpenLocaleKeyArgs | undefined {
  let value: unknown = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  if (Array.isArray(value)) {
    value = value[0];
  }
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const args = value as OpenLocaleKeyArgs & { id?: string };
  if (args.id && !args.themeRoot) {
    const stashed = resolveStashedArgs(args.id);
    if (!stashed) {
      return undefined;
    }
    return finalizeOpenLocaleKeyArgs(stashed);
  }

  if (!args.themeRoot || !args.lang || !args.jsonPath) {
    return undefined;
  }

  return finalizeOpenLocaleKeyArgs(args);
}

/** 悬停里用 file:// 链接，避免长时间悬停时露出冗长的 command: URI */
export function buildLocaleFileMarkdownLink(args: OpenLocaleKeyArgs): string {
  const resolved = finalizeOpenLocaleKeyArgs(args);
  const uri = localeFileUri(
    resolved.themeRoot,
    resolved.localesPath,
    resolved.lang,
    resolved.bucket
  );
  let href = uri.toString(true);

  try {
    const text = fs.readFileSync(uri.fsPath, 'utf8');
    const range = findJsonKeyRangeInText(text, resolved.jsonPath);
    if (range) {
      href = `${href}#L${range.startLine + 1}`;
    }
  } catch {
    // 无法预读时仍返回无行号的文件链接
  }

  const title = `打开 ${resolved.lang} 语言文件`.replace(/"/g, '\\"');
  return `[**${resolved.lang}**](${href} "${title}")`;
}

export function buildOpenLocaleKeyCommandUri(args: OpenLocaleKeyArgs): string {
  const id = stashOpenLocaleKeyArgs(finalizeOpenLocaleKeyArgs(args));
  return vscode.Uri.parse(
    `command:${OPEN_LOCALE_KEY_COMMAND}?${encodeURIComponent(JSON.stringify([{ id }]))}`
  ).toString();
}
