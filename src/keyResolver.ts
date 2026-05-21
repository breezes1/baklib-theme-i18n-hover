import * as vscode from 'vscode';
import { extractSchemaKeyMatchesOnLine } from './schemaKeyParser';
import { extractTFilterMatchesOnLine } from './tFilterParser';

export type I18nBucket = 'page' | 'schema';

export interface ResolvedKey {
  bucket: I18nBucket;
  /** 在 locale JSON 中的 dot path */
  path: string;
  /** CLI 风格的完整 key（schema.* 或普通 key） */
  fullKey: string;
  raw: string;
  range: vscode.Range;
}

export function resolveKeyAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): ResolvedKey | undefined {
  const line = document.lineAt(position.line).text;
  const offset = position.character;
  const filePath = document.uri.fsPath;

  for (const match of extractSchemaKeyMatchesOnLine(line)) {
    if (offset >= match.start && offset <= match.end) {
      return {
        bucket: match.bucket,
        path: match.jsonPath,
        fullKey: match.fullKey,
        raw: `t:${match.fullKey}`,
        range: new vscode.Range(position.line, match.start, position.line, match.end),
      };
    }
  }

  for (const match of extractTFilterMatchesOnLine(line, filePath)) {
    if (offset >= match.keyStart && offset <= match.keyEnd) {
      const bucket: I18nBucket = match.resolvedKey.startsWith('schema.')
        ? 'schema'
        : 'page';
      const path = bucket === 'schema'
        ? match.resolvedKey.slice('schema.'.length)
        : match.resolvedKey;

      return {
        bucket,
        path,
        fullKey: match.resolvedKey,
        raw: match.rawKey,
        range: new vscode.Range(
          position.line,
          match.keyStart,
          position.line,
          match.keyEnd
        ),
      };
    }
  }

  return undefined;
}
