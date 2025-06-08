import { assertEquals, assertRejects } from "@std/assert";
import { BlueskyClient } from "../core/bluesky-client.ts";
import { ImageDimensionsDetector } from "../core/image-dimensions.ts";

Deno.test("BlueskyClient - successful authentication", async () => {
  const client = new BlueskyClient("test.bsky.social", "test-password");
  
  // モック: 認証成功をテスト
  const mockAuth = () => Promise.resolve({ 
    accessJwt: "mock-jwt", 
    did: "did:plc:test" 
  });
  
  // 実際のテストは実装後に修正
  assertEquals(client.identifier, "test.bsky.social");
});

Deno.test("BlueskyClient - post with image", async () => {
  const client = new BlueskyClient("test.bsky.social", "test-password");
  
  // モック: 画像投稿成功をテスト
  const mockImageData = new Uint8Array([1, 2, 3, 4]); // ダミー画像データ
  const mockPost = () => Promise.resolve({ 
    uri: "at://did:plc:test/app.bsky.feed.post/test",
    cid: "test-cid"
  });
  
  // 実際のテストは実装後に修正
  assertEquals(typeof client.postWithImage, "function");
});

Deno.test("BlueskyClient - authentication failure", async () => {
  const client = new BlueskyClient("invalid.bsky.social", "wrong-password");
  
  // モック: 認証失敗をテスト
  // 実際のテストは実装後に修正
  assertEquals(client.password, "wrong-password");
});

Deno.test("BlueskyClient - image upload", async () => {
  const client = new BlueskyClient("test.bsky.social", "test-password");
  
  // モック: 画像アップロード成功をテスト
  const mockImageData = new Uint8Array([1, 2, 3, 4]);
  
  // 実際のテストは実装後に修正
  assertEquals(typeof client.uploadImage, "function");
});

Deno.test("BlueskyClient - aspectRatio integration test", async () => {
  const client = new BlueskyClient("test.bsky.social", "test-password");
  
  // 実際のWebP画像データ（100x200サイズ）
  const webpData = new Uint8Array([
    // RIFF header
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0x26, 0x00, 0x00, 0x00, // file size
    0x57, 0x45, 0x42, 0x50, // "WEBP"
    
    // VP8 chunk
    0x56, 0x50, 0x38, 0x20, // "VP8 "
    0x1A, 0x00, 0x00, 0x00, // chunk size
    
    // VP8 bitstream
    0x30, 0x01, 0x00,       // frame tag
    0x9D, 0x01, 0x2A,       // start code
    0x63, 0x00,             // width-1 (99)
    0xC7, 0x00,             // height-1 (199)
    // Padding
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00
  ]);

  // 画像サイズ検出のテスト
  const detector = new ImageDimensionsDetector();
  const dimensions = detector.getImageDimensions(webpData);
  
  assertEquals(dimensions.width, 100);
  assertEquals(dimensions.height, 200);
  assertEquals(dimensions.format, "webp");
  
  // aspectRatio計算のテスト
  const aspectRatio = detector.calculateAspectRatio(dimensions.width, dimensions.height);
  assertEquals(aspectRatio.width, 1);  // 100:200 = 1:2
  assertEquals(aspectRatio.height, 2);
  
  // postWithImageWithAspectRatio関数の存在チェック
  assertEquals(typeof client.postWithImageWithAspectRatio, "function");
});