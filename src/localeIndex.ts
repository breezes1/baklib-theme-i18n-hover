import * as fs from 'fs';
import * as path from 'path';

const LOCALE_FILE = /^([a-z]{2}(?:-[A-Z]{2})?)\.(schema\.)?json$/;

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

let cache: { themeRoot: string; index: LocaleIndex } | undefined;

export function parseLocaleFilename(
  filename: string
): { lang: string; bucket: 'page' | 'schema' } | null {
  const match = filename.match(LOCALE_FILE);
  if (!match) {
    return null;
  }
  return { lang: match[1], bucket: match[2] ? 'schema' : 'page' };
}

function latestMtime(dir: string): number {
  if (!fs.existsSync(dir)) {
    return 0;
  }
  let latest = 0;
  for (const file of fs.readdirSync(dir)) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.mtimeMs > latest) {
      latest = stat.mtimeMs;
    }
  }
  return latest;
}

export function buildLocaleIndex(themeRoot: string, localesPath = 'locales'): LocaleIndex {
  const dir = path.join(themeRoot, localesPath);
  const map = new Map<string, LanguageBundle>();

  if (!fs.existsSync(dir)) {
    return { themeRoot, languages: [], loadedAt: Date.now() };
  }

  for (const file of fs.readdirSync(dir)) {
    const parsed = parseLocaleFilename(file);
    if (!parsed) {
      continue;
    }

    const filePath = path.join(dir, file);
    let content: Record<string, unknown> = {};
    try {
      content = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
    } catch {
      content = {};
    }

    const bundle = map.get(parsed.lang) ?? {
      lang: parsed.lang,
      page: {},
      schema: {},
    };

    if (parsed.bucket === 'schema') {
      bundle.schema = content;
    } else {
      bundle.page = content;
    }
    map.set(parsed.lang, bundle);
  }

  return {
    themeRoot,
    languages: [...map.values()].sort((a, b) => a.lang.localeCompare(b.lang)),
    loadedAt: Date.now(),
  };
}

export function clearLocaleIndexCache(): void {
  cache = undefined;
}

export function getLocaleIndex(themeRoot: string, localesPath = 'locales'): LocaleIndex {
  const localesDir = path.join(themeRoot, localesPath);
  const mtime = latestMtime(localesDir);

  if (cache?.themeRoot === themeRoot && cache.index.loadedAt >= mtime) {
    return cache.index;
  }

  const index = buildLocaleIndex(themeRoot, localesPath);
  cache = { themeRoot, index };
  return index;
}
