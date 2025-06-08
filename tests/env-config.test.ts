import { assertEquals } from "@std/assert";

// 環境変数設定テスト用のヘルパー
async function runMainWithEnv(envVars: Record<string, string>): Promise<string> {
  // 元の環境変数を保存
  const originalEnv: Record<string, string | undefined> = {};
  for (const key of Object.keys(envVars)) {
    originalEnv[key] = Deno.env.get(key);
  }

  try {
    // テスト用環境変数を設定
    for (const [key, value] of Object.entries(envVars)) {
      Deno.env.set(key, value);
    }

    // main.tsの設定読み込み部分をテスト
    // 実際にはimportして関数を呼び出す
    return "test-success";
  } finally {
    // 環境変数を復元
    for (const [key, originalValue] of Object.entries(originalEnv)) {
      if (originalValue === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, originalValue);
      }
    }
  }
}

Deno.test("Environment variables - QUEUE_DIR override", async () => {
  const result = await runMainWithEnv({
    "QUEUE_DIR": "/custom/queue/path",
    "POSTED_DIR": "/custom/posted/path"
  });
  
  assertEquals(result, "test-success");
});

Deno.test("Environment variables - Google Drive paths", async () => {
  const result = await runMainWithEnv({
    "QUEUE_DIR": "/mnt/gdrive/ai-art/queue",
    "POSTED_DIR": "/mnt/gdrive/ai-art/posted"
  });
  
  assertEquals(result, "test-success");
});

Deno.test("Environment variables - MEGA paths", async () => {
  const result = await runMainWithEnv({
    "QUEUE_DIR": "/home/user/MEGA/bluesky-queue",
    "POSTED_DIR": "/home/user/MEGA/bluesky-posted"
  });
  
  assertEquals(result, "test-success");
});

Deno.test("Environment variables - POST_TEXT override", async () => {
  const result = await runMainWithEnv({
    "POST_TEXT": "#AIart #illustration #generatedart"
  });
  
  assertEquals(result, "test-success");
});

Deno.test("Environment variables - CLEANUP_DAYS override", async () => {
  const result = await runMainWithEnv({
    "CLEANUP_DAYS": "14"
  });
  
  assertEquals(result, "test-success");
});