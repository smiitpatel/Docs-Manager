/**
 * Docs Manager - Web Crypto API Engine (AES-GCM 256-bit)
 * 
 * CRITICAL ARCHITECTURE RULE:
 * Offline document encryption keys have a local browser-bound lifecycle
 * completely DECOUPLED from Google OAuth access tokens.
 * Even if Google OAuth expires after 6 months of inactivity,
 * previously synchronized offline documents remain 100% decryptable and viewable!
 */

const KEY_DB_NAME = 'DocsManagerSecurityVault';
const KEY_STORE_NAME = 'vault_keys';
const KEY_ID = 'local_document_vault_key_v1';

let cachedVaultKey = null;

/**
 * Open private IndexedDB for CryptoKey storage
 */
function openKeyDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(KEY_DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(KEY_STORE_NAME)) {
        db.createObjectStore(KEY_STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Retrieves the existing AES-GCM 256-bit CryptoKey or generates a new one
 */
export async function getOrCreateVaultKey() {
  if (cachedVaultKey) {
    return cachedVaultKey;
  }

  const db = await openKeyDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE_NAME, 'readwrite');
    const store = tx.objectStore(KEY_STORE_NAME);
    const getReq = store.get(KEY_ID);

    getReq.onsuccess = async () => {
      let key = getReq.result;
      if (key) {
        cachedVaultKey = key;
        resolve(key);
      } else {
        try {
          // Generate native AES-GCM 256-bit key
          key = await crypto.subtle.generateKey(
            {
              name: 'AES-GCM',
              length: 256
            },
            false, // Non-extractable for maximum security against script exfiltration
            ['encrypt', 'decrypt']
          );

          const putTx = db.transaction(KEY_STORE_NAME, 'readwrite');
          putTx.objectStore(KEY_STORE_NAME).put(key, KEY_ID);
          putTx.oncomplete = () => {
            cachedVaultKey = key;
            resolve(key);
          };
          putTx.onerror = (e) => reject(e.target.error);
        } catch (err) {
          reject(err);
        }
      }
    };
    getReq.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Encrypt an ArrayBuffer using AES-GCM with a fresh 12-byte initialization vector (IV)
 * @param {ArrayBuffer} rawBuffer 
 * @returns {Promise<{ iv: Uint8Array, cipherBuffer: ArrayBuffer }>}
 */
export async function encryptBuffer(rawBuffer) {
  const key = await getOrCreateVaultKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit recommended IV for AES-GCM

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    rawBuffer
  );

  return {
    iv,
    cipherBuffer
  };
}

/**
 * Decrypt an encrypted cipherBuffer using the AES-GCM key and stored IV
 * @param {ArrayBuffer} cipherBuffer 
 * @param {Uint8Array} iv 
 * @returns {Promise<ArrayBuffer>}
 */
export async function decryptBuffer(cipherBuffer, iv) {
  const key = await getOrCreateVaultKey();
  
  // Ensure IV is Uint8Array
  const ivArray = iv instanceof Uint8Array ? iv : new Uint8Array(iv);

  return await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivArray
    },
    key,
    cipherBuffer
  );
}

/**
 * Securely clear the local encryption vault (used during complete local data wipe)
 */
export async function clearVault() {
  cachedVaultKey = null;
  const db = await openKeyDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE_NAME, 'readwrite');
    tx.objectStore(KEY_STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}
