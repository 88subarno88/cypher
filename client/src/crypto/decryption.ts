import { AES_ALGORITHM, AES_KEY_LENGTH } from "../utils/constants";
import { fromBase64, bufferToString } from "../utils/arraybuffer";

export async function decryptMessage(
  payload: { encryptedPayload: string; encryptedKey: string; iv: string },
  privateKey: CryptoKey,
): Promise<string> {
  const arrybuf = fromBase64(payload.encryptedKey);
  const rawAesKeyBuffer = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    arrybuf,
  );
  const AesCryptoKey = await crypto.subtle.importKey(
    "raw",
    rawAesKeyBuffer,
    { name: AES_ALGORITHM },
    false,
    ["decrypt"],
  );
  const ivToArraybuf = fromBase64(payload.iv);
  const encryptedPayloadToArraybuf = fromBase64(payload.encryptedPayload);
  return bufferToString(
    await crypto.subtle.decrypt(
      { name: AES_ALGORITHM, iv: ivToArraybuf },
      AesCryptoKey,
      encryptedPayloadToArraybuf,
    ),
  );
}
