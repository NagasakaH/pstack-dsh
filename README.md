# dsh-pstack

[Cursor 公式プラグイン集 cursor/plugins の pstack](https://github.com/cursor/plugins/tree/main/pstack)
（作者: Lauren Tan、MIT）を DSH (@deepseek-ai/dsh) のスキルとしてそのまま使えるように移植した
DSH バンドルプラグインです。

`poteto-mode` / `tdd` / `how` / `why` / `unslop` / `interrogate` / `swarm` / `arena` と、
`principle-*` 24 本を含む 57 スキルを `ctx.skills` に登録します。ランタイム依存ゼロ
（Node 内蔵モジュールのみ・ビルド不要）です。

> **非公式ポートです。** Cursor（Anysphere）および DeepSeek Harness の公式プロジェクトではありません。
> 上流 pstack は MIT ライセンス（Copyright Lauren Tan、`LICENSE` 参照）で、
> 上流ファイルは無変更で同梱しています。来歴は [UPSTREAM.md](UPSTREAM.md)。

## インストール

```sh
git clone https://github.com/NagasakaH/pstack-dsh.git   # 任意の場所へ
```

```sh
# 開発スタイル（推奨）: クローンしたチェックアウトへ symlink。スキル本文の編集が再起動なしで反映される
dsh plugin --profile web add link:/path/to/pstack-dsh
```

```sh
# スナップショットコピーで入れる場合
dsh plugin --profile web add file:/path/to/pstack-dsh
```

`dsh bundle` は `package.json` の `dsh.bundle.patch` を読み、`cordis.patch.yml` の
Loader 行（`id: pstack-skills`）を起動に挿入します。Web プロファイルはライブリロード
構成なので、通常は起動し直しなしで次のターンからスキルカタログに出ます。
反映が確認できない場合は該当プロセスの再起動だけ行ってください。

他のプロファイルに入れるのも同じです（`--profile tui` など）。

## 使い方

pstack のスキルは上流どおり全 57 本が `disable-model-invocation: true` です。
既定ではモデルの自動発火はせず、ユーザーがスラッシュで明示起動する設計のまま
移植されています（上流 Cursor と同じ挙動）。

- 入力欄に `/poteto-mode`、`/tdd`、`/how …`、`/unslop` のように入力して起動
- 起動されたスキル本文はモデルへの指示として注入される
- 本文内の相対参照（`../<name>/SKILL.md`、`playbooks/…`、`references/…`）は
  DSH の resourceBase（＝スキル自身のディレクトリ絶対パス）経由でそのまま解決され、
  モデルは `read` ツールでリンク先スキル／プレイブックを読み進められる
  （上流が `~/.cursor/plugins` のファイル読みで同一ディレクトリのスキルをたどる設計の代替）

## スキル一覧

57 本の一覧です。説明は上流 frontmatter の英文をそのまま載せています。
Cursor 専用のセットアップスキル `setup-pstack` は同梱しますが、DSH では
スキルとして登録しません（`~/.cursor/rules` への書き込みなど DSH で誤動作する
ため。`skills/` には残っています）。

### ハブ・モード

| スキル | 説明 |
| --- | --- |
| `poteto-mode` | poteto's agent style for concise, detailed responses, deliberate subagents, unslopped prose, simple code, and verified work. Use for poteto, /poteto-mode, or requests to work in this style. |
| `poteto-help` | Guides users through pstack setup, /poteto-mode, and picking the skill, playbook, or principle for a task. Type /poteto-help with a question. |
| `automate-me` | Use for "automate me", "create/update/refresh my -mode skill", "turn/capture my preferences or working style into a skill", or wanting agents to follow how the user works. Drafts or revises a personal -mode skill via create-skill + unslop, optionally pulling fresh evidence from recent transcripts. |
| `figure-it-out` | Design an auditable playbook when no narrower one fits: a large migration, an ambitious multi-part change, or work a human reviews after stepping away. Scales rigor to the task, runs a hypothesis loop, and logs decisions. Use for /figure-it-out or 'figure it out'. |

### 作業の進め方

| スキル | 説明 |
| --- | --- |
| `architect` | Sketch types, signatures, and module structure before code, then stay in the loop while implementation fills in. Use for /architect, 'architect this', 'design this', or non-trivial work where jumping to code would lock in the wrong shape. |
| `arena` | Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it. Use for /arena, 'arena this', 'throw it in the arena', or when one attempt at a non-trivial artifact would lock in the wrong shape. |
| `swarm` | Fan out N parallel workers, drain them, and return one report. Use for /swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration. |
| `interrogate` | Use for "interrogate", "adversarial review", "multi-model review", "challenge this", "stress test this code", "find blind spots", or "tear this apart". Adversaries try to break a change or design, and only findings proven by a run survive. |
| `correct` | Find the mistakes agents keep repeating in this repo and make each one impossible. Try architecture first, then types, then a lint whose error names the fix, then a test, and write docs last. Prove each check fails on a real past mistake. Repeat this each time the operator corrects you. Use for /correct. |
| `tdd` | Use only when the user explicitly asks for TDD, a failing test, or a regression test, OR when the bug has an obvious cheap local test target. Skip when the test path is unclear, expensive, integration-heavy, or not requested. |
| `sharpen` | Make a task deeper, not bigger, then rewrite the prompt. Use for /sharpen. |
| `no-comments` | Spawn Comment Sicko, fix accepted findings, and offer encodings for claimed constraints. |
| `reflect` | Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect. |
| `show-me-your-work` | Keep a reviewable decision trail for long-running or unattended work: a TSV log with one row per decision (what, why, evidence, result). Local by default; commit it when a reviewer needs the trail to trust the result. Use for /show-me-your-work, autonomous or multi-phase runs, or work a human reviews after stepping away. |

### 調査・説明・状況把握

| スキル | 説明 |
| --- | --- |
| `how` | Use for "how does X work", code walkthroughs before changing something, and placement / ownership / layering questions ("where should this live", "which package owns this", "is this the right layer"). Explains subsystem architecture, runtime flow, onboarding mental models. Use why for motivation. |
| `why` | Use for 'why does X work this way', 'why we picked Y', design rationale, regressions, postmortems, or data-backed thresholds. Discovers available MCPs and queries each evidence category (source control, issue tracker, long-form docs, real-time chat, infrastructure observability, error tracking, product analytics warehouse) in parallel, then returns a cited read on decisions and tradeoffs. Use how for runtime behavior. |
| `teach` | Explain a body of work plainly so a person actually understands it. Runs the `how` and `why` skills and weaves what they find into one clear explanation. Use for 'teach me this', 'help me really understand X', 'explain this change or subsystem to me'. |
| `recall` | Reconstruct your recent working context from your own chat history, live state, and the shared record (user reports, prior fixes, incidents), then hand back a tight current-state brief. Use for 'recall my work on X', 'catch me up', 'what have I been working on', 'where did I leave off', before starting or resuming work. |
| `ketchup` | Catch the user up on what changed in this chat since their last message, in plain words and small visuals. List every item waiting on them with what they need to decide it from the reply alone. Use for /ketchup. |
| `ketchup-video` | Catch the user up like /ketchup, with a short subtitled video of slides for what happened and the waiting calls as text under it. Use for /ketchup-video. |
| `bro` | Restate the last message in plain human language, with no jargon. |
| `in-your-own-words` | Restate in your own words what you think the user's goals are and what problem they're trying to solve. Use for /in-your-own-words. |

### 検証

| スキル | 説明 |
| --- | --- |
| `benchmark-checklist` | Vet a perf measurement (limiter, tuning, limits, errors, repeatability, relevance, and whether the work happened) before you report or act on it. Use when you run a benchmark or report a speedup or regression you measured. |
| `blast-radius` | Find what a change could break somewhere else before it ships, beyond the diff, and prove the one fact it's safe because of by running real code instead of writing it up. Use for 'blast radius of X', 'what could this break', or reviewing a small diff you don't trust. |
| `statechart` | Check a TLA+ model of a system that moves between states, such as a product flow, a protocol, or a service, and draw it as a Mermaid statechart. The report gives the shortest path to each state that breaks a rule. Use for /statechart, or to show a bug as a path through states. |
| `create-formal-verification-skill` | Generate a project-local skill that formally verifies the code where a bug costs the most and tests reach the least, in any language, with whichever verification tool fits. Use for /create-formal-verification-skill, "model-check this race", "prove this invariant", or when concurrency, retries, state machines, parsers, or unsafe code need more than tests. |
| `maintain-formal-verification-skill` | Bring a project's formal verification back in line with the code after the code changes: find the commits that touched verified code, update the model, harness, or properties to describe the code as it is now, rerun, and say whether each failure is drift in the verification or a bug in the code. Use for /maintain-formal-verification-skill, "is the model still true to the code", or after merges and refactors that touched verified code without rechecking it. |
| `create-verification-skill` | Generate a project-local verification skill that drives your app the way a user does — any language, framework, or platform. Use for /create-verification-skill, "make a control skill for this repo", or when a project has no scripted way to prove UI/CLI/service behavior. |
| `maintain-verification-skill` | Periodic pass that keeps a project's verification skill and feature map honest: parallel source readers per feature, one live session driving every feature, at most one PR of proven corrections. Use for /maintain-verification-skill or "audit the verify skill". |

### 文章・言語

| スキル | 説明 |
| --- | --- |
| `technical-writing` | Layered technical-writing standard: Diátaxis structure, Google developer style sentences, STE instruction rules, Global English syntax. Use for /technical-writing or when writing or reviewing docs, RFCs, readmes, PR descriptions, or commit messages. |
| `unslop` | Cut AI tells from any writing. |
| `typescript-best-practices` | TypeScript best practices. Use when reading or editing any .ts or .tsx file. |

### その他

| スキル | 説明 |
| --- | --- |
| `make-bot-ui` | Use when building a custom UI (page, dashboard, buttons) that should wake a Grok Bot over a webhook, when the user must provide a webhook sender key, or when exposing that UI on Tailscale. |

### 原則（`principle-*` 24 本）

作業の場面で `poteto-mode` やプレイブックが参照する原則です。単体でもスラッシュで
起動できます。

| スキル | 説明 |
| --- | --- |
| `principle-attack-the-premise` | Apply when two or more fixes that share one premise have failed the same gate. Write the premise down and test it directly before you write another fix that assumes it. |
| `principle-boundary-discipline` | Apply when wiring validation, error handling, or framework adapters. Concentrate guards at system boundaries (CLI, config, network, external APIs); trust internal types and keep business logic in pure functions. |
| `principle-build-the-lever` | Apply to any non-trivial work, not just bulk work: edits, migrations, analyses, checks. Build the tool that does it or proves it (codemod, script, generator, or a skill your subagents follow) instead of working by hand. The tool is the artifact a reviewer can rerun. |
| `principle-encode-lessons-in-structure` | Apply when you catch yourself writing the same instruction a second time, or notice a recurring correction. Encode the rule as a lint, metadata flag, runtime check, or script instead of more text. |
| `principle-exhaust-the-design-space` | Apply when facing a novel UI interaction or architectural decision with no precedent in the codebase. Build 2-3 competing prototypes and compare side by side before committing. |
| `principle-experience-first` | Apply when product, UX, or feature-scope tradeoffs come up. Choose user delight over implementation convenience; ship fewer polished features over more rough ones. |
| `principle-explain-the-number` | Apply before you measure, and before you trust, report, or act on a number you measured: a speedup, a regression, a throughput, a latency, or an eval result. Find what limits it, and rule out that it measured something other than the work you think. |
| `principle-fix-root-causes` | Apply when debugging. Trace each symptom back to the first place the system went wrong and fix it there. A guard is a fix only when the state it handles is legitimate. |
| `principle-foundational-thinking` | Apply before writing logic: choosing core types and data structures, sequencing scaffold-vs-feature work, asking what concurrent actors share. Get the data structures right so downstream code becomes obvious. |
| `principle-guard-the-context-window` | Apply when context is filling up: large outputs, long files, repeated reads, fan-out planning. Route bulk to subagents; keep summaries in the main thread, not raw payloads. |
| `principle-laziness-protocol` | Apply when refactoring, evaluating diff size, or tempted to add abstractions, layers, or signal threading. Bias toward deletion and the smallest change that solves the problem. |
| `principle-make-operations-idempotent` | Apply when designing commands, lifecycle steps, or processing loops that run amid crashes, restarts, and retries. Converge to the same end state regardless of partial prior runs. |
| `principle-migrate-callers-then-delete-legacy-apis` | Apply when introducing a new internal API while old callers still exist. Migrate callers and delete the old API in the same wave instead of preserving compatibility layers. |
| `principle-minimize-reader-load` | Apply when reviewing or shaping code that's hard to trace. Count layers between question and answer, and hidden state in the reader's head; collapse one-caller wrappers and shrink mutable scope. |
| `principle-model-the-domain` | Apply when writing stateful logic, or when code branches a lot or repeats a shape assumption across files. |
| `principle-never-block-on-the-human` | Apply when tempted to ask 'should I do X?' on reversible work. |
| `principle-outcome-oriented-execution` | Apply during planned rewrites and migrations with explicit phase boundaries. Converge on the target architecture; don't preserve smooth intermediate states with throwaway compatibility code. |
| `principle-prove-it-works` | Apply after completing a task, before declaring done. Verify against the real artifact (run the feature, read the actual value, inspect the diff), not a proxy, self-report, or 'it compiles.' |
| `principle-redesign-from-first-principles` | Apply when integrating a new requirement into an existing design. |
| `principle-separate-before-serializing-shared-state` | Apply when concurrent actors might write to the same file, branch, key, or state object. Eliminate the sharing first; serialize structurally only when one shared writer is a real invariant. |
| `principle-sequence-verifiable-units` | Apply to multi-step work (sweeps, migrations, runs of similar edits) and to how you stack commits and PRs. Break work into small units that each end in a verifiable state, check each before the next, and order delivery so the sequence proves itself to a reviewer. |
| `principle-subtract-before-you-add` | Apply when sequencing an addition, refactor, or rewrite. Remove dead code, redundant validators, and stub references first, then build on the simpler base. |
| `principle-test-behavior-not-implementation` | Apply when you write, change, or keep a test. Assert what the code's users can observe, so that the test fails when that behavior breaks and keeps passing when only the internals change. |
| `principle-type-system-discipline` | Apply when designing types, reviewing a function signature, or writing code in any statically-typed language. Make illegal states unrepresentable, brand semantic primitives, parse external data at boundaries, exhaust variants, derive from authoritative schemas. |

## モデル自動発火（オプトイン）

プロファイルの `cordis.patch.yml` に `pstack-skills` の config を次のように足すと、
上流 frontmatter を無視してモデルカタログに出せるようになります。上書きは
provider の list() 段で行うので、上流ファイルは無変更のままです。

```yaml
- id: pstack-skills
  config:
    modelInvocable: true    # 全57本をカタログ公開
    # modelInvocable: ["principle-*", "unslop", "how"]   # 前方一致/完全一致で絞る
```

トークンコストの実測値を次に示します（`dsh-tool-skill` の description 500 字
カット適用後・英語 4 字/トークン目安）。

| 公開範囲 | カタログ常駐（セッションにつき 1 メッセージ） | 発火時（本文） |
| --- | --- | --- |
| 全 57 本 | 13.4k 字 ≒ 3.3k トークン | 平均 ≒ 950 トークン/本（`poteto-mode` 最大 ≒ 5.4k） |
| `principle-*` のみ 24 本 | 5.3k 字 ≒ 1.3k トークン | 平均 ≒ 350 トークン/本 |
| workflow 33 本のみ | 8.1k 字 ≒ 2k トークン | — |

カタログはセッションに 1 本のメッセージとして入り、内容が変わった時だけ
置き換えられます（毎ターン積み増しではありません）。上流が自動発火を止めているのは
「重いワークフローの誤発火防止」なので、`principle-*` や文章系だけ常駐させる
絞り方が実用的です。Web プロファイルはライブリロードなので、config 変更は
再起動なしで次のカタログに反映されます。

## 動作の確認

```sh
node scripts/test-provider.mjs   # プロバイダ契約と frontmatter 解析のオフライン検証
```

インストール後の実機確認は DSH のセッションで「使えるスキルの一覧を見せて」と聞くか、
`/` を入力して補完に `poteto-mode` 等が出れば OK です。

## ディレクトリ構成

| パス | 内容 |
| --- | --- |
| `lib/index.js` | スキルプロバイダ本体（`ctx.skills.registerProvider`） |
| `skills/` | 上流 `pstack/skills` の無変更コピー（58 ディレクトリ） |
| `agents/` | 上流のサブエージェント定義（参考資料。DSH への移植方法は PORTING.md） |
| `docs/upstream/` | 上流のガイド（`docs/guide`）等 |
| `automations/` | 上流の Benny 自動化テンプレ（参考資料） |
| `scripts/sync-upstream.sh` | 上流取り込み（sparse clone → rsync） |
| `UPSTREAM.md` | 同期した上流コミットの記録 |

## スキルの追加・無効化

- `skills/<name>/SKILL.md` を追加すると次のカタログ更新で自動的に出ます（プロバイダは
  カタログ取得ごとに `skills/` を再スキャンするため、link: インストールでは再起動不要）
- 一時的に出したくない場合はそのスキルの frontmatter に
  `disable-model-invocation: true` と `user-invocable: false` を両方立てるか、
  ディレクトリを `skills/` の外へ退避してください
- pstack のスキル名（`how`, `why` など）が自前のスキルとかね合った場合は、
  ユーザー／プロジェクト側のスキルが優先されます（rank が小さいほど優先）

## 移植の注意（要点）

Cursor 固有の記述（`Task` サブエージェント、`AskQuestion`、`~/.cursor/rules`、
`cursor-team-kit` の `deslop`/`control-*`、Benny 自動化）はそのままでは DSH に存在しません。
読み替え方針と未移植項目は [PORTING.md](PORTING.md) を参照してください。
上流ファイルの内容は一切書き換えていません。

## License

MIT（上流 pstack に従う）。[LICENSE](LICENSE) / [UPSTREAM.md](UPSTREAM.md)
