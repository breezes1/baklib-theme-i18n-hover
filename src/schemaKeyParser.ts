/**
 * 解析 t: 前缀的 schema / 配置 key，对齐 baklib-theme-i18n-cli extractSchemaTKeys。
 *
 * 源码: "t:schema.templates.index.maple.name"
 * CLI 扁平 key: "schema.templates.index.maple.name"
 * 写入 *.schema.json 嵌套路径: templates.index.maple.name
 */

export type I18nBucket = 'page' | 'schema';

export interface SchemaKeyMatch {
  /** 去掉 t: 后的完整 key（如 schema.templates.index.maple.name） */
  fullKey: string;
  bucket: I18nBucket;
  /** 在对应 JSON 文件中的 dot path */
  jsonPath: string;
  start: number;
  end: number;
}

/** 与 CLI extractSchemaTKeys 一致：value.slice(2)，即 t: 后至引号/空白前的全部字符 */
const T_PREFIX_RE = /t:([^"'\s]+)/g;

export function parseSchemaKey(fullKeyAfterT: string): { bucket: I18nBucket; jsonPath: string } {
  if (fullKeyAfterT.startsWith('schema.')) {
    return {
      bucket: 'schema',
      jsonPath: fullKeyAfterT.slice('schema.'.length),
    };
  }
  return { bucket: 'page', jsonPath: fullKeyAfterT };
}

export function extractSchemaKeyMatchesOnLine(line: string): SchemaKeyMatch[] {
  const results: SchemaKeyMatch[] = [];
  T_PREFIX_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = T_PREFIX_RE.exec(line)) !== null) {
    const fullKey = match[1];
    const { bucket, jsonPath } = parseSchemaKey(fullKey);
    const start = match.index;
    const end = start + match[0].length;
    results.push({ fullKey, bucket, jsonPath, start, end });
  }

  return results;
}
