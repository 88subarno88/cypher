export const RSA_ALGORITHM: RsaHashedKeyGenParams = {
  name: "RSA-OAEP",
  modulusLength: 4096,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};
export const AES_ALGORITHM = "AES-GCM";
export const AES_KEY_LENGTH = 256;
export const GCM_IV_LENGTH = 12; // bytes
export const PBKDF2_ITERATIONS = 600_000;
export const PBKDF2_HASH = "SHA-256";
export const SALT_LENGTH = 32; //bytes
export const ECDSA_ALGORITHM: EcKeyGenParams = {
  name: "ECDSA",
  namedCurve: "P-384",
};
export const IDB_NAME = "cipher-keys";
export const IDB_VERSION = 1;
export const IDB_STORE = "keyring";
