import * as fs from 'fs';
import * as path from 'path';

export const SETTINGS_SCHEMA_REL = 'config/settings_schema.json';

interface ThemeLanguageEntry {
  value?: string;
}

interface ThemeInfoBlock {
  name?: string;
  theme_languages?: ThemeLanguageEntry[];
}

let cache: { themeRoot: string; languages: string[]; mtime: number } | undefined;

function readMtime(filePath: string): number {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

export function parseThemeLanguages(schemaContent: unknown): string[] {
  const themeInfo = Array.isArray(schemaContent)
    ? (schemaContent as ThemeInfoBlock[]).find((item) => item.name === 'theme_info')
    : (schemaContent as ThemeInfoBlock | null);

  if (!themeInfo?.theme_languages?.length) {
    return [];
  }

  return themeInfo.theme_languages
    .map((entry) => entry.value?.trim())
    .filter((value): value is string => Boolean(value));
}

export function readThemeLanguages(themeRoot: string): string[] {
  const schemaPath = path.join(themeRoot, SETTINGS_SCHEMA_REL);
  if (!fs.existsSync(schemaPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(schemaPath, 'utf8');
    return parseThemeLanguages(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function hasSettingsSchema(themeRoot: string): boolean {
  return fs.existsSync(path.join(themeRoot, SETTINGS_SCHEMA_REL));
}

export function clearSettingsSchemaCache(): void {
  cache = undefined;
}

export function getThemeLanguages(themeRoot: string): string[] {
  const schemaPath = path.join(themeRoot, SETTINGS_SCHEMA_REL);
  const mtime = readMtime(schemaPath);

  if (cache?.themeRoot === themeRoot && cache.mtime >= mtime) {
    return cache.languages;
  }

  const languages = readThemeLanguages(themeRoot);
  cache = { themeRoot, languages, mtime };
  return languages;
}
