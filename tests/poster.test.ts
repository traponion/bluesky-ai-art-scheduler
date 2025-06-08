import { assertEquals, assert } from "@std/assert";
import { exists } from "@std/fs";
import { Poster } from "../core/poster.ts";
import { SUPPORTED_IMAGE_EXTENSIONS } from "../core/constants.ts";

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
  
  async postWithImageWithAspectRatio(imageData: Uint8Array, text: string) {
    return { 
      uri: "at://did:plc:test/app.bsky.feed.post/mock",
      cid: "mock-cid"
    };
  }
}

class MockFileManager {
  constructor(public queueDir: string, public postedDir: string) {}
  
  async getRandomImageFile(): Promise<string | null> {
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
  
  async getQueueStats(): Promise<{ imageCount: number; totalFiles: number; byExtension: Record<string, number> }> {
    return { imageCount: 1, totalFiles: 1, byExtension: { '.webp': 1 } };
  }
  
  getSupportedExtensions(): string[] {
    return [...SUPPORTED_IMAGE_EXTENSIONS];
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
    async getRandomImageFile() { return null; },
    async moveToPosted() {},
    async cleanupOldFiles() {},
    async ensureDirectories() {},
    async getQueueStats() { return { imageCount: 0, totalFiles: 0, byExtension: {} }; },
    getSupportedExtensions() { return [...SUPPORTED_IMAGE_EXTENSIONS]; }
  };
  
  const poster = new Poster(
    mockClient as any,
    emptyFileManager as any,
    { text: "#AIart", cleanupDays: 7 }
  );
  
  const result = await poster.executePost();
  
  assertEquals(result.success, false);
  assert(result.message.includes("No supported images found in queue"));
});

Deno.test("Poster - authentication failure", async () => {
  // 認証失敗するモッククライアント
  const failingClient = {
    async postWithImage() {
      throw new Error("Authentication failed");
    },
    async postWithImageWithAspectRatio() {
      throw new Error("Authentication failed");
    }
  };
  
  const mockFileManager = {
    async getRandomImageFile() { return "./test-queue/mock.webp"; },
    async moveToPosted() {},
    async cleanupOldFiles() {},
    async ensureDirectories() {},
    async getQueueStats() { return { imageCount: 1, totalFiles: 1, byExtension: { '.webp': 1 } }; },
    getSupportedExtensions() { return [...SUPPORTED_IMAGE_EXTENSIONS]; }
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
    async getRandomImageFile() { return "./test-queue/mock.webp"; },
    async moveToPosted() {},
    async cleanupOldFiles(days: number) {
      cleanupCalled = true;
      assertEquals(days, 7);
    },
    async ensureDirectories() {},
    async getQueueStats() { return { imageCount: 1, totalFiles: 1, byExtension: { '.webp': 1 } }; },
    getSupportedExtensions() { return [...SUPPORTED_IMAGE_EXTENSIONS]; }
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

Deno.test("Poster - file size limit exceeded", async () => {
  const mockClient = new MockBlueskyClient("test.bsky.social", "test-password");
  
  // 実際のFileManagerを使用
  const { FileManager } = await import("../core/file-manager.ts");
  const fileManager = new FileManager("./test-queue-large", "./test-posted-large");
  
  const poster = new Poster(
    mockClient as any,
    fileManager as any,
    { text: "#AIart", cleanupDays: 7 }
  );
  
  // 1MB超過の大きなファイルを作成（1,500,000バイト）
  await Deno.mkdir("./test-queue-large", { recursive: true });
  await Deno.mkdir("./test-posted-large", { recursive: true });
  
  const largeImageData = new Uint8Array(1500000); // 1.5MB
  largeImageData.fill(42); // データで埋める
  await Deno.writeFile("./test-queue-large/large-image.webp", largeImageData);
  
  const result = await poster.executePost();
  
  // 処理は成功扱いだが、ファイルサイズ超過のメッセージ
  assertEquals(result.success, true);
  assert(result.message.includes("File size too large"));
  assert(result.message.includes("moved to posted"));
  
  // ファイルがpostedディレクトリに移動されている
  const fileExists = await Deno.stat("./test-posted-large/large-image.webp").then(() => true).catch(() => false);
  assertEquals(fileExists, true);
  
  // クリーンアップ
  await Deno.remove("./test-queue-large", { recursive: true }).catch(() => {});
  await Deno.remove("./test-posted-large", { recursive: true }).catch(() => {});
});

Deno.test("Poster - file size within limit", async () => {
  const mockClient = new MockBlueskyClient("test.bsky.social", "test-password");
  
  // 実際のFileManagerを使用
  const { FileManager } = await import("../core/file-manager.ts");
  const fileManager = new FileManager("./test-queue-small", "./test-posted-small");
  
  const poster = new Poster(
    mockClient as any,
    fileManager as any,
    { text: "#AIart", cleanupDays: 7 }
  );
  
  // 1MB以下の小さなファイルを作成（500,000バイト）
  await Deno.mkdir("./test-queue-small", { recursive: true });
  await Deno.mkdir("./test-posted-small", { recursive: true });
  
  const smallImageData = new Uint8Array(500000); // 500KB
  smallImageData.fill(42);
  await Deno.writeFile("./test-queue-small/small-image.webp", smallImageData);
  
  const result = await poster.executePost();
  
  // 正常に投稿処理される
  assertEquals(result.success, true);
  assertEquals(result.message, "Posted successfully");
  
  // クリーンアップ
  await Deno.remove("./test-queue-small", { recursive: true }).catch(() => {});
  await Deno.remove("./test-posted-small", { recursive: true }).catch(() => {});
});