export interface ImageDimensions {
  width: number;
  height: number;
  format: 'webp' | 'jpeg' | 'png';
}

export interface AspectRatio {
  width: number;
  height: number;
}

export class ImageDimensionsDetector {
  getImageDimensions(imageData: Uint8Array): ImageDimensions {
    // WebP: RIFF????WEBP
    if (imageData.length >= 12 &&
        imageData[0] === 0x52 && imageData[1] === 0x49 && 
        imageData[2] === 0x46 && imageData[3] === 0x46 &&
        imageData[8] === 0x57 && imageData[9] === 0x45 && 
        imageData[10] === 0x42 && imageData[11] === 0x50) {
      return this.getWebPDimensions(imageData);
    }
    
    // JPEG: FF D8 FF
    if (imageData.length >= 3 &&
        imageData[0] === 0xFF && imageData[1] === 0xD8 && imageData[2] === 0xFF) {
      return this.getJpegDimensions(imageData);
    }
    
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (imageData.length >= 24 &&
        imageData[0] === 0x89 && imageData[1] === 0x50 && 
        imageData[2] === 0x4E && imageData[3] === 0x47 &&
        imageData[4] === 0x0D && imageData[5] === 0x0A && 
        imageData[6] === 0x1A && imageData[7] === 0x0A) {
      return this.getPngDimensions(imageData);
    }
    
    throw new Error('Unsupported image format for dimension detection');
  }

  private getWebPDimensions(imageData: Uint8Array): ImageDimensions {
    const dataView = new DataView(imageData.buffer);
    let offset = 12;
    
    while (offset < imageData.length - 8) {
      // VP8/VP8L/VP8Xチャンクを探す
      if (offset + 8 >= imageData.length) break;
      
      const chunkType = new TextDecoder().decode(imageData.slice(offset, offset + 4));
      const chunkSize = dataView.getUint32(offset + 4, true);
      
      if (chunkType === "VP8 ") {
        // VP8フォーマット: frame tag + start codeをスキップして寸法を取得
        const frameStart = offset + 8;
        if (frameStart + 10 < imageData.length) {
          // frame tag (3 bytes) + start code (3 bytes) をスキップ
          const dimensionOffset = frameStart + 6;
          // VP8では width-1, height-1 で格納される
          const width = (dataView.getUint16(dimensionOffset, true) & 0x3fff) + 1;
          const height = (dataView.getUint16(dimensionOffset + 2, true) & 0x3fff) + 1;
          return { width, height, format: 'webp' };
        }
      } else if (chunkType === "VP8L") {
        // VP8L (lossless)フォーマット
        const frameStart = offset + 8;
        if (frameStart + 5 < imageData.length) {
          // VP8Lのビットストリームから寸法を読み取り
          const bits = dataView.getUint32(frameStart + 1, true);
          const width = (bits & 0x3fff) + 1;
          const height = ((bits >> 14) & 0x3fff) + 1;
          return { width, height, format: 'webp' };
        }
      } else if (chunkType === "VP8X") {
        // VP8X (extended)フォーマット
        if (offset + 18 < imageData.length) {
          const width = (dataView.getUint32(offset + 12, true) & 0xffffff) + 1;
          const height = (dataView.getUint32(offset + 15, true) & 0xffffff) + 1;
          return { width, height, format: 'webp' };
        }
      }
      
      offset += 8 + chunkSize;
      // パディング調整
      if (chunkSize % 2 === 1) offset++;
    }
    
    throw new Error('Could not find WebP dimensions');
  }

  private getJpegDimensions(imageData: Uint8Array): ImageDimensions {
    const dataView = new DataView(imageData.buffer);
    let offset = 2;
    
    while (offset < imageData.length - 1) {
      if (imageData[offset] === 0xFF) {
        const marker = imageData[offset + 1];
        
        // SOF (Start of Frame) マーカーを探す
        if ((marker >= 0xC0 && marker <= 0xC3) || 
            (marker >= 0xC5 && marker <= 0xC7) ||
            (marker >= 0xC9 && marker <= 0xCB) ||
            (marker >= 0xCD && marker <= 0xCF)) {
          
          if (offset + 9 < imageData.length) {
            const height = dataView.getUint16(offset + 5);
            const width = dataView.getUint16(offset + 7);
            return { width, height, format: 'jpeg' };
          }
        }
        
        // 次のセグメントへ
        if (offset + 3 < imageData.length) {
          const segmentLength = dataView.getUint16(offset + 2);
          offset += 2 + segmentLength;
        } else {
          break;
        }
      } else {
        offset++;
      }
    }
    
    throw new Error('Could not find JPEG dimensions');
  }

  private getPngDimensions(imageData: Uint8Array): ImageDimensions {
    // PNG IHDRチャンクは常に8バイト目から始まる
    const dataView = new DataView(imageData.buffer);
    
    // IHDRチャンクの確認
    if (imageData.length >= 24) {
      const ihdrStart = 8;
      const chunkLength = dataView.getUint32(ihdrStart);
      const chunkType = new TextDecoder().decode(imageData.slice(ihdrStart + 4, ihdrStart + 8));
      
      if (chunkType === "IHDR" && chunkLength >= 13) {
        const width = dataView.getUint32(ihdrStart + 8);
        const height = dataView.getUint32(ihdrStart + 12);
        return { width, height, format: 'png' };
      }
    }
    
    throw new Error('Could not find PNG dimensions');
  }

  calculateAspectRatio(width: number, height: number): AspectRatio {
    // 最大公約数を計算してアスペクト比を簡約
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    
    return {
      width: width / divisor,
      height: height / divisor
    };
  }
}