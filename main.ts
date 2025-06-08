#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net

import { exists } from "@std/fs";
import { BlueskyClient } from "./core/bluesky-client.ts";
import { FileManager } from "./core/file-manager.ts";
import { Poster } from "./core/poster.ts";

interface Config {
  post: {
    text: string;
    cleanupDays: number;
  };
  directories: {
    queue: string;
    posted: string;
  };
}

async function loadEnv(): Promise<{ identifier: string; password: string }> {
  // .envファイルから読み込み
  try {
    const envData = await Deno.readTextFile(".env");
    const envVars: Record<string, string> = {};
    
    for (const line of envData.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          envVars[key] = valueParts.join("=");
        }
      }
    }
    
    // 環境変数で上書き
    const identifier = Deno.env.get("BLUESKY_IDENTIFIER") || envVars.BLUESKY_IDENTIFIER;
    const password = Deno.env.get("BLUESKY_PASSWORD") || envVars.BLUESKY_PASSWORD;
    
    if (!identifier || !password) {
      throw new Error("BLUESKY_IDENTIFIER and BLUESKY_PASSWORD are required in .env file or environment variables");
    }
    
    return { identifier, password };
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(".env file not found. Copy .env.example and edit it.");
    }
    throw error;
  }
}

async function loadConfig(): Promise<Config> {
  const configPath = "./config/config.json";
  
  if (!(await exists(configPath))) {
    throw new Error(`Config file not found: ${configPath}. Copy config.json.example and edit it.`);
  }

  const configData = await Deno.readTextFile(configPath);
  const config: Config = JSON.parse(configData);

  // 環境変数による設定の上書き
  if (Deno.env.get("POST_TEXT")) {
    config.post.text = Deno.env.get("POST_TEXT")!;
  }
  
  if (Deno.env.get("CLEANUP_DAYS")) {
    config.post.cleanupDays = parseInt(Deno.env.get("CLEANUP_DAYS")!);
  }

  return config;
}

async function main() {
  try {
    console.log("🚀 Bluesky AI Art Scheduler starting...");
    
    // 環境変数読み込み
    const envConfig = await loadEnv();
    console.log(`📋 Config loaded for: ${envConfig.identifier}`);
    
    // 設定読み込み
    const config = await loadConfig();

    // クライアント初期化
    const blueskyClient = new BlueskyClient(
      envConfig.identifier,
      envConfig.password
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
    console.log(`📊 Queue status: ${status.queueStats.webpCount} WebP files ready`);

    if (status.queueStats.webpCount === 0) {
      console.log("📁 No WebP images in queue. Add some images to ./queue/ and try again.");
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
    
    if (error.message.includes("Config file not found")) {
      console.log("\n📝 To get started:");
      console.log("   1. Copy config/config.json.example to config/config.json");
      console.log("   2. Edit config.json with your Bluesky credentials");
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
  config/config.json  Configuration file (copy from config.json.example)
  queue/             Directory for WebP images to post
  posted/            Directory for posted images (auto-cleaned after 7 days)

Example cron entry (post 3 times daily):
  0 9,15,21 * * * cd /path/to/project && deno run --allow-read --allow-write --allow-net main.ts
`);
  Deno.exit(0);
}

if (args.includes("--status") || args.includes("-s")) {
  try {
    const config = await loadConfig();
    const envConfig = await loadEnv();
    const fileManager = new FileManager(config.directories.queue, config.directories.posted);
    const stats = await fileManager.getQueueStats();
    
    console.log("📊 Queue Status:");
    console.log(`   WebP files: ${stats.webpCount}`);
    console.log(`   Total files: ${stats.totalFiles}`);
    console.log(`   Queue directory: ${config.directories.queue}`);
    console.log(`   Posted directory: ${config.directories.posted}`);
    console.log(`   Bluesky account: ${envConfig.identifier}`);
  } catch (error) {
    console.error("❌ Error checking status:", error.message);
    Deno.exit(1);
  }
  Deno.exit(0);
}

if (args.includes("--config") || args.includes("-c")) {
  try {
    const config = await loadConfig();
    const envConfig = await loadEnv();
    const blueskyClient = new BlueskyClient(envConfig.identifier, envConfig.password);
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