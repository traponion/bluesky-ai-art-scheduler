// エラーハンドリングの統一

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = true,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }

  override toString(): string {
    const contextStr = this.context ? ` Context: ${JSON.stringify(this.context)}` : '';
    return `${this.name} [${this.code}]: ${this.message}${contextStr}`;
  }
}

// 具体的なエラータイプ
export class FileSystemError extends AppError {
  constructor(message: string, path: string, operation: string) {
    super(
      message, 
      'FILESYSTEM_ERROR', 
      true, 
      { path, operation }
    );
    this.name = 'FileSystemError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, url: string, statusCode?: number) {
    super(
      message, 
      'NETWORK_ERROR', 
      true, 
      { url, statusCode }
    );
    this.name = 'NetworkError';
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, missingKeys?: string[]) {
    super(
      message, 
      'CONFIGURATION_ERROR', 
      false, 
      { missingKeys }
    );
    this.name = 'ConfigurationError';
  }
}

export class ImageProcessingError extends AppError {
  constructor(message: string, fileName: string, reason: string) {
    super(
      message, 
      'IMAGE_PROCESSING_ERROR', 
      true, 
      { fileName, reason }
    );
    this.name = 'ImageProcessingError';
  }
}

// エラーハンドリングユーティリティ
export class ErrorHandler {
  static handle(error: unknown, context: string): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(
        error.message,
        'UNKNOWN_ERROR',
        true,
        { originalError: error.name, context }
      );
    }

    return new AppError(
      String(error),
      'UNKNOWN_ERROR',
      true,
      { context }
    );
  }

  static log(error: AppError): void {
    const logLevel = error.recoverable ? console.warn : console.error;
    logLevel(`${error.toString()}`);
  }

  static isFileNotFound(error: unknown): boolean {
    return error instanceof Error && 
           (error.name === 'NotFound' || 
            (error as any).code === 'ENOENT');
  }

  static isNetworkError(error: unknown): boolean {
    return error instanceof Error && 
           (error.message.includes('fetch') || 
            error.message.includes('network') ||
            error.message.includes('connection'));
  }
}