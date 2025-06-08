import { assertEquals, assert } from "@std/assert";
import { exists } from "@std/fs";
import { join } from "@std/path";
import { FileManager } from "../core/file-manager.ts";

Deno.test("FileManager - get random image file from queue", async () => {
  const fileManager = new FileManager("./test-queue", "./test-posted");
  
  // テスト用ディレクトリ作成
  await Deno.mkdir("./test-queue", { recursive: true });
  await Deno.mkdir("./test-posted", { recursive: true });
  
  // テスト用画像ファイル作成（ダミー）
  await Deno.writeFile("./test-queue/test1.webp", new Uint8Array([1, 2, 3]));
  await Deno.writeFile("./test-queue/test2.jpg", new Uint8Array([4, 5, 6]));
  await Deno.writeFile("./test-queue/test3.png", new Uint8Array([7, 8, 9]));
  await Deno.writeFile("./test-queue/test4.txt", new Uint8Array([10, 11, 12])); // 非対応形式
  
  const randomFile = await fileManager.getRandomImageFile();
  
  // 対応画像ファイルが選択されることを確認
  assert(randomFile !== null);
  const supportedExts = ['.webp', '.jpg', '.png'];
  const isSupported = supportedExts.some(ext => randomFile!.endsWith(ext));
  assert(isSupported);
  
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

Deno.test("FileManager - no image files in queue", async () => {
  const fileManager = new FileManager("./test-empty-queue", "./test-posted");
  
  // 空のディレクトリ作成
  await Deno.mkdir("./test-empty-queue", { recursive: true });
  
  const randomFile = await fileManager.getRandomImageFile();
  
  assertEquals(randomFile, null); // 対応画像ファイルがない場合はnull
  
  // クリーンアップ
  await Deno.remove("./test-empty-queue", { recursive: true });
});

Deno.test("FileManager - queue stats with mixed file types", async () => {
  const fileManager = new FileManager("./test-mixed-queue", "./test-posted");
  
  // テスト用ディレクトリ作成
  await Deno.mkdir("./test-mixed-queue", { recursive: true });
  
  // 様々な形式のファイル作成
  await Deno.writeFile("./test-mixed-queue/image1.webp", new Uint8Array([1, 2, 3]));
  await Deno.writeFile("./test-mixed-queue/image2.jpg", new Uint8Array([4, 5, 6]));
  await Deno.writeFile("./test-mixed-queue/image3.jpeg", new Uint8Array([7, 8, 9]));
  await Deno.writeFile("./test-mixed-queue/image4.png", new Uint8Array([10, 11, 12]));
  await Deno.writeFile("./test-mixed-queue/document.txt", new Uint8Array([13, 14, 15]));
  
  const stats = await fileManager.getQueueStats();
  
  assertEquals(stats.imageCount, 4); // 4つの画像ファイル
  assertEquals(stats.totalFiles, 5); // 5つの全ファイル
  assertEquals(stats.byExtension['.webp'], 1);
  assertEquals(stats.byExtension['.jpg'], 2); // .jpeg は .jpg に統一される
  assertEquals(stats.byExtension['.png'], 1);
  
  // クリーンアップ
  await Deno.remove("./test-mixed-queue", { recursive: true });
});