#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net

import { exists } from "@std/fs";
import { BlueskyClient } from "./core/bluesky-client.ts";
import { FileManager } from "./core/file-manager.ts";
import { Poster } from "./core/poster.ts";
import { 
  DEFAULT_CLEANUP_DAYS, 
  DEFAULT_POST_TEXT, 
  DEFAULT_QUEUE_DIR, 
  DEFAULT_POSTED_DIR,
  ENV_KEYS 
} from "./core/constants.ts";

interface AppConfig {
  bluesky: {
    identifier: string;
    password: string;
  };
  post: {
    text: string;
    cleanupDays: number;
  };
  directories: {
    queue: string;
    posted: string;
  };
}

async function loadAppConfig(): Promise<AppConfig> {
  // .envファイルから読み込み
  let envVars: Record<string, string> = {};
  
  try {
    const envData = await Deno.readTextFile(".env");
    
    for (const line of envData.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          // クォートを除去
          let value = valueParts.join("=");
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          envVars[key] = value;
        }
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(".env file not found. Copy .env.example and edit it.");
    }
    throw error;
  }
  
  // 環境変数で上書き（環境変数が優先）
  const getEnvValue = (key: string): string | undefined => {
    return Deno.env.get(key) || envVars[key];
  };
  
  // 必須設定のチェック
  const identifier = getEnvValue(ENV_KEYS.BLUESKY_IDENTIFIER);
  const password = getEnvValue(ENV_KEYS.BLUESKY_PASSWORD);
  
  if (!identifier || !password) {
    throw new Error(`${ENV_KEYS.BLUESKY_IDENTIFIER} and ${ENV_KEYS.BLUESKY_PASSWORD} are required in .env file or environment variables`);
  }
  
  // デフォルト値ありの設定
  const config: AppConfig = {
    bluesky: {
      identifier,
      password,
    },
    post: {
      text: getEnvValue(ENV_KEYS.POST_TEXT) || DEFAULT_POST_TEXT,
      cleanupDays: parseInt(getEnvValue(ENV_KEYS.CLEANUP_DAYS) || DEFAULT_CLEANUP_DAYS.toString()),
    },
    directories: {
      queue: getEnvValue(ENV_KEYS.QUEUE_DIR) || DEFAULT_QUEUE_DIR,
      posted: getEnvValue(ENV_KEYS.POSTED_DIR) || DEFAULT_POSTED_DIR,
    },
  };
  
  return config;
}

async function main() {
  try {
    console.log("🚀 Bluesky AI Art Scheduler starting...");
    
    // 設定読み込み
    const config = await loadAppConfig();
    console.log(`📋 Config loaded for: ${config.bluesky.identifier}`);

    // クライアント初期化
    const blueskyClient = new BlueskyClient(
      config.bluesky.identifier,
      config.bluesky.password
    );

    const fileManager = new FileManager(
      config.directories.queue,
      config.directories.posted
    );

    const poster = new Poster(blueskyClient, fileManager, config.post);

    // 設定検証
    console.log("🔍 Validating configuration...");
    const validation = await poster.validateConfiguration();
    
    if (!validation.valid) {
      console.error("❌ Configuration validation failed:");
      validation.issues.forEach(issue => console.error(`  - ${issue}`));
      Deno.exit(1);
    }

    console.log("✅ Configuration is valid");

    // ステータス確認
    const status = await poster.getStatus();
    console.log(`📊 Queue status: ${status.queueStats.imageCount} images ready`);

    if (status.queueStats.imageCount === 0) {
      const supportedExts = fileManager.getSupportedExtensions().join(', ');
      console.log(`📁 No images in queue. Add some images (${supportedExts}) to ./queue/ and try again.`);
      Deno.exit(0);
    }

    // 投稿実行
    console.log("📤 Executing post...");
    const result = await poster.executePost();

    if (result.success) {
      console.log("🎉 Post successful!");
      console.log(`   📝 Text: ${config.post.text}`);
      console.log(`   🖼️  File: ${result.fileName}`);
      console.log(`   🔗 URI: ${result.postUri}`);
    } else {
      console.error("❌ Post failed:");
      console.error(`   ${result.message}`);
      Deno.exit(1);
    }

  } catch (error) {
    console.error("💥 Fatal error:", error.message);
    
    if (error.message.includes(".env file not found")) {
      console.log("\n📝 To get started:");
      console.log("   1. Copy .env.example to .env");
      console.log("   2. Edit .env with your Bluesky credentials");
      console.log("   3. Add WebP images to ./queue/");
      console.log("   4. Run this script again");
    }
    
    Deno.exit(1);
  }
}

// コマンドライン引数による動作切り替え
const args = Deno.args;

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
🦋 Bluesky AI Art Scheduler

Usage:
  deno run --allow-read --allow-write --allow-net main.ts [options]

Options:
  --help, -h     Show this help message
  --status, -s   Show queue status only
  --config, -c   Validate configuration only

Environment Variables:
  BLUESKY_IDENTIFIER  Override Bluesky identifier
  BLUESKY_PASSWORD    Override Bluesky password

Files:
  .env               Environment variables file (copy from .env.example)
  queue/             Directory for WebP images to post
  posted/            Directory for posted images (auto-cleaned after 7 days)

Example cron entry (post 3 times daily):
  0 9,15,21 * * * cd /path/to/project && deno run --allow-read --allow-write --allow-net main.ts
`);
  Deno.exit(0);
}

if (args.includes("--status") || args.includes("-s")) {
  try {
    const config = await loadAppConfig();
    const fileManager = new FileManager(config.directories.queue, config.directories.posted);
    const stats = await fileManager.getQueueStats();
    
    console.log("📊 Queue Status:");
    console.log(`   Image files: ${stats.imageCount}`);
    console.log(`   Total files: ${stats.totalFiles}`);
    
    // 拡張子別の詳細表示
    if (Object.keys(stats.byExtension).length > 0) {
      const extensionDetails = Object.entries(stats.byExtension)
        .map(([ext, count]) => `${ext}: ${count}`)
        .join(', ');
      console.log(`   By format: ${extensionDetails}`);
    }
    
    console.log(`   Queue directory: ${config.directories.queue}`);
    console.log(`   Posted directory: ${config.directories.posted}`);
    console.log(`   Bluesky account: ${config.bluesky.identifier}`);
  } catch (error) {
    console.error("❌ Error checking status:", error.message);
    Deno.exit(1);
  }
  Deno.exit(0);
}

if (args.includes("--config") || args.includes("-c")) {
  try {
    const config = await loadAppConfig();
    const blueskyClient = new BlueskyClient(config.bluesky.identifier, config.bluesky.password);
    const fileManager = new FileManager(config.directories.queue, config.directories.posted);
    const poster = new Poster(blueskyClient, fileManager, config.post);
    
    const validation = await poster.validateConfiguration();
    
    if (validation.valid) {
      console.log("✅ Configuration is valid");
    } else {
      console.error("❌ Configuration issues:");
      validation.issues.forEach(issue => console.error(`  - ${issue}`));
      Deno.exit(1);
    }
  } catch (error) {
    console.error("❌ Configuration error:", error.message);
    Deno.exit(1);
  }
  Deno.exit(0);
}

// メイン実行
if (import.meta.main) {
  await main();
}