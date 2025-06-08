// アプリケーション全体で使用する定数定義

// サポート画像形式
export const SUPPORTED_IMAGE_EXTENSIONS = ['.webp', '.jpg', '.jpeg', '.png'] as const;
export type SupportedImageExtension = typeof SUPPORTED_IMAGE_EXTENSIONS[number];

// ファイルサイズ制限
export const MAX_FILE_SIZE = 1000000; // 1MB = 1,000,000 bytes

// デフォルト設定値
export const DEFAULT_CLEANUP_DAYS = 7;
export const DEFAULT_POST_TEXT = "#AIart";
export const DEFAULT_QUEUE_DIR = "./queue";
export const DEFAULT_POSTED_DIR = "./posted";

// Bluesky API関連
export const BLUESKY_BASE_URL = "https://bsky.social";

// 画像形式検出用のマジックナンバー
export const IMAGE_SIGNATURES = {
  WEBP: {
    HEADER: [0x52, 0x49, 0x46, 0x46] as const, // "RIFF"
    FORMAT: [0x57, 0x45, 0x42, 0x50] as const, // "WEBP"
    MIN_SIZE: 12,
  },
  JPEG: {
    HEADER: [0xFF, 0xD8, 0xFF] as const,
    MIN_SIZE: 3,
  },
  PNG: {
    HEADER: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] as const,
    MIN_SIZE: 24,
  },
} as const;

// ログレベル
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;

// 環境変数キー
export const ENV_KEYS = {
  BLUESKY_IDENTIFIER: "BLUESKY_IDENTIFIER",
  BLUESKY_PASSWORD: "BLUESKY_PASSWORD",
  POST_TEXT: "POST_TEXT",
  CLEANUP_DAYS: "CLEANUP_DAYS",
  QUEUE_DIR: "QUEUE_DIR",
  POSTED_DIR: "POSTED_DIR",
} as const;

// VP8チャンクタイプ
export const VP8_CHUNK_TYPES = {
  VP8: "VP8 ",
  VP8L: "VP8L",
  VP8X: "VP8X",
} as const;

// ファイル操作関連
export const FILE_OPERATIONS = {
  DEFAULT_PERMISSIONS: 0o755,
  BATCH_SIZE: 100, // 大量ファイル処理時のバッチサイズ
} as const;