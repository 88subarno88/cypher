//Converts raw bytes -> Base64 string ; ciphertext(arraybuffer) and json(string)
//btoa (binary string -> Base64); atob()->reverse
//FIX: now accepts BOTH ArrayBuffer and Uint8Array so salt/iv encode the
//exact same bytes that were used during key derivation.
export function toBase64(buffer: ArrayBuffer | Uint8Array): string {
  // If already a Uint8Array, use it directly (encodes exact bytes including
  // any byteOffset). Otherwise wrap the ArrayBuffer in a Uint8Array view.
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let normalSt = "";
  for (let i = 0; i < bytes.length; i++) {
    normalSt += String.fromCharCode(bytes[i]);
  }
  const encodedSt = btoa(normalSt);
  return encodedSt;
}

//Base64 string -> raw bytes ; reverse of above
export function fromBase64(base64: string): ArrayBuffer {
  const decodedSt = atob(base64);
  const bytes = new Uint8Array(decodedSt.length);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = decodedSt.charCodeAt(i);
  }
  return bytes.buffer;
}

//raw bytes -> hex string.
export function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// JS string -> ArrayBuffer
export function stringToBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

// ArrayBuffer -> JS string
export function bufferToString(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}
