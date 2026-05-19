// ChatApp/src/utils/crypto.js
import nacl from 'tweetnacl';

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Helper: Uint8Array to Base64
export function uint8ArrayToBase64(bytes) {
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;

    const c1 = b1 >> 2;
    const c2 = ((b1 & 3) << 4) | (b2 >> 4);
    const c3 = ((b2 & 15) << 2) | (b3 >> 6);
    const c4 = b3 & 63;

    result += chars.charAt(c1) + chars.charAt(c2) +
              (i + 1 < len ? chars.charAt(c3) : '=') +
              (i + 2 < len ? chars.charAt(c4) : '=');
  }
  return result;
}

// Helper: Base64 to Uint8Array
export function base64ToUint8Array(base64) {
  if (!base64) return new Uint8Array(0);
  // Remove padding and whitespaces
  const cleaned = base64.replace(/=+$/, '').replace(/\s/g, '');
  const len = cleaned.length;
  const bufferLength = base64.length * 0.75;
  
  let p = 0;
  if (base64[base64.length - 1] === '=') {
    p++;
    if (base64[base64.length - 2] === '=') {
      p++;
    }
  }

  const bytes = new Uint8Array(bufferLength - p);
  let idx = 0;
  for (let i = 0; i < len; i += 4) {
    const c1 = chars.indexOf(cleaned[i] || 'A');
    const c2 = chars.indexOf(cleaned[i + 1] || 'A');
    const c3 = i + 2 < len ? chars.indexOf(cleaned[i + 2] || 'A') : 0;
    const c4 = i + 3 < len ? chars.indexOf(cleaned[i + 3] || 'A') : 0;

    const b1 = (c1 << 2) | (c2 >> 4);
    const b2 = ((c2 & 15) << 4) | (c3 >> 2);
    const b3 = ((c3 & 3) << 6) | c4;

    if (idx < bytes.length) bytes[idx++] = b1;
    if (idx < bytes.length) bytes[idx++] = b2;
    if (idx < bytes.length) bytes[idx++] = b3;
  }
  return bytes;
}

// Helper: String to UTF-8 Uint8Array
export function stringToUint8Array(str) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  const utf8 = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 
                0x80 | (charcode & 0x3f));
    }
    else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 
                0x80 | ((charcode >> 6) & 0x3f), 
                0x80 | (charcode & 0x3f));
    }
    else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(0xf0 | (charcode >> 18), 
                0x80 | ((charcode >> 12) & 0x3f), 
                0x80 | ((charcode >> 6) & 0x3f), 
                0x80 | (charcode & 0x3f));
    }
  }
  return new Uint8Array(utf8);
}

// Helper: UTF-8 Uint8Array to String
export function uint8ArrayToString(array) {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(array);
  }
  let out = "";
  const len = array.length;
  let i = 0;
  while (i < len) {
    const c = array[i++];
    let char2, char3;
    switch (c >> 4) {
      case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
        out += String.fromCharCode(c);
        break;
      case 12: case 13:
        char2 = array[i++];
        out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
        break;
      case 14:
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode(((c & 0x0F) << 12) |
                       ((char2 & 0x3F) << 6) |
                       ((char3 & 0x3F) << 0));
        break;
    }
  }
  return out;
}

/**
 * Generates a new Curve25519 keypair for E2EE messaging (NaCl Box).
 * Returns Base64 strings.
 */
export function generateE2EEKeyPair() {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: uint8ArrayToBase64(keyPair.publicKey),
    secretKey: uint8ArrayToBase64(keyPair.secretKey),
  };
}

/**
 * Encrypts plaintext using the recipient's public key and sender's secret key.
 * Returns Base64 strings for ciphertext and nonce.
 */
export function encryptMessage(text, recipientPublicKeyBase64, senderSecretKeyBase64) {
  try {
    const messageBytes = stringToUint8Array(text);
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const recipientPublicKeyBytes = base64ToUint8Array(recipientPublicKeyBase64);
    const senderSecretKeyBytes = base64ToUint8Array(senderSecretKeyBase64);

    const encryptedBytes = nacl.box(
      messageBytes,
      nonce,
      recipientPublicKeyBytes,
      senderSecretKeyBytes
    );

    return {
      ciphertext: uint8ArrayToBase64(encryptedBytes),
      nonce: uint8ArrayToBase64(nonce)
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt message: ' + error.message);
  }
}

/**
 * Decrypts ciphertext using the sender's public key and recipient's secret key.
 * Returns the decrypted plaintext.
 */
export function decryptMessage(ciphertextBase64, nonceBase64, senderPublicKeyBase64, recipientSecretKeyBase64) {
  try {
    const encryptedBytes = base64ToUint8Array(ciphertextBase64);
    const nonceBytes = base64ToUint8Array(nonceBase64);
    const senderPublicKeyBytes = base64ToUint8Array(senderPublicKeyBase64);
    const recipientSecretKeyBytes = base64ToUint8Array(recipientSecretKeyBase64);

    const decryptedBytes = nacl.box.open(
      encryptedBytes,
      nonceBytes,
      senderPublicKeyBytes,
      recipientSecretKeyBytes
    );

    if (!decryptedBytes) {
      throw new Error('Decryption returned null (decryption failed or message was tampered with)');
    }

    return uint8ArrayToString(decryptedBytes);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '[Decryption failed: Key mismatch or corrupted data]';
  }
}
