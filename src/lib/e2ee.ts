import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";

const encoder = new TextEncoder();

const toBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

const fromBase64 = (value: string): ArrayBuffer => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const generateAesKey = async (): Promise<CryptoKey> =>
  crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);

const exportKeyBase64 = async (key: CryptoKey): Promise<string> => {
  const raw = await crypto.subtle.exportKey("raw", key);
  return toBase64(raw);
};

const importKeyBase64 = async (keyB64: string): Promise<CryptoKey> => {
  const raw = fromBase64(keyB64);
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
};

export const getOrCreateUserKey = async (db: Firestore, uid: string): Promise<CryptoKey> => {
  // Store per-user encryption key in profiles/{uid} to align with Firestore rules
  const ref = doc(db, "profiles", uid);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data()?.loopUpdateKey : null;

  if (existing && typeof existing === "string" && existing.length > 0) {
    return importKeyBase64(existing);
  }

  const key = await generateAesKey();
  const keyB64 = await exportKeyBase64(key);
  await setDoc(ref, { loopUpdateKey: keyB64 }, { merge: true });
  return key;
};

export const encryptText = async (key: CryptoKey, plaintext: string): Promise<{ ciphertext: string; iv: string }> => {
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv: ivBytes }, key, encoder.encode(plaintext));
  return {
    ciphertext: toBase64(ciphertextBuffer),
    iv: toBase64(ivBytes.buffer),
  };
};

export const decryptText = async (key: CryptoKey, ciphertext: string, iv: string): Promise<string> => {
  const ivBytes = fromBase64(iv);
  const data = fromBase64(ciphertext);
  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(ivBytes) }, key, data);
  const decoder = new TextDecoder();
  return decoder.decode(plainBuffer);
};
