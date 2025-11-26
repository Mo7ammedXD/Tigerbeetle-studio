export class CryptoService {
  private static readonly ALGORITHM = "AES-GCM";
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly SALT_LENGTH = 16;
  private static readonly ITERATIONS = 100000;

  static async deriveKey(
    password: string,
    salt: BufferSource
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const baseKey = await crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: this.ITERATIONS,
        hash: "SHA-256",
      },
      baseKey,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ["encrypt", "decrypt"]
    );
  }

  static async encrypt(data: string, password: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    const key = await this.deriveKey(password, salt);

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv,
      },
      key,
      dataBuffer
    );

    const resultBuffer = new Uint8Array(
      salt.length + iv.length + encryptedBuffer.byteLength
    );
    resultBuffer.set(salt, 0);
    resultBuffer.set(iv, salt.length);
    resultBuffer.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);

    return this.arrayBufferToBase64(resultBuffer);
  }

  static async decrypt(
    encryptedData: string,
    password: string
  ): Promise<string> {
    const encryptedBuffer = this.base64ToArrayBuffer(encryptedData);

    const salt = encryptedBuffer.slice(0, this.SALT_LENGTH);
    const iv = encryptedBuffer.slice(
      this.SALT_LENGTH,
      this.SALT_LENGTH + this.IV_LENGTH
    );
    const data = encryptedBuffer.slice(this.SALT_LENGTH + this.IV_LENGTH);

    const key = await this.deriveKey(password, salt);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv,
      },
      key,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  static async generateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    return this.arrayBufferToHex(hashBuffer);
  }

  private static arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = "";
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private static arrayBufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
}
