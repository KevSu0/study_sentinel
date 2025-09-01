export type EncMeta = {
  alg: 'AES-GCM';
  kdf: 'PBKDF2-HMAC-SHA256';
  iters: number;
  saltB64: string;
  ivB64: string;
};

const te = new TextEncoder();

function b64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}
function b64dec(s: string) {
  return new Uint8Array(atob(s).split('').map(c => c.charCodeAt(0)));
}

async function deriveKey(password: string, salt: Uint8Array, iters: number) {
  const keyMaterial = await crypto.subtle.importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iters },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function aesGcmEncrypt(plaintext: Uint8Array, password: string) {
  const iters = 200_000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iters);
  const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  const meta: EncMeta = {
    alg: 'AES-GCM',
    kdf: 'PBKDF2-HMAC-SHA256',
    iters,
    saltB64: b64(salt),
    ivB64: b64(iv),
  };
  return { ct: new Uint8Array(ctBuf), meta };
}

export async function aesGcmDecrypt(ciphertext: Uint8Array, meta: EncMeta, password: string) {
  const salt = b64dec(meta.saltB64);
  const iv = b64dec(meta.ivB64);
  const key = await deriveKey(password, salt, meta.iters);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new Uint8Array(pt);
}

export async function aesGcmEncryptWithRawKey(plaintext: Uint8Array, rawKey: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { ct: new Uint8Array(ct), iv };
}

export async function aesGcmDecryptWithRawKey(ciphertext: Uint8Array, iv: Uint8Array, rawKey: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new Uint8Array(pt);
}
