import { BlueskyClient } from "./bluesky-client.ts";
import { FileManager } from "./file-manager.ts";

export interface PostConfig {
  text: string;
  cleanupDays: number;
}

export interface PostResult {
  success: boolean;
  message: string;
  postUri?: string;
  fileName?: string;
}

export class Poster {
  constructor(
    private readonly blueskyClient: BlueskyClient,
    private readonly fileManager: FileManager,
    private readonly config: PostConfig
  ) {}

  async executePost(): Promise<PostResult> {
    try {
      console.log("Starting post execution...");

      // 1. 古いファイルのクリーンアップ
      console.log(`Cleaning up files older than ${this.config.cleanupDays} days...`);
      await this.fileManager.cleanupOldFiles(this.config.cleanupDays);

      // 2. ディレクトリの存在確認・作成
      await this.fileManager.ensureDirectories();

      // 3. キューの状態確認
      const stats = await this.fileManager.getQueueStats();
      console.log(`Queue stats: ${stats.webpCount} WebP files, ${stats.totalFiles} total files`);

      if (stats.webpCount === 0) {
        return {
          success: false,
          message: "No WebP images found in queue",
        };
      }

      // 4. ランダムにWebPファイルを選択
      const selectedFile = await this.fileManager.getRandomWebPFile();
      if (!selectedFile) {
        return {
          success: false,
          message: "Failed to select WebP file from queue",
        };
      }

      console.log(`Selected file: ${selectedFile}`);

      // 5. ファイル読み込み
      const imageData = await Deno.readFile(selectedFile);
      console.log(`Read file: ${imageData.length} bytes`);

      // 6. Blueskyに投稿
      console.log("Posting to Bluesky...");
      const postResponse = await this.blueskyClient.postWithImage(imageData, this.config.text);
      console.log(`Post successful: ${postResponse.uri}`);

      // 7. ファイルをpostedディレクトリに移動
      await this.fileManager.moveToPosted(selectedFile);

      return {
        success: true,
        message: "Posted successfully",
        postUri: postResponse.uri,
        fileName: selectedFile.split('/').pop(),
      };

    } catch (error) {
      console.error("Post execution failed:", error);
      
      return {
        success: false,
        message: `Post failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async validateConfiguration(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Blueskyクライアントの設定確認
    if (!this.blueskyClient.identifier) {
      issues.push("Bluesky identifier is not set");
    }

    if (!this.blueskyClient.password) {
      issues.push("Bluesky password is not set");
    }

    // 投稿設定の確認
    if (!this.config.text || this.config.text.trim().length === 0) {
      issues.push("Post text is empty");
    }

    if (this.config.cleanupDays <= 0) {
      issues.push("Cleanup days must be greater than 0");
    }

    // ディレクトリ作成テスト
    try {
      await this.fileManager.ensureDirectories();
    } catch (error) {
      issues.push(`Directory creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  async getStatus(): Promise<{
    queueStats: { webpCount: number; totalFiles: number };
    lastRunTime?: Date;
  }> {
    const queueStats = await this.fileManager.getQueueStats();
    
    return {
      queueStats,
      // 実際の実装では、最後の実行時間をファイルやDBから取得
      lastRunTime: undefined,
    };
  }
}