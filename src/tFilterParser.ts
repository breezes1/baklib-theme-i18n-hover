/**
 * 从 Liquid 片段提取 t filter key，逻辑对齐 baklib-theme-i18n-cli extractTKeys。
 */

import { resolveI18nKey } from './i18nScope';

function extractLastStringLiteral(segment: string): string | null {
  const matches = [...segment.matchAll(/(['"])([^'"\\]*)\1/g)];
  if (!matches.length) {
    return null;
  }
  return matches[matches.length - 1][2];
}

function findKeyRangeInInner(
  inner: string,
  rawKey: string
): { keyStart: number; keyEnd: number } | null {
  let last: { keyStart: number; keyEnd: number } | null = null;

  for (const quote of ["'", '"'] as const) {
    const needle = `${quote}${rawKey}${quote}`;
    let idx = inner.indexOf(needle);
    while (idx !== -1) {
      last = { keyStart: idx + 1, keyEnd: idx + 1 + rawKey.length };
      idx = inner.indexOf(needle, idx + 1);
    }
  }

  return last;
}

export interface TFilterMatch {
  rawKey: string;
  resolvedKey: string;
  keyStart: number;
  keyEnd: number;
}

/**
 * 从单个 {{ }} 或 {% %} 内部文本提取 t filter 的 key 位置。
 */
export function extractTFilterMatchesFromInner(
  inner: string,
  innerStartInLine: number,
  filePath?: string
): TFilterMatch[] {
  const results: TFilterMatch[] = [];
  if (!inner.includes('|')) {
    return results;
  }

  const parts = inner.split('|').map((p) => p.trim());
  let lastItem = '';

  for (const str of parts) {
    if (/^t(?=\s|:|,|$)/.test(str)) {
      const rawKey = extractLastStringLiteral(lastItem);
      if (rawKey) {
        const range = findKeyRangeInInner(inner, rawKey);
        if (range) {
          results.push({
            rawKey,
            resolvedKey: resolveI18nKey(rawKey, filePath),
            keyStart: innerStartInLine + range.keyStart,
            keyEnd: innerStartInLine + range.keyEnd,
          });
        }
      }
      lastItem = '';
    } else {
      lastItem = str;
    }
  }

  return results;
}

const LIQUID_TAG_RE = /\{\{\s*([\s\S]*?)\s*\}\}|\{\%-?\s*([\s\S]*?)\s*-?%\}/g;

/** 从一行文本中提取所有 t filter key 的列位置。 */
export function extractTFilterMatchesOnLine(
  line: string,
  filePath?: string
): TFilterMatch[] {
  const results: TFilterMatch[] = [];
  LIQUID_TAG_RE.lastIndex = 0;
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = LIQUID_TAG_RE.exec(line)) !== null) {
    const inner = tagMatch[1] !== undefined ? tagMatch[1] : tagMatch[2];
    const innerStart = tagMatch.index + tagMatch[0].indexOf(inner);
    results.push(...extractTFilterMatchesFromInner(inner, innerStart, filePath));
  }

  return results;
}
