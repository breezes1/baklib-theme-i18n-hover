/**
 * 运行: node --test test/settingsSchema.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  parseThemeLanguages,
  readThemeLanguages,
  hasSettingsSchema,
} = require('../out/settingsSchema.js');

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/mini-theme'
);

test('parseThemeLanguages: theme_info 块顺序', () => {
  const schema = [
    {
      name: 'theme_info',
      theme_languages: [
        { name: '中文简体', value: 'zh-CN' },
        { name: 'English', value: 'en' },
      ],
    },
  ];
  assert.deepEqual(parseThemeLanguages(schema), ['zh-CN', 'en']);
});

test('parseThemeLanguages: 无 theme_languages 返回空', () => {
  assert.deepEqual(parseThemeLanguages([{ name: 'theme_info' }]), []);
});

test('readThemeLanguages: mini-theme fixture', () => {
  assert.deepEqual(readThemeLanguages(fixtureRoot), ['zh-CN', 'en']);
});

test('hasSettingsSchema: mini-theme', () => {
  assert.equal(hasSettingsSchema(fixtureRoot), true);
  assert.equal(hasSettingsSchema('/nonexistent'), false);
});
