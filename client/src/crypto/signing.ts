import { toBase64, fromBase64, stringToBuffer } from "../utils/arraybuffer";


export async function signMessage(
  message: string,
  privateKey: CryptoKey,
): Promise<string> {
  const arrybuf = stringToBuffer(message);
  return toBase64(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-384" }, privateKey, arrybuf),
  );
}


export async function verifyMessage(
     message: string,
     signatureBase64: string,
     publicKey: CryptoKey
   ): Promise<boolean>{
    const arrybuf=stringToBuffer(message);
    const sigbuf=fromBase64(signatureBase64);
    return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-384" },publicKey,sigbuf,arrybuf);


   }
