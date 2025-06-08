# Bluesky AI Art Scheduler

## 概要
AI生成イラスト（WebP）をBlueskyにランダムかつ自動投稿するツール

## 基本仕様

### 機能
- `queue/` フォルダからWebP画像をランダム選択
- "#AIart" 固定テキストで投稿
- 投稿後は `posted/` に移動
- 1週間後に自動削除
- Alt text なし（将来拡張予定）

### ディレクトリ構成
```
deno-bluesky-scheduler/
├── core/
│   ├── poster.ts          # メイン投稿ロジック
│   ├── file-manager.ts    # ファイル管理・削除
│   └── bluesky-client.ts  # Bluesky API接続
├── config/
│   └── config.json        # 設定ファイル
├── queue/                 # 投稿待ちWebP画像
├── posted/               # 投稿済み画像（1週間保持）
├── tests/                # テストファイル
└── main.ts               # エントリーポイント
```

### 設定ファイル
```json
{
  "bluesky": {
    "identifier": "your-handle.bsky.social", 
    "password": "your-app-password"
  },
  "post": {
    "text": "#AIart",
    "cleanupDays": 7
  }
}
```

### 使用方法
```bash
# 投稿実行
deno run --allow-read --allow-write --allow-net main.ts

# cron設定例（1日3回）
0 9,15,21 * * * cd /path/to/project && deno run --allow-read --allow-write --allow-net main.ts
```

## 将来の拡張計画

### プラグインアーキテクチャ
- 画像解析プラグイン（Gemini API等）
- 前処理プラグイン（リサイズ、透かし等）
- 投稿先プラグイン（Mastodon等）

### 解析機能（予定）
- Gemini APIで画像解析
- AIキャラクターのセリフ生成
- Alt textへの自動追加

## 技術スタック
- **Runtime**: Deno
- **Language**: TypeScript
- **API**: AT Protocol (Bluesky)
- **画像形式**: WebP
- **スケジューラー**: cron

## 開発方針
- テスト駆動開発（TDD）
- モジュール化設計
- 拡張可能なアーキテクチャ
- 最小限での動作開始