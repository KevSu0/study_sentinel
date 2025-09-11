import { db, EncryptionKey, RecoveryPhrase } from './database';

// E2EE Encryption Manager
export class E2EEManager {
  private currentKeyId: string | null = null;
  private currentKey: CryptoKey | null = null;
  private isUnlocked: boolean = false;
  private unlockTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Load existing key or prepare for key creation
    const keys = await db.encryptionKeys
      .where('isActive')
      .equals(1)
      .first();

    if (keys) {
      this.currentKeyId = keys.keyId;
    }
  }

  // Key generation and management
  async createEncryptionKey(passphrase: string): Promise<string> {
    // Generate a random key ID
    const keyId = this.generateKeyId();
    
    // Generate a random encryption key
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );

    // Export the key
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    
    // Derive encryption key from passphrase
    const encryptionKey = await this.deriveKeyFromPassphrase(passphrase, keyId);
    
    // Encrypt the exported key with the passphrase-derived key
    const encryptedKey = await this.encryptWithKey(exportedKey, encryptionKey);
    
    // Store the encrypted key
    const encryptionKeyRecord: EncryptionKey = {
      id: `key_${keyId}`,
      keyId,
      encryptedKey: this.arrayBufferToBase64(encryptedKey),
      salt: this.generateSalt(),
      iterations: 100000,
      algorithm: 'AES-GCM',
      createdAt: Date.now(),
      isActive: true
    };

    await db.encryptionKeys.add(encryptionKeyRecord);
    
    // Generate and store recovery phrase
    const recoveryPhrase = this.generateRecoveryPhrase();
    await this.createRecoveryPhrase(recoveryPhrase, passphrase);
    
    // Set current key
    this.currentKeyId = keyId;
    this.currentKey = key;
    this.isUnlocked = true;
    
    // Set auto-lock timeout
    this.setAutoLock();
    
    return keyId;
  }

  // Unlock with passphrase
  async unlock(passphrase: string): Promise<boolean> {
    if (!this.currentKeyId) {
      return false;
    }

    try {
      const keyRecord = await db.encryptionKeys
        .where('keyId')
        .equals(this.currentKeyId)
        .first();

      if (!keyRecord) {
        return false;
      }

      // Derive key from passphrase
      const encryptionKey = await this.deriveKeyFromPassphrase(
        passphrase, 
        this.currentKeyId, 
        keyRecord.salt, 
        keyRecord.iterations
      );

      // Decrypt the stored key
      const encryptedKey = this.base64ToArrayBuffer(keyRecord.encryptedKey);
      const decryptedKey = await this.decryptWithKey(encryptedKey, encryptionKey);

      // Import the key
      const key = await crypto.subtle.importKey(
        'raw',
        decryptedKey,
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
      );

      this.currentKey = key;
      this.isUnlocked = true;
      
      // Set auto-lock timeout
      this.setAutoLock();

      // Update key usage
      await db.encryptionKeys.update(keyRecord.id, {
        lastUsed: Date.now()
      });

      return true;
    } catch (error) {
      console.error('Failed to unlock encryption key:', error);
      return false;
    }
  }

  // Lock the encryption key
  lock(): void {
    this.currentKey = null;
    this.isUnlocked = false;
    if (this.unlockTimeout) {
      clearTimeout(this.unlockTimeout);
      this.unlockTimeout = null;
    }
  }

  // Check if unlocked
  isKeyUnlocked(): boolean {
    return this.isUnlocked;
  }

  // Check if E2EE is enabled
  async isE2EEEnabled(): Promise<boolean> {
    return this.currentKeyId !== null;
  }

  // Encrypt data
  async encrypt(data: any): Promise<string> {
    if (!this.isUnlocked || !this.currentKey) {
      throw new Error('Encryption key is locked');
    }

    try {
      // Convert data to string
      const dataString = JSON.stringify(data);
      const dataBuffer = new TextEncoder().encode(dataString);

      // Generate IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        this.currentKey,
        dataBuffer
      );

      // Combine IV and encrypted data
      const result = new Uint8Array(iv.length + encrypted.byteLength);
      result.set(iv, 0);
      result.set(new Uint8Array(encrypted), iv.length);

      return this.arrayBufferToBase64(result.buffer);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  // Decrypt data
  async decrypt(encryptedData: string): Promise<any> {
    if (!this.isUnlocked || !this.currentKey) {
      throw new Error('Encryption key is locked');
    }

    try {
      const dataBuffer = this.base64ToArrayBuffer(encryptedData);
      
      // Extract IV and encrypted data
      const iv = dataBuffer.slice(0, 12);
      const encrypted = dataBuffer.slice(12);

      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(iv),
        },
        this.currentKey,
        encrypted
      );

      // Convert back to object
      const decryptedString = new TextDecoder().decode(decrypted);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }

  // Key rotation
  async rotateKey(newPassphrase: string): Promise<string> {
    if (!this.isUnlocked || !this.currentKeyId) {
      throw new Error('Encryption key is locked');
    }

    // Create new key
    const newKeyId = await this.createEncryptionKey(newPassphrase);
    
    // Deactivate old key
    const oldKeyRecord = await db.encryptionKeys
      .where('keyId')
      .equals(this.currentKeyId)
      .first();

    if (oldKeyRecord) {
      await db.encryptionKeys.update(oldKeyRecord.id, { isActive: false });
    }

    return newKeyId;
  }

  // Recovery phrase management
  async createRecoveryPhrase(phrase: string, passphrase: string): Promise<void> {
    if (!this.currentKeyId) {
      throw new Error('No encryption key available');
    }

    // Encrypt the recovery phrase with the current key
    const encryptedPhrase = await this.encrypt(phrase);

    const recoveryRecord: RecoveryPhrase = {
      id: `recovery_${this.currentKeyId}`,
      encryptedPhrase,
      hint: this.generateHint(phrase),
      createdAt: Date.now()
    };

    await db.recoveryPhrases.add(recoveryRecord);
  }

  async recoverWithPhrase(recoveryPhrase: string, newPassphrase: string): Promise<boolean> {
    try {
      // Try to decrypt recovery phrases with the provided phrase
      const recoveryRecords = await db.recoveryPhrases.toArray();
      
      for (const record of recoveryRecords) {
        try {
          // This is a simplified recovery - in practice, you'd need a more secure approach
          if (record.hint && this.verifyRecoveryPhrase(recoveryPhrase, record.hint)) {
            // Create new encryption key
            await this.createEncryptionKey(newPassphrase);
            return true;
          }
        } catch (error) {
          // Continue to next record
        }
      }
      
      return false;
    } catch (error) {
      console.error('Recovery failed:', error);
      return false;
    }
  }

  // Utility methods
  private async deriveKeyFromPassphrase(
    passphrase: string, 
    keyId: string, 
    salt?: string, 
    iterations: number = 100000
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passphraseBuffer = encoder.encode(passphrase);
    const keyIdBuffer = encoder.encode(keyId);
    
    const saltBuffer = salt ? this.base64ToArrayBuffer(salt) : crypto.getRandomValues(new Uint8Array(16));

    // Import passphrase
    const passphraseKey = await crypto.subtle.importKey(
      'raw',
      passphraseBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive key
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: iterations,
        hash: 'SHA-256',
      },
      passphraseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private async encryptWithKey(data: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );

    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encrypted), iv.length);

    return result.buffer;
  }

  private async decryptWithKey(encryptedData: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
    const iv = encryptedData.slice(0, 12);
    const encrypted = encryptedData.slice(12);

    return await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv),
      },
      key,
      encrypted
    );
  }

  private generateKeyId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSalt(): string {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return this.arrayBufferToBase64(salt.buffer);
  }

  private generateRecoveryPhrase(): string {
    const words = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
      'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
      'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
      'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'against', 'age',
      'agent', 'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol',
      'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also',
      'alter', 'always', 'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient'
    ];

    const phrase = [];
    for (let i = 0; i < 12; i++) {
      const wordIndex = Math.floor(Math.random() * words.length);
      phrase.push(words[wordIndex]);
    }

    return phrase.join(' ');
  }

  private generateHint(phrase: string): string {
    // Simple hint based on first letter of each word
    return phrase.split(' ').map(word => word[0].toUpperCase()).join('-');
  }

  private verifyRecoveryPhrase(phrase: string, hint: string): boolean {
    const phraseHint = phrase.split(' ').map(word => word[0].toUpperCase()).join('-');
    return phraseHint === hint;
  }

  private setAutoLock(): void {
    if (this.unlockTimeout) {
      clearTimeout(this.unlockTimeout);
    }

    this.unlockTimeout = setTimeout(() => {
      this.lock();
    }, 30 * 60 * 1000); // 30 minutes
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Public utility methods
  async getKeyInfo(): Promise<{
    hasKey: boolean;
    keyId?: string;
    createdAt?: number;
    lastUsed?: number;
    hasRecoveryPhrase?: boolean;
  }> {
    if (!this.currentKeyId) {
      return { hasKey: false };
    }

    const keyRecord = await db.encryptionKeys
      .where('keyId')
      .equals(this.currentKeyId)
      .first();

    if (!keyRecord) {
      return { hasKey: false };
    }

    const recoveryPhrase = await db.recoveryPhrases
      .where('id')
      .equals(`recovery_${this.currentKeyId}`)
      .first();

    return {
      hasKey: true,
      keyId: keyRecord.keyId,
      createdAt: keyRecord.createdAt,
      lastUsed: keyRecord.lastUsed,
      hasRecoveryPhrase: !!recoveryPhrase
    };
  }

  async getStrengthEstimate(passphrase: string): Promise<{
    score: number;
    feedback: string[];
    isStrong: boolean;
  }> {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (passphrase.length >= 12) {
      score += 25;
    } else {
      feedback.push('Use at least 12 characters');
    }

    // Complexity check
    if (/[a-z]/.test(passphrase)) score += 10;
    if (/[A-Z]/.test(passphrase)) score += 10;
    if (/[0-9]/.test(passphrase)) score += 10;
    if (/[^a-zA-Z0-9]/.test(passphrase)) score += 15;

    // Pattern check
    if (!/(.)\1{2,}/.test(passphrase)) score += 10;
    else feedback.push('Avoid repeated characters');

    // Common patterns
    if (!/password|123456|qwerty/i.test(passphrase)) score += 10;
    else feedback.push('Avoid common passwords');

    // Variety check
    const uniqueChars = new Set(passphrase).size;
    if (uniqueChars / passphrase.length > 0.7) score += 10;
    else feedback.push('Use more varied characters');

    return {
      score: Math.min(100, score),
      feedback,
      isStrong: score >= 70
    };
  }
}

// Data encryption wrapper for sync
export class SyncDataEncryptor {
  private e2eeManager: E2EEManager;

  constructor(e2eeManager: E2EEManager) {
    this.e2eeManager = e2eeManager;
  }

  async encryptForSync(data: any): Promise<{
    encrypted: boolean;
    data: any;
    keyId?: string;
  }> {
    if (await this.e2eeManager.isE2EEEnabled() && this.e2eeManager.isKeyUnlocked()) {
      const encrypted = await this.e2eeManager.encrypt(data);
      return {
        encrypted: true,
        data: encrypted,
        keyId: await this.getCurrentKeyId()
      };
    }

    return {
      encrypted: false,
      data
    };
  }

  async decryptFromSync(encryptedData: any, keyId?: string): Promise<any> {
    if (!encryptedData.encrypted || !keyId) {
      return encryptedData.data;
    }

    if (await this.e2eeManager.isE2EEEnabled() && this.e2eeManager.isKeyUnlocked()) {
      return await this.e2eeManager.decrypt(encryptedData.data);
    }

    throw new Error('Cannot decrypt encrypted data - E2EE not available');
  }

  private async getCurrentKeyId(): Promise<string | null> {
    return this.e2eeManager['currentKeyId'];
  }
}

// Global instance
let e2eeManager: E2EEManager | null = null;

// Initialize E2EE manager
export function initializeE2EEManager(): E2EEManager {
  if (!e2eeManager) {
    e2eeManager = new E2EEManager();
  }
  return e2eeManager;
}

// Get E2EE manager instance
export function getE2EEManager(): E2EEManager | null {
  return e2eeManager;
}