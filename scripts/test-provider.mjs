// dsh-pstack プロバイダのオフライン検証。
// dsh の本体レジストリ（@deepseek-ai/dsh-skill）には触れず、モック ctx で
// registerProvider → list() → get() の契約と frontmatter 解析を確認する。
// 実行: node scripts/test-provider.mjs

import { apply, inject, name } from '../lib/index.js';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

assert.equal(name, 'pstack-skills');
assert.deepEqual(inject, ['skills']);

let registered;
const warnings = [];
const ctx = {
  logger: { warn: (m) => warnings.push(m) },
  skills: {
    registerProvider: (create) => {
      registered = create({ signal: new AbortController().signal, invalidate: () => {} });
      return () => {};
    },
  },
};

apply(ctx);
assert.equal(registered.name, 'pstack');

const candidates = await registered.list({});
const names = candidates.map((c) => c.name);

// 1) setup-pstack は非公開、他 57 スキルが揃っている
assert.ok(!names.includes('setup-pstack'), 'setup-pstack は除外');
assert.ok(names.includes('poteto-mode') && names.includes('tdd') && names.includes('unslop'));
const principleCount = names.filter((n) => n.startsWith('principle-')).length;
console.log(`candidates: ${candidates.length} (principle-*: ${principleCount})`);
assert.ok(candidates.length >= 55, '55 件以上');

// 2) 名前が一意で kebab-case、必須フィールドが揃う
assert.equal(new Set(names).size, names.length, '名前の重複なし');
for (const c of candidates) {
  assert.match(c.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(c.description.length > 0);
  assert.equal(c.provider, 'pstack');
  assert.equal(c.source, 'bundled');
  assert.equal(c.rank, 600);
  assert.equal(c.resourceBase.kind, 'directory');
  assert.ok(c.path.endsWith('SKILL.md'));
  assert.equal(typeof c.invocation.modelInvocable, 'boolean');
  assert.equal(typeof c.invocation.userInvocable, 'boolean');
}

// 3) disable-model-invocation: true → modelInvocable: false（ユーザー起動のみ）
const poteto = candidates.find((c) => c.name === 'poteto-mode');
assert.equal(poteto.invocation.modelInvocable, false);
assert.equal(poteto.invocation.userInvocable, true);

// 4) 設定されていない setup-pstack は両方 true のはず（除外済みなのでファイル側で確認）
const setup = candidates.find((c) => !c.invocation.modelInvocable);
assert.ok(setup, '少なくとも1つは modelInvocable=false');

// 5) ブロックスカラ記述（make-bot-ui: description: >-）が文字列として積める
const makeBotUi = candidates.find((c) => c.name === 'make-bot-ui');
assert.ok(makeBotUi, 'make-bot-ui がある');
assert.equal(typeof makeBotUi.description, 'string');
assert.ok(makeBotUi.description.length > 20, 'ブロックスカラ description が文字列');
assert.ok(!makeBotUi.description.includes('\n---'), 'frontmatter が本体に混入しない');

// 6) 引用符・エスケープ付き description（automate-me: 内部に \" を持つ）
const automate = candidates.find((c) => c.name === 'automate-me');
assert.ok(automate, 'automate-me がある');
assert.equal(typeof automate.description, 'string');
assert.ok(automate.description.includes('automate me'), 'エスケープ付き引用符が解釈されている');

// 7) get() が本文を返す（frontmatter 除去済み）
const def = await registered.get(poteto, {});
assert.ok(def.content.startsWith('# Poteto mode'), '本文の先頭');
assert.ok(!def.content.includes('disable-model-invocation'), 'frontmatter は除去');
assert.equal(def.name, 'poteto-mode');
assert.equal(def.provider, 'pstack');
assert.ok(def.path.endsWith('poteto-mode/SKILL.md'));

// 8) 全候補の get が成功し、frontmatter が混入していない
for (const c of candidates) {
  const d = await registered.get(c, {});
  assert.ok(d && typeof d.content === 'string' && d.content.length > 0, `${c.name}: get`);
  assert.ok(!d.content.startsWith('---'), `${c.name}: frontmatter 混入なし`);
}

// 9) 存在しない locator は undefined
assert.equal(await registered.get({ ...poteto, locator: fileURLToPath(new URL('./nope/SKILL.md', import.meta.url)) }, {}), undefined);

// 10) config.modelInvocable の上書き（既定は上流設計どおり 0 本）
{
  const load = async (modelInvocable) => {
    const warns = [];
    let provider;
    await apply(
      { skills: { registerProvider: (fn) => { provider = fn({}); } }, logger: { warn: (m) => warns.push(m) } },
      { modelInvocable },
    );
    return { list: await provider.list({}), warns };
  };
  const on = (list) => list.filter((c) => c.invocation.modelInvocable).map((c) => c.name);
  assert.deepEqual(on((await load(undefined)).list), [], '既定: モデル発火 0 本');
  assert.equal(on((await load(true)).list).length, candidates.length, 'true: 全スキル発火可能');
  assert.equal(on((await load(['principle-*'])).list).length, 24, '前方一致: principle-* 24 本');
  assert.deepEqual(on((await load(['unslop', 'how'])).list).sort(), ['how', 'unslop'], '完全一致リスト');
  const bad = await load(42);
  assert.equal(on(bad.list).length, 0, '不正値: 発火なし');
  assert.equal(bad.warns.length, 1, '不正値: 警告 1 件');
  // 上書きが get() の definition にも伝播すること
  let provider;
  await apply({ skills: { registerProvider: (fn) => { provider = fn({}); } } }, { modelInvocable: true });
  const def2 = await provider.get((await provider.list({})).find((c) => c.name === 'poteto-mode'), {});
  assert.equal(def2.invocation.modelInvocable, true, 'get() に上書きが伝播');
}

if (warnings.length) {
  console.log('warnings:');
  for (const w of warnings) console.log('  -', w);
}
assert.equal(warnings.length, 0, '警告なし（全 frontmatter が解釈できる）');

console.log('OK: provider contract & frontmatter parsing');
