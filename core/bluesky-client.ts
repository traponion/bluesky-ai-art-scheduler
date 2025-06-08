export interface AuthResponse {
  accessJwt: string;
  did: string;
}

export interface PostResponse {
  uri: string;
  cid: string;
}

export interface BlobResponse {
  blob: {
    $type: string;
    ref: {
      $link: string;
    };
    mimeType: string;
    size: number;
  };
}

export class BlueskyClient {
  private accessJwt: string | null = null;
  private did: string | null = null;
  private readonly baseUrl = "https://bsky.social";

  constructor(
    public readonly identifier: string,
    public readonly password: string
  ) {}

  async authenticate(): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/xrpc/com.atproto.server.createSession`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: this.identifier,
        password: this.password,
      }),
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.accessJwt = data.accessJwt;
    this.did = data.did;

    return {
      accessJwt: data.accessJwt,
      did: data.did,
    };
  }

  async uploadImage(imageData: Uint8Array): Promise<BlobResponse> {
    if (!this.accessJwt) {
      throw new Error("Not authenticated. Call authenticate() first.");
    }

    const response = await fetch(`${this.baseUrl}/xrpc/com.atproto.repo.uploadBlob`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.accessJwt}`,
        "Content-Type": "image/webp",
      },
      body: imageData,
    });

    if (!response.ok) {
      throw new Error(`Image upload failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async createPost(text: string, imageBlob?: BlobResponse["blob"]): Promise<PostResponse> {
    if (!this.accessJwt || !this.did) {
      throw new Error("Not authenticated. Call authenticate() first.");
    }

    // ハッシュタグのfacets作成
    const facets = this.extractHashtags(text);

    const record: any = {
      $type: "app.bsky.feed.post",
      text: text,
      createdAt: new Date().toISOString(),
    };

    if (facets.length > 0) {
      record.facets = facets;
    }

    if (imageBlob) {
      record.embed = {
        $type: "app.bsky.embed.images",
        images: [
          {
            alt: "",
            image: imageBlob,
          },
        ],
      };
    }

    const response = await fetch(`${this.baseUrl}/xrpc/com.atproto.repo.createRecord`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.accessJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repo: this.did,
        collection: "app.bsky.feed.post",
        record: record,
      }),
    });

    if (!response.ok) {
      throw new Error(`Post creation failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async postWithImage(imageData: Uint8Array, text: string): Promise<PostResponse> {
    // 認証
    await this.authenticate();

    // 画像アップロード
    const blobResponse = await this.uploadImage(imageData);

    // 投稿作成
    return await this.createPost(text, blobResponse.blob);
  }

  private extractHashtags(text: string): any[] {
    const facets: any[] = [];
    const hashtagRegex = /#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g;
    let match;

    while ((match = hashtagRegex.exec(text)) !== null) {
      const hashtag = match[0];
      const start = match.index;
      const end = start + hashtag.length;

      facets.push({
        index: {
          byteStart: new TextEncoder().encode(text.slice(0, start)).length,
          byteEnd: new TextEncoder().encode(text.slice(0, end)).length,
        },
        features: [
          {
            $type: "app.bsky.richtext.facet#tag",
            tag: hashtag.slice(1), // #を除去
          },
        ],
      });
    }

    return facets;
  }
}