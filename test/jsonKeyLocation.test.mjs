/**
 * 运行: node --test test/jsonKeyLocation.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  findJsonKeyRangeInText,
  findJsonKeyRangeInTextFullMatch,
} = require('../out/jsonKeyLocation.js');

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/mini-theme'
);

test('findJsonKeyRangeInText: 嵌套 page key', () => {
  const text = fs.readFileSync(
    path.join(fixtureRoot, 'locales/zh-CN.json'),
    'utf8'
  );
  const range = findJsonKeyRangeInText(text, 'sample.title');
  assert.ok(range);
  assert.equal(range.startLine, 2);
  assert.ok(text.slice(text.indexOf('"title"')).startsWith('"title"'));
});

test('findJsonKeyRangeInText: schema 深层 key', () => {
  const text = fs.readFileSync(
    path.join(fixtureRoot, 'locales/zh-CN.schema.json'),
    'utf8'
  );
  const range = findJsonKeyRangeInText(
    text,
    'templates.sample.settings.title.label'
  );
  assert.ok(range);
  assert.equal(findJsonKeyRangeInTextFullMatch(text, 'templates.sample.settings.title.label'), true);
});

test('findJsonKeyRangeInText: missing 叶子定位到父级', () => {
  const text = '{\n  "foo": {\n    "bar": "x"\n  }\n}';
  const range = findJsonKeyRangeInText(text, 'foo.bar.baz');
  assert.ok(range);
  assert.ok(text.slice(range.startCharacter).includes('"bar"') || range.startLine === 2);
});
