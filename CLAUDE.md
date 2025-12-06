# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**diary_quest** - RPG風日記アプリケーション

日常の日記を、あらかじめ設定した世界観の旅の日記に自動変換するシステム。
RPG要素とゲーミフィケーションにより、日記を書く習慣を楽しく継続できるようにする。

## Current Status

**Phase: 設計フェーズ → 完了**

完了済み:
- ✅ アイデア出し
- ✅ 要件定義
- ✅ 技術選定
- ✅ データモデル設計
- ✅ コアロジックAPI設計
- ✅ システムアーキテクチャ設計

次のフェーズ:
- 📋 開発環境のセットアップ
- 📋 Monorepo構造の構築
- 📋 packages/core の実装
- 📋 packages/database の実装
- 📋 apps/desktop のUI実装

## Architecture

### Monorepo構成

```
diary_quest/
├── packages/
│   ├── core/           # 共通ビジネスロジック
│   ├── database/       # DB抽象化（SQLite/PostgreSQL）
│   └── shared/         # 共有ユーティリティ
│
└── apps/
    ├── desktop/        # Phase 1: デスクトップアプリ（Tauri + React）
    └── bot/            # Phase 2: Bot（将来追加予定）
```

## Technology Stack

### Phase 1: Desktop Application

**Platform:**
- Tauri 1.5+
- Rust backend (minimal)

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui
- Zustand (state management)

**Database:**
- SQLite (better-sqlite3)
- Markdown files (world settings)

**LLM API:**
- Multi-provider support (OpenAI, Anthropic Claude, Google Gemini)

**Key Libraries:**
- React Hook Form + Zod (forms)
- Lexical (text editor)
- Recharts (charts)
- jsPDF (PDF export)
- date-fns (date handling)
- marked (Markdown parsing)

**Development Tools:**
- pnpm (monorepo management)
- ESLint + Prettier
- Vitest + React Testing Library

### Phase 2: Bot Version (Future)

- Discord.js / Bolt for Slack
- PostgreSQL
- Docker
- Railway / Fly.io (hosting)

## Key Features (MVP)

1. **日記変換** - LLMによる世界観に沿った日記変換
2. **キャラクター管理** - RPGステータス、レベルアップ、スキル
3. **クエストシステム** - 現実の目標をゲーム内クエストとして管理
4. **感情分析** - AIによる感情分析と励まし機能
5. **ランダムイベント** - 日記執筆時のサプライズ要素
6. **ストーリー生成** - 期間の日記を物語として再構成
7. **成長レポート** - 月次・年次レポート自動生成

## Development Workflow

### Setup (予定)

```bash
# Install dependencies
pnpm install

# Desktop app development
cd apps/desktop
pnpm tauri dev

# Run tests
pnpm test

# Build
pnpm build
```

## Documentation

### プロジェクト管理
- `議事録.md` - 全ての議論と決定の記録
- `要件定義書.md` - 機能要件・非機能要件の詳細
- `技術選定書.md` - 技術スタックの選定理由と比較

### 設計ドキュメント
- `設計書_データモデル.md` - データベーススキーマと型定義
- `設計書_コアロジックAPI.md` - ビジネスロジックのAPI設計
- `設計書_システムアーキテクチャ.md` - 全体アーキテクチャとパッケージ構成

### サンプル
- `世界観設定サンプル_fantasy.md` - 世界観設定のサンプル
- `キャラクターステータスサンプル.json` - RPGステータスのサンプル

## Design Patterns

- **Repository Pattern** - データベースアクセスの抽象化
- **Factory Pattern** - LLMプロバイダーの生成
- **Strategy Pattern** - 複数のLLMプロバイダー切り替え
- **Monorepo** - コアロジックの共通化と再利用

## Notes for Development

- コアロジック(`packages/core`)は将来のBot版でも再利用されるため、プラットフォーム依存のコードを含めないこと
- データベースアクセスは必ず`packages/database`の抽象化層を経由すること
- LLM APIの呼び出しは必ずプロバイダー抽象化層を経由すること
- ユーザーデータ（日記、APIキー等）は完全にローカルに保存、プライバシーを最優先すること
