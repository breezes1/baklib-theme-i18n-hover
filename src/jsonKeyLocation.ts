export interface TextRange {
  startLine: number;
  startCharacter: number;
  endLine: number;
  endCharacter: number;
}

function offsetToPosition(text: string, offset: number): { line: number; character: number } {
  const before = text.slice(0, offset);
  const lines = before.split('\n');
  return { line: lines.length - 1, character: lines[lines.length - 1].length };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function valueContentStart(text: string, from: number): number {
  let i = from;
  while (i < text.length && /\s/.test(text[i])) {
    i += 1;
  }
  if (text[i] === '{' || text[i] === '[') {
    return i + 1;
  }
  return i;
}

/**
 * 在 JSON 文本中按 dot path 查找最深可匹配 key 的位置（用于滚动定位）。
 */
export function findJsonKeyRangeInText(
  text: string,
  dotPath: string
): TextRange | undefined {
  const segments = dotPath.split('.').filter(Boolean);
  if (!segments.length) {
    return undefined;
  }

  let searchFrom = 0;
  let lastKeyStart = -1;
  let lastKeyEnd = -1;
  let matched = 0;

  for (const segment of segments) {
    const pattern = new RegExp(`"${escapeRegExp(segment)}"\\s*:`, 'g');
    pattern.lastIndex = searchFrom;
    const match = pattern.exec(text);
    if (!match) {
      break;
    }

    matched += 1;
    lastKeyStart = match.index;
    lastKeyEnd = match.index + match[0].length;
    searchFrom = valueContentStart(text, lastKeyEnd);
  }

  if (lastKeyStart < 0) {
    return undefined;
  }

  const start = offsetToPosition(text, lastKeyStart);
  const end = offsetToPosition(text, lastKeyEnd);
  return {
    startLine: start.line,
    startCharacter: start.character,
    endLine: end.line,
    endCharacter: end.character,
    // matched < segments.length 表示定位到最近存在的父级 key
  };
}

export function findJsonKeyRangeInTextFullMatch(
  text: string,
  dotPath: string
): boolean {
  const segments = dotPath.split('.').filter(Boolean);
  if (!segments.length) {
    return false;
  }

  let searchFrom = 0;
  for (const segment of segments) {
    const pattern = new RegExp(`"${escapeRegExp(segment)}"\\s*:`, 'g');
    pattern.lastIndex = searchFrom;
    const match = pattern.exec(text);
    if (!match) {
      return false;
    }
    searchFrom = valueContentStart(text, match.index + match[0].length);
  }
  return true;
}
