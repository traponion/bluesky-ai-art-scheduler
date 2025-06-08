# 🦋 Bluesky AI Art Scheduler

AI生成イラスト（WebP/JPEG/PNG）をBlueskyに自動投稿するDenoツール

## 🚀 セットアップ

### 1. 環境変数設定
```bash
cp .env.example .env
```

### 2. Bluesky認証情報設定
`.env` ファイルを編集：
```env
BLUESKY_IDENTIFIER=your-handle.bsky.social
BLUESKY_PASSWORD=your-app-password
```

**アプリパスワード作成：**
1. Bluesky → Settings → Privacy and Security → App Passwords
2. 新しいアプリパスワードを生成
3. 生成されたパスワードを`.env`ファイルに記入

### 3. 画像配置
対応画像（WebP/JPEG/PNG）を `queue/` フォルダに配置

## 📦 使用方法

### 手動実行
```bash
# 投稿実行
deno task run

# ステータス確認
deno run --allow-read main.ts --status

# 設定確認
deno run --allow-read main.ts --config

# ヘルプ表示
deno run main.ts --help
```

### 自動実行（cron）
```bash
# crontab -e で以下を追加（1日3回実行）
0 9,15,21 * * * cd /path/to/bluesky-scheduler && deno task run
```

## 📁 ディレクトリ構成

```
deno-bluesky-scheduler/
├── core/                  # コアロジック
│   ├── bluesky-client.ts  # Bluesky API接続
│   ├── file-manager.ts    # ファイル管理
│   └── poster.ts          # 投稿実行
├── tests/                 # テストファイル
├── queue/                 # 投稿待ち画像（WebP/JPEG/PNG）
├── posted/               # 投稿済み画像（1週間後削除）
├── .env                  # 環境変数設定（要作成）
├── .env.example          # 環境変数テンプレート
├── main.ts               # メインエントリーポイント
└── README.md
```

## ⚙️ 環境変数

**必須：**
```env
BLUESKY_IDENTIFIER=your-handle.bsky.social
BLUESKY_PASSWORD=your-app-password
```

**オプション：**
```env
POST_TEXT="#AIart #illustration"
CLEANUP_DAYS=14
QUEUE_DIR="/path/to/your/queue"
POSTED_DIR="/path/to/your/posted"
```

**クラウドストレージ連動例：**
```env
# Google Drive
QUEUE_DIR="/mnt/gdrive/ai-art/queue"
POSTED_DIR="/mnt/gdrive/ai-art/posted"

# MEGA
QUEUE_DIR="/home/user/MEGA/bluesky-queue"
POSTED_DIR="/home/user/MEGA/bluesky-posted"
```

## 🧪 テスト実行

```bash
# 全テスト実行
deno task test

# 特定のテストファイル
deno test tests/file-manager.test.ts --allow-read --allow-write
```

## 🔧 動作の流れ

1. **クリーンアップ**: `posted/` の1週間以上古いファイルを削除
2. **ファイル選択**: `queue/` から対応画像をランダム選択
3. **投稿**: Blueskyに "#AIart" で投稿
4. **移動**: 投稿成功時に `posted/` へファイル移動

## 🚨 トラブルシューティング

### 設定エラー
```bash
deno run --allow-read --allow-env main.ts --config
```

### キューが空
```bash
deno run --allow-read --allow-env main.ts --status
```

### 権限エラー
```bash
# 適切な権限で実行
deno run --allow-read --allow-write --allow-net main.ts
```

### 認証エラー
- `.env`ファイルのBlueskyアプリパスワードが正しいか確認
- ハンドル名（`@`なしで`user.bsky.social`）が正しいか確認

## 🔮 将来の拡張予定

- 🤖 Gemini API画像解析によるAltテキスト自動生成
- 🔄 複数投稿先対応（Mastodon等）
- 📊 投稿統計・ログ機能
- 🎨 画像前処理プラグイン（リサイズ、透かし等）

## 📄 ライセンス

MIT License