/**
 * 与 baklib-theme-i18n-cli 测试用例对照（Node 内置 test）
 * 运行: node --test test/parser.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { i18nScopeFromFile, resolveI18nKey } = require('../out/i18nScope.js');
const { parseSchemaKey, extractSchemaKeyMatchesOnLine } = require('../out/schemaKeyParser.js');
const { extractTFilterMatchesOnLine } = require('../out/tFilterParser.js');

test('parseSchemaKey: schema. 前缀进 schema.json', () => {
  assert.deepEqual(parseSchemaKey('schema.templates.sample.name'), {
    bucket: 'schema',
    jsonPath: 'templates.sample.name',
  });
});

test('parseSchemaKey: 无 schema. 前缀进 page.json', () => {
  assert.deepEqual(parseSchemaKey('baz'), {
    bucket: 'page',
    jsonPath: 'baz',
  });
});

test('resolveI18nKey: 相对 key 与 CLI 一致', () => {
  assert.equal(
    resolveI18nKey('.hello', 'templates/index.liquid'),
    'templates.index.hello'
  );
  assert.equal(
    resolveI18nKey('.greeting', 'snippets/index/maple/_sample_snippet.liquid'),
    'snippets.index.maple.sample_snippet.greeting'
  );
});

test('extractTFilterMatchesOnLine: | t, 命名参数', () => {
  const line = `data-x="{{ 'templates.page.llm' | t, url: page.url }}"`;
  const matches = extractTFilterMatchesOnLine(line, 'templates/page.liquid');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].resolvedKey, 'templates.page.llm');
});

test('extractSchemaKeyMatchesOnLine: t:schema', () => {
  const line = '"label": "t:schema.templates.sample.settings.title.label"';
  const matches = extractSchemaKeyMatchesOnLine(line);
  assert.equal(matches[0].jsonPath, 'templates.sample.settings.title.label');
  assert.equal(matches[0].bucket, 'schema');
});

/** 与 CLI extractTFilter.test.js / extractKeys.test.js 对照 */
test('extractTFilterMatchesOnLine: CLI extractTKeys 用例集', () => {
  const content = `
    {{ "hello" | t }}
    {% 'welcome' | t: 123.2 %}
    {{ 'b' | t: 'x' }}
    {% assign empty_title = 'generic.empty.title' | t: '没有找到相关内容' %}
    {{ 'templates.page.llm_prompt_template' | t, url: page.markdown_url }}
  `;
  const expected = [
    'hello',
    'welcome',
    'b',
    'generic.empty.title',
    'templates.page.llm_prompt_template',
  ];
  const keys = new Set();
  for (const line of content.split('\n')) {
    for (const m of extractTFilterMatchesOnLine(line)) {
      keys.add(m.resolvedKey);
    }
  }
  for (const k of expected) {
    assert.ok(keys.has(k), `missing key: ${k}`);
  }
});

test('extractTFilterMatchesOnLine: 相对 key snippets/_header', () => {
  const matches = extractTFilterMatchesOnLine(
    `{{ '.hello' | t }}`,
    'snippets/_header.liquid'
  );
  assert.equal(matches[0].resolvedKey, 'snippets.header.hello');
});

test('extractSchemaKeyMatchesOnLine: key 含连字符与 CLI 一致', () => {
  const line = '"value": "t:schema.foo-bar"';
  const matches = extractSchemaKeyMatchesOnLine(line);
  assert.equal(matches[0].fullKey, 'schema.foo-bar');
  assert.equal(matches[0].jsonPath, 'foo-bar');
  assert.equal(matches[0].bucket, 'schema');
});
