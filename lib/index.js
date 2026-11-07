// dsh-pstack — pstack (https://github.com/cursor/plugins/tree/main/pstack) を
// DSH のスキルとして提供するホスト側プラグイン。
//
// 依存: Node 内蔵モジュールのみ。cordis 側のサービスは "skills" を inject する
// （shape は実物 @deepseek-ai/dsh-skill-office と同じ { name, inject, apply }）。
//
// 仕組み:
//   - 同梱の skills/<name>/SKILL.md をスキャンし、YAML フロントマターを解釈して
//     ctx.skills に provider 名 "pstack" のプロバイダとして登録する。
//   - list() はカタログ取得ごとに再スキャンするため、link: インストール時は
//     skill の追加・削除・frontmatter 編集が再起動なしで次カタログに反映される。
//     get() は本文を毎回読み直す（本文だけの編集も即反映）。
//   - resourceBase にスキル自身のディレクトリを渡すので、pstack が本文内で使う
//     `../<name>/SKILL.md` や `playbooks/…` の相対参照はそのまま機能する。

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const name = 'pstack-skills';
const inject = ['skills'];

/** ctx.skills レジストリでの一意なプロバイダ名 */
const PROVIDER_NAME = 'pstack';
/** @deepseek-ai/dsh-skill の BUNDLED_SKILL_RANK と同値（依存回避のためインライン定数） */
const BUNDLED_SKILL_RANK = 600;
/** DSH のスキル名文法（kebab-case） */
const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * 上流には存在するが DSH カタログに出さないスキル。
 * - setup-pstack: ~/.cursor/rules への書き込みや Cursor 固有モデルスラッグを設定する
 *   Cursor 専用セットアップ。DSH では誤動作を招くため非公開（リポジトリには残す）。
 */
const EXCLUDED = new Set(['setup-pstack']);

// ---------------------------------------------------------------------------
// フロントマター解析（YAML の部分集合。name / description / whenToUse /
// disable-model-invocation / user-invocable が使えれば足りるため依存ゼロで実装）
// ---------------------------------------------------------------------------

const FRONTMATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/;

const TRUTHY = new Set(['true', 'yes', 'on', '1']);
const FALSY = new Set(['false', 'no', 'off', '0']);

/** 厳格な真偽値解釈。想定外の語は例外（= そのスキルを警告付きでスキップ） */
function parseBoolean(key, value, path) {
  const lowered = String(value).trim().toLowerCase();
  if (TRUTHY.has(lowered)) return true;
  if (FALSY.has(lowered)) return false;
  throw new Error(`dsh-pstack: ${path}: frontmatter ${key}: '${value}' は真偽値として不正`);
}

/** 1 スカラ値: ダブル/シングル引用符・フローコレクション・プレーンスカラー */
function parseScalar(raw) {
  if (raw.startsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw.slice(1);
    }
  }
  if (raw.startsWith("'")) {
    const end = raw.lastIndexOf("'");
    if (end > 0) return raw.slice(1, end).replace(/''/g, "'");
    return raw.slice(1);
  }
  if (raw.startsWith('[') || raw.startsWith('{')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

/**
 * フロントマター部分の YAML 解釈。対応するのは:
 *   key: scalar / "quoted" / 'quoted' / [flow] / {flow}
 *   key: | |- > >- (ブロックスカラ、インデント付き)
 * それ以外のキー（icon, color など）と解釈できない行は読み飛ばす。
 */
function parseFrontmatterYaml(text) {
  const lines = text.split(/\r?\n/);
  const out = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '' || /^\s/.test(line) || line.trimStart().startsWith('#')) {
      i += 1;
      continue; // インデント付きの残り行（未対応の入れ子構造）などは無視
    }
    const m = /^([A-Za-z0-9_][A-Za-z0-9_-]*):(.*)$/.exec(line);
    if (!m) {
      i += 1;
      continue;
    }
    const key = m[1];
    const rest = m[2];
    const block = /^\s*([|>])([+-]?)\d*\s*$/.exec(rest);
    if (block) {
      const [_, style, chomp] = block;
      const body = [];
      let j = i + 1;
      while (j < lines.length && (lines[j].trim() === '' || /^\s/.test(lines[j]))) {
        body.push(lines[j]);
        j += 1;
      }
      let indent = Infinity;
      for (const l of body) if (l.trim() !== '') indent = Math.min(indent, /^\s*/.exec(l)[0].length);
      if (!Number.isFinite(indent)) indent = 0;
      const stripped = body.map((l) => (l.trim() === '' ? '' : l.slice(indent)));
      while (stripped.length > 0 && stripped[stripped.length - 1] === '') stripped.pop();
      let value;
      if (style === '|') {
        value = stripped.join('\n');
        if (chomp !== '-') value += '\n';
      } else {
        value = stripped.reduce((acc, l) => {
          if (l === '') return acc + '\n';
          if (acc === '') return l;
          return acc.endsWith('\n') ? acc + l : `${acc} ${l}`;
        }, '');
        if (chomp !== '-') value += '\n';
      }
      out[key] = value;
      i = j;
      continue;
    }
    out[key] = parseScalar(rest.trim());
    i += 1;
  }
  return out;
}

