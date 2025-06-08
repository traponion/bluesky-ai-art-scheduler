import { assertEquals, assert } from "@std/assert";
import { exists } from "@std/fs";
import { Poster } from "../core/poster.ts";

// モッククラス
class MockBlueskyClient {
  constructor(public identifier: string, public password: string) {}
  
  async authenticate() {
    return { accessJwt: "mock-jwt", did: "did:plc:test" };
  }
  
  async postWithImage(imageData: Uint8Array, text: string) {
    return { 
      uri: "at://did:plc:test/app.bsky.feed.post/mock",
      cid: "mock-cid"
    };
  }
}

class MockFileManager {
  constructor(public queueDir: string, public postedDir: string) {}
  
  async getRandomWebPFile(): Promise<string | null> {
    return "./test-queue/mock-image.webp";
  }
  
  async moveToPosted(filePath: string): Promise<void> {
    // モック: ファイル移動
  }
  
  async cleanupOldFiles(days: number): Promise<void> {
    // モック: 古いファイル削除
  }
  
  async ensureDirectories(): Promise<void> {
    // モック: ディレクトリ作成
  }
  
  async getQueueStats(): Promise<{ webpCount: number; totalFiles: number }> {
    return { webpCount: 1, totalFiles: 1 };
  }
}

Deno.test("Poster - successful post execution", async () => {
  const mockClient = new MockBlueskyClient("test.bsky.social", "test-password");
  const mockFileManager = new MockFileManager("./test-queue", "./test-posted");
  
  const poster = new Poster(
    mockClient as any,
    mockFileManager as any,
    { text: "#AIart", cleanupDays: 7 }
  );
  
  // テスト用画像ファイル作成
  await Deno.mkdir("./test-queue", { recursive: true });
  await Deno.writeFile("./test-queue/mock-image.webp", new Uint8Array([1, 2, 3, 4]));
  
  const result = await poster.executePost();
  
  assertEquals(result.success, true);
  assertEquals(result.message, "Posted successfully");
  assert(result.postUri?.includes("mock"));
  
  // クリーンアップ
  await Deno.remove("./test-queue", { recursive: true }).catch(() => {});
});

Deno.test("Poster - no images in queue", async () => {
  const mockClient = new MockBlueskyClient("test.bsky.social", "test-password");
  
  // 空のファイルマネージャーモック
  const emptyFileManager = {
    async getRandomWebPFile() { return null; },
    async moveToPosted() {},
    async cleanupOldFiles() {},
    async ensureDirectories() {},
    async getQueueStats() { return { webpCount: 0, totalFiles: 0 }; }
  };
  
  const poster = new Poster(
    mockClient as any,
    emptyFileManager as any,
    { text: "#AIart", cleanupDays: 7 }
  );
  
  const result = await poster.executePost();
  
  assertEquals(result.success, false);
  assertEquals(result.message, "No WebP images found in queue");
});

Deno.test("Poster - authentication failure", async () => {
  // 認証失敗するモッククライアント
  const failingClient = {
    async postWithImage() {
      throw new Error("Authentication failed");
    }
  };
  
  const mockFileManager = {
    async getRandomWebPFile() { return "./test-queue/mock.webp"; },
    async moveToPosted() {},
    async cleanupOldFiles() {},
    async ensureDirectories() {},
    async getQueueStats() { return { webpCount: 1, totalFiles: 1 }; }
  };
  
  // テスト用ファイル作成
  await Deno.mkdir("./test-queue", { recursive: true });
  await Deno.writeFile("./test-queue/mock.webp", new Uint8Array([1, 2, 3, 4]));
  
  const poster = new Poster(
    failingClient as any,
    mockFileManager as any,
    { text: "#AIart", cleanupDays: 7 }
  );
  
  const result = await poster.executePost();
  
  assertEquals(result.success, false);
  assert(result.message.includes("Authentication failed"));
  
  // クリーンアップ
  await Deno.remove("./test-queue", { recursive: true }).catch(() => {});
});

Deno.test("Poster - cleanup old files", async () => {
  const mockClient = new MockBlueskyClient("test.bsky.social", "test-password");
  
  let cleanupCalled = false;
  const trackingFileManager = {
    async getRandomWebPFile() { return "./test-queue/mock.webp"; },
    async moveToPosted() {},
    async cleanupOldFiles(days: number) {
      cleanupCalled = true;
      assertEquals(days, 7);
    },
    async ensureDirectories() {},
    async getQueueStats() { return { webpCount: 1, totalFiles: 1 }; }
  };
  
  const poster = new Poster(
    mockClient as any,
    trackingFileManager as any,
    { text: "#AIart", cleanupDays: 7 }
  );
  
  // テスト用画像ファイル作成
  await Deno.mkdir("./test-queue", { recursive: true });
  await Deno.writeFile("./test-queue/mock.webp", new Uint8Array([1, 2, 3, 4]));
  
  await poster.executePost();
  
  assertEquals(cleanupCalled, true);
  
  // クリーンアップ
  await Deno.remove("./test-queue", { recursive: true }).catch(() => {});
});