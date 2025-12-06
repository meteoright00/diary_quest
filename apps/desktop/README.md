# Diary Quest - Desktop App

RPG風日記アプリケーションのデスクトップ版です。

## Tech Stack

- **Framework**: Tauri 1.5
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui (予定)
- **State Management**: Zustand
- **Database**: SQLite (better-sqlite3)

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run Tauri development (with hot reload)
pnpm tauri:dev

# Build for production
pnpm build
pnpm tauri:build
```

## Features

- 📖 日記の作成と管理
- ⚔️ キャラクターシステム（RPGステータス）
- 🎯 クエスト管理（目標のゲーミフィケーション）
- 📚 ストーリー生成（日記から物語を自動生成）
- 📊 成長レポート（月次・年次の振り返り）
- 🪄 LLM統合（日記のRPG風変換）

## Project Structure

```
apps/desktop/
├── src/
│   ├── components/       # Reusable components
│   │   └── layout/      # Layout components
│   ├── pages/           # Page components
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── src-tauri/           # Tauri backend
│   ├── src/
│   │   └── main.rs     # Rust entry point
│   ├── Cargo.toml      # Rust dependencies
│   └── tauri.conf.json # Tauri configuration
└── package.json
```