/** SKILL.md 全文から { metadata, content } を取り出す。不正なら例外 */
function parseSkillFile(raw, path) {
  const fm = FRONTMATTER_RE.exec(raw);
  if (!fm) throw new Error(`dsh-pstack: ${path}: YAML フロントマターがありません`);
  const metadata = parseFrontmatterYaml(fm[1]);
  const content = raw.slice(fm[0].length).trim();

  const skillName = typeof metadata.name === 'string' ? metadata.name.trim() : '';
  if (!SKILL_NAME_RE.test(skillName)) {
    throw new Error(`dsh-pstack: ${path}: name '${metadata.name ?? ''}' が kebab-case として不正`);
  }
  if (typeof metadata.description !== 'string' || metadata.description.trim() === '') {
    throw new Error(`dsh-pstack: ${path}: description がありません`);
  }

  const modelInvocable =
    metadata['disable-model-invocation'] === undefined
      ? true
      : !parseBoolean('disable-model-invocation', metadata['disable-model-invocation'], path);
  const userInvocable =
    metadata['user-invocable'] === undefined
      ? true
      : parseBoolean('user-invocable', metadata['user-invocable'], path);

  return {
    name: skillName,
    description: metadata.description.trim(),
    whenToUse: typeof metadata.whenToUse === 'string' ? metadata.whenToUse.trim() : undefined,
    invocation: { modelInvocable, userInvocable },
    content,
  };
}

// ---------------------------------------------------------------------------
// プロバイダ本体
// ---------------------------------------------------------------------------

/** skills ルートを走査して候補（SkillCandidate[]）を作る。壊れたエントリは警告付きで無視 */
async function discover(root, warn) {
  const candidates = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    warn(`skills ルート ${root} を読み込めませんでした: ${error.message}`);
    return candidates;
  }
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue; // flat .md には対応しない
    if (EXCLUDED.has(entry.name)) continue;
    const directory = join(root, entry.name);
    const path = join(directory, 'SKILL.md');
    let raw;
    try {
      raw = await readFile(path, 'utf8');
    } catch {
      continue; // SKILL.md のないディレクトリは無視
    }
    try {
      const parsed = parseSkillFile(raw, path);
      if (candidates.some((c) => c.name === parsed.name)) {
        warn(`${path}: name '${parsed.name}' は先のスキルと重複。スキップ`);
        continue;
      }
      candidates.push({
        name: parsed.name,
        description: parsed.description,
        whenToUse: parsed.whenToUse,
        invocation: parsed.invocation,
        source: 'bundled',
        provider: PROVIDER_NAME,
        resourceBase: { kind: 'directory', path: directory },
        rank: BUNDLED_SKILL_RANK,
        path,
        locator: path,
      });
    } catch (error) {
      warn(error.message);
    }
  }
  return candidates;
}

/**
 * @param ctx - Cordis コンテキスト（"skills" サービスを inject して受ける）
 */
function apply(ctx) {
  const root = fileURLToPath(new URL('../skills/', import.meta.url));
  const warn = (message) => (ctx.logger ? ctx.logger.warn(message) : console.warn(message));

  return ctx.skills.registerProvider(() => ({
    name: PROVIDER_NAME,
    list: () => discover(root, warn),
    async get(candidate) {
      let raw;
      try {
        raw = await readFile(candidate.locator, 'utf8');
      } catch {
        return undefined; // 消滅済み
      }
      try {
        const parsed = parseSkillFile(raw, candidate.locator);
        const { rank, locator, ...definition } = candidate;
        return { ...definition, content: parsed.content };
      } catch (error) {
        warn(error.message);
        return undefined;
      }
    },
  }));
}

export { apply, inject, name };
