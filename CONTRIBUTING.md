# 開発ガイドライン

## Git 運用方針

### ブランチ戦略 (Simplified Gitflow)

*   **`main`**:
    *   開発の主軸となるブランチです。
    *   小規模な開発では、このブランチから直接featureブランチを作成し、マージします。
    *   常に実行可能で安定した状態を保ちます。
*   **`feature/xxx`**:
    *   機能追加や変更を行うための作業ブランチです。
    *   `main` から分岐し、`main` へマージ（Pull Request）します。
    *   命名例: `feature/login-screen`, `feature/add-quest-api`
*   **`fix/xxx`**:
    *   バグ修正用のブランチです。
    *   命名例: `fix/memory-leak`, `fix/typo-in-readme`

### コミットメッセージ規約 (Conventional Commits)

コミットメッセージは以下の形式で記述してください。これにより、将来的にリリースノートの自動生成が可能になります。

```
<type>(<scope>): <subject>

<body>
```

#### Types
*   **`feat`**: 新機能 (Features)
*   **`fix`**: バグ修正 (Bug Fixes)
*   **`docs`**: ドキュメントのみの変更
*   **`style`**: コードの意味に影響しない変更 (空白、フォーマットなど)
*   **`refactor`**: バグ修正も機能追加も行わないコード変更
*   **`perf`**: パフォーマンスを向上させるコード変更
*   **`test`**: テストの追加や修正
*   **`chore`**: ビルドプロセスやドキュメント生成などの補助ツールやライブラリの変更

#### 例
*   `feat: 日記の感情分析機能を追加`
*   `fix(ui): 設定画面のレイアウト崩れを修正`
*   `docs: READMEにセットアップ手順を追記`
