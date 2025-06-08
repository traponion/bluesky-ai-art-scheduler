import { assertEquals, assert } from "@std/assert";
import { exists } from "@std/fs";
import { join } from "@std/path";
import { FileManager } from "../core/file-manager.ts";

Deno.test("FileManager - get random WebP file from queue", async () => {
  const fileManager = new FileManager("./test-queue", "./test-posted");
  
  // テスト用ディレクトリ作成
  await Deno.mkdir("./test-queue", { recursive: true });
  await Deno.mkdir("./test-posted", { recursive: true });
  
  // テスト用WebPファイル作成（ダミー）
  await Deno.writeFile("./test-queue/test1.webp", new Uint8Array([1, 2, 3]));
  await Deno.writeFile("./test-queue/test2.webp", new Uint8Array([4, 5, 6]));
  await Deno.writeFile("./test-queue/test3.jpg", new Uint8Array([7, 8, 9])); // WebPではない
  
  const randomFile = await fileManager.getRandomWebPFile();
  
  // WebPファイルが選択されることを確認
  assert(randomFile !== null);
  assert(randomFile!.endsWith(".webp"));
  assert(randomFile!.includes("test1.webp") || randomFile!.includes("test2.webp"));
  
  // クリーンアップ
  await Deno.remove("./test-queue", { recursive: true });
  await Deno.remove("./test-posted", { recursive: true });
});

Deno.test("FileManager - move file to posted directory", async () => {
  const fileManager = new FileManager("./test-queue", "./test-posted");
  
  // テスト用ディレクトリ作成
  await Deno.mkdir("./test-queue", { recursive: true });
  await Deno.mkdir("./test-posted", { recursive: true });
  
  // テスト用ファイル作成
  const testFile = "./test-queue/move-test.webp";
  await Deno.writeFile(testFile, new Uint8Array([1, 2, 3, 4]));
  
  // ファイル移動テスト
  await fileManager.moveToPosted(testFile);
  
  // 移動後の確認
  const queueExists = await exists(testFile);
  const postedExists = await exists("./test-posted/move-test.webp");
  
  assertEquals(queueExists, false); // 元ファイルは削除
  assertEquals(postedExists, true);  // 移動先にファイル存在
  
  // クリーンアップ
  await Deno.remove("./test-queue", { recursive: true });
  await Deno.remove("./test-posted", { recursive: true });
});

Deno.test("FileManager - cleanup old files", async () => {
  const fileManager = new FileManager("./test-queue", "./test-posted");
  
  // テスト用ディレクトリ作成
  await Deno.mkdir("./test-posted", { recursive: true });
  
  // 古いファイル作成（1週間以上前の日付）
  const oldFile = "./test-posted/old-file.webp";
  await Deno.writeFile(oldFile, new Uint8Array([1, 2, 3]));
  
  // ファイルの更新日時を1週間以上前に変更
  const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8日前
  await Deno.utime(oldFile, oldDate, oldDate);
  
  // 新しいファイル作成
  const newFile = "./test-posted/new-file.webp";
  await Deno.writeFile(newFile, new Uint8Array([4, 5, 6]));
  
  // クリーンアップ実行
  await fileManager.cleanupOldFiles(7); // 7日より古いファイルを削除
  
  // 確認
  const oldExists = await exists(oldFile);
  const newExists = await exists(newFile);
  
  assertEquals(oldExists, false); // 古いファイルは削除
  assertEquals(newExists, true);  // 新しいファイルは残存
  
  // クリーンアップ
  await Deno.remove("./test-posted", { recursive: true });
});

Deno.test("FileManager - no WebP files in queue", async () => {
  const fileManager = new FileManager("./test-empty-queue", "./test-posted");
  
  // 空のディレクトリ作成
  await Deno.mkdir("./test-empty-queue", { recursive: true });
  
  const randomFile = await fileManager.getRandomWebPFile();
  
  assertEquals(randomFile, null); // WebPファイルがない場合はnull
  
  // クリーンアップ
  await Deno.remove("./test-empty-queue", { recursive: true });
});