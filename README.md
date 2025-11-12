# Miyabi Autonomous Development Framework

Autonomous development powered by Agentic OS

## 🎯 プロジェクト概要

このリポジトリはMiyabiフレームワークを使用した自律型AI開発システムです。GitHubのissueを作成すると、AIエージェントが自動的にコードを実装してPull Requestを作成します。

## 📊 現在の状態

### ✅ 実装済み
- [x] Miyabiエージェントフレームワーク実装（src/）
- [x] 自動ラベリング機能
- [x] プロジェクト自動管理
- [x] ステートマシン（状態遷移管理）
- [x] GitHub Actions統合
- [x] ANTHROPIC_API_KEY設定完了
- [x] package.jsonとdependencies

### 🔧 修正中
- [ ] TypeScriptコンパイルエラーの修正
  - src/cli/agent-runner.ts: 型定義の不一致
  - src/agents/coordinator.ts: 型アノテーション不足

## 🚀 セットアップ方法

### 前提条件
- Node.js 18以上
- npm 9以上
- Anthropic API Key

### 他のPCでの確認方法

\`\`\`bash
# 1. リポジトリをクローン
gh repo clone zatsugaku/-
cd -

# 2. 依存関係をインストール
npm install

# 3. TypeScriptコンパイルチェック（現在エラーあり）
npm run typecheck

# 4. ローカルで開発サーバー起動
npm run dev
\`\`\`

### GitHub Secretsの設定（初回のみ）

\`\`\`bash
# Anthropic API Keyを設定
gh secret set ANTHROPIC_API_KEY --repo zatsugaku/-
\`\`\`

## 📝 使い方

### 1. Issueを作成

\`\`\`bash
gh issue create --repo zatsugaku/- \
  --title "新機能: XXXを追加" \
  --body "実装したい内容を記載"
\`\`\`

### 2. ラベルでエージェント実行をトリガー

\`\`\`bash
# 自動でラベルが付与されます:
# - 📊 priority:P2-Medium
# - 📥 state:pending
# - 🎯 phase:planning

# エージェント実行用ラベルを追加（手動の場合）
gh issue edit <issue番号> --add-label "🤖agent-execute"
\`\`\`

### 3. AIエージェントが自動実行

- CoordinatorAgent: タスク分析・計画
- CodeGenAgent: コード生成
- ReviewAgent: コードレビュー
- PRAgent: Pull Request作成

## 🤖 利用可能なエージェント

| エージェント | 機能 | 状態 |
|------------|------|------|
| CoordinatorAgent | タスク管理と計画 | 🔧修正中 |
| CodeGenAgent | コード実装 | 🔧修正中 |
| ReviewAgent | 品質チェック | 🔧修正中 |
| IssueAgent | Issue分析 | ✅動作中 |
| PRAgent | PR管理 | 🔧修正中 |
| DeploymentAgent | デプロイ | 未実装 |

## 📂 ディレクトリ構造

\`\`\`
.
├── .github/
│   └── workflows/          # GitHub Actions ワークフロー
│       ├── autonomous-agent.yml      # メインエージェント実行
│       ├── issue-opened.yml          # 自動ラベリング
│       ├── project-sync.yml          # プロジェクト同期
│       └── state-machine.yml         # 状態管理
├── src/
│   ├── agents/             # AIエージェント実装
│   │   ├── coordinator.ts  # 調整エージェント
│   │   ├── codegen.ts      # コード生成
│   │   ├── review.ts       # レビュー
│   │   └── ...
│   ├── cli/                # CLIツール
│   │   └── agent-runner.ts # エージェント実行
│   ├── api/                # API統合
│   └── types/              # TypeScript型定義
├── package.json            # 依存関係定義
├── tsconfig.json           # TypeScript設定
└── README.md               # このファイル
\`\`\`

## 🔍 トラブルシューティング

### TypeScriptエラーが発生する

現在、以下のファイルに型エラーがあります：
- \`src/cli/agent-runner.ts\`: 型定義の不一致
- \`src/agents/coordinator.ts\`: 型アノテーション不足

一時的な回避策：
\`\`\`bash
# typecheckをスキップして実行
npm run dev
\`\`\`

### ワークフローが失敗する

1. GitHub Secretsが設定されているか確認
   \`\`\`bash
   gh secret list --repo zatsugaku/-
   \`\`\`

2. ワークフローログを確認
   \`\`\`bash
   gh run list --repo zatsugaku/-
   gh run view <run-id> --log-failed
   \`\`\`

## 📚 関連リソース

- [Miyabi AI Agent Framework](https://github.com/ShunsukeHayashi/Miyabi_AI_Agent)
- [参考実装: test_miyabi](https://github.com/ShunsukeHayashi/test_miyabi)
- [Anthropic Claude API](https://console.anthropic.com/)

## 🤝 コントリビューション

Issue、Pull Request歓迎です！

## 📄 ライセンス

MIT License

---

## 📝 進捗ログ

### 2025-11-12
- ✅ Miyabiフレームワーク実装を追加
- ✅ package.jsonとdependencies設定
- ✅ ANTHROPIC_API_KEY設定完了
- ✅ GitHub Actions ワークフロー設定
- 🔧 TypeScriptコンパイルエラー修正中

### 次のステップ
1. TypeScript型エラーの修正
2. エージェント実行の動作確認
3. テストissueでPR自動生成を確認

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
