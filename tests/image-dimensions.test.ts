import { assertEquals, assertThrows } from "@std/assert";
import { ImageDimensionsDetector } from "../core/image-dimensions.ts";

Deno.test("ImageDimensionsDetector - detect WebP dimensions", async () => {
  // 実際のWebPファイル構造に基づくテストデータ
  // RIFF header + WEBP + VP8 chunk with 100x200 dimensions
  const webpData = new Uint8Array([
    // RIFF header (12 bytes)
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0x26, 0x00, 0x00, 0x00, // file size (38 bytes total - 8)
    0x57, 0x45, 0x42, 0x50, // "WEBP"
    
    // VP8 chunk header (8 bytes)
    0x56, 0x50, 0x38, 0x20, // "VP8 " (note the space)
    0x1A, 0x00, 0x00, 0x00, // chunk size (26 bytes)
    
    // VP8 bitstream (26 bytes)
    0x30, 0x01, 0x00,       // frame tag (keyframe, version 0, show_frame=1)
    0x9D, 0x01, 0x2A,       // start code
    0x63, 0x00,             // width-1 (99 = 100-1)
    0xC7, 0x00,             // height-1 (199 = 200-1)
    // Padding to reach chunk size
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00
  ]);

  const detector = new ImageDimensionsDetector();
  const dimensions = detector.getImageDimensions(webpData);
  
  assertEquals(dimensions.format, "webp");
  assertEquals(dimensions.width, 100);
  assertEquals(dimensions.height, 200);
});

Deno.test("ImageDimensionsDetector - detect JPEG dimensions", async () => {
  // 最小のJPEGファイル（SOF0マーカー付き）
  const jpegData = new Uint8Array([
    0xFF, 0xD8,             // SOI marker
    0xFF, 0xE0,             // APP0 marker
    0x00, 0x10,             // segment length
    0x4A, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
    0x01, 0x01,             // version
    0x01,                   // units
    0x00, 0x48, 0x00, 0x48, // density
    0x00, 0x00,             // thumbnail size
    
    0xFF, 0xC0,             // SOF0 marker
    0x00, 0x11,             // segment length
    0x08,                   // precision
    0x01, 0x90,             // height (400)
    0x01, 0x2C,             // width (300)
    0x03,                   // components
    0x01, 0x22, 0x00,       // component 1
    0x02, 0x11, 0x01,       // component 2
    0x03, 0x11, 0x01,       // component 3
    
    0xFF, 0xD9              // EOI marker
  ]);

  const detector = new ImageDimensionsDetector();
  const dimensions = detector.getImageDimensions(jpegData);
  
  assertEquals(dimensions.format, "jpeg");
  assertEquals(dimensions.width, 300);
  assertEquals(dimensions.height, 400);
});

Deno.test("ImageDimensionsDetector - detect PNG dimensions", async () => {
  // PNG with IHDR chunk containing 150x250 dimensions
  const pngData = new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR length (13)
    0x49, 0x48, 0x44, 0x52, // "IHDR"
    0x00, 0x00, 0x00, 0x96, // width (150)
    0x00, 0x00, 0x00, 0xFA, // height (250)
    0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
    0x87, 0x8A, 0xC5, 0x0F  // CRC
  ]);

  const detector = new ImageDimensionsDetector();
  const dimensions = detector.getImageDimensions(pngData);
  
  assertEquals(dimensions.format, "png");
  assertEquals(dimensions.width, 150);
  assertEquals(dimensions.height, 250);
});

Deno.test("ImageDimensionsDetector - invalid format throws error", async () => {
  const invalidData = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
  
  const detector = new ImageDimensionsDetector();
  
  assertThrows(
    () => detector.getImageDimensions(invalidData),
    Error,
    "Unsupported image format"
  );
});

Deno.test("ImageDimensionsDetector - calculate aspect ratio", async () => {
  const detector = new ImageDimensionsDetector();
  
  // 16:9 ratio
  const ratio1 = detector.calculateAspectRatio(1920, 1080);
  assertEquals(ratio1.width, 16);
  assertEquals(ratio1.height, 9);
  
  // 4:3 ratio
  const ratio2 = detector.calculateAspectRatio(800, 600);
  assertEquals(ratio2.width, 4);
  assertEquals(ratio2.height, 3);
  
  // 1:1 ratio (square)
  const ratio3 = detector.calculateAspectRatio(500, 500);
  assertEquals(ratio3.width, 1);
  assertEquals(ratio3.height, 1);
  
  // Prime numbers should remain as-is
  const ratio4 = detector.calculateAspectRatio(7, 11);
  assertEquals(ratio4.width, 7);
  assertEquals(ratio4.height, 11);
});

Deno.test("ImageDimensionsDetector - edge cases", async () => {
  const detector = new ImageDimensionsDetector();
  
  // Very small dimensions
  const ratio1 = detector.calculateAspectRatio(1, 1);
  assertEquals(ratio1.width, 1);
  assertEquals(ratio1.height, 1);
  
  // Large dimensions with common factor
  const ratio2 = detector.calculateAspectRatio(3840, 2160);
  assertEquals(ratio2.width, 16);
  assertEquals(ratio2.height, 9);
});