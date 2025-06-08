import { join, basename } from "@std/path";
import { exists } from "@std/fs";

export class FileManager {
  constructor(
    private readonly queueDir: string,
    private readonly postedDir: string
  ) {}

  async getRandomWebPFile(): Promise<string | null> {
    try {
      // queueディレクトリの存在確認
      if (!(await exists(this.queueDir))) {
        return null;
      }

      // ディレクトリ内のファイル一覧取得
      const files: string[] = [];
      for await (const entry of Deno.readDir(this.queueDir)) {
        if (entry.isFile && entry.name.toLowerCase().endsWith('.webp')) {
          files.push(join(this.queueDir, entry.name));
        }
      }

      // WebPファイルがない場合
      if (files.length === 0) {
        return null;
      }

      // ランダムに1つ選択
      const randomIndex = Math.floor(Math.random() * files.length);
      return files[randomIndex];
    } catch (error) {
      console.error("Error getting random WebP file:", error);
      return null;
    }
  }

  async moveToPosted(filePath: string): Promise<void> {
    try {
      // postedディレクトリの存在確認・作成
      if (!(await exists(this.postedDir))) {
        await Deno.mkdir(this.postedDir, { recursive: true });
      }

      // ファイル名取得
      const fileName = basename(filePath);
      const destinationPath = join(this.postedDir, fileName);

      // ファイル移動（コピー後削除）
      await Deno.copyFile(filePath, destinationPath);
      await Deno.remove(filePath);

      console.log(`Moved file: ${fileName} -> posted/`);
    } catch (error) {
      throw new Error(`Failed to move file to posted directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async cleanupOldFiles(days: number): Promise<void> {
    try {
      // postedディレクトリの存在確認
      if (!(await exists(this.postedDir))) {
        return;
      }

      const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
      let deletedCount = 0;

      for await (const entry of Deno.readDir(this.postedDir)) {
        if (entry.isFile) {
          const filePath = join(this.postedDir, entry.name);
          
          try {
            const fileInfo = await Deno.stat(filePath);
            
            // ファイルの更新時間が閾値より古い場合は削除
            if (fileInfo.mtime && fileInfo.mtime.getTime() < cutoffTime) {
              await Deno.remove(filePath);
              deletedCount++;
              console.log(`Deleted old file: ${entry.name}`);
            }
          } catch (error) {
            console.error(`Error checking file ${entry.name}:`, error);
          }
        }
      }

      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} old files`);
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  async ensureDirectories(): Promise<void> {
    try {
      // 必要なディレクトリを作成
      if (!(await exists(this.queueDir))) {
        await Deno.mkdir(this.queueDir, { recursive: true });
      }
      
      if (!(await exists(this.postedDir))) {
        await Deno.mkdir(this.postedDir, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Failed to create directories: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getQueueStats(): Promise<{ webpCount: number; totalFiles: number }> {
    try {
      if (!(await exists(this.queueDir))) {
        return { webpCount: 0, totalFiles: 0 };
      }

      let webpCount = 0;
      let totalFiles = 0;

      for await (const entry of Deno.readDir(this.queueDir)) {
        if (entry.isFile) {
          totalFiles++;
          if (entry.name.toLowerCase().endsWith('.webp')) {
            webpCount++;
          }
        }
      }

      return { webpCount, totalFiles };
    } catch (error) {
      console.error("Error getting queue stats:", error);
      return { webpCount: 0, totalFiles: 0 };
    }
  }
}