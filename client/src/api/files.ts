// Uploads encrypted blobs and downloads them back.

import apiClient from "./client";

//Upload an encrypted blob, get back a fileId
export async function uploadEncryptedFile(
  encryptedData: ArrayBuffer,
): Promise<string> {
  // Wrap the encrypted bytes in a multipart form
  const formData = new FormData();
  const blob = new Blob([encryptedData], { type: "application/octet-stream" });
  formData.append("file", blob, "encrypted.bin");

  const response = await apiClient.post("/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data.fileId;
}

//Download an encrypted blob by fileId
export async function downloadEncryptedFile(
  fileId: string,
): Promise<ArrayBuffer> {
  const response = await apiClient.get(`/files/${fileId}`, {
    responseType: "arraybuffer", // get raw bytes, not JSON
  });
  return response.data as ArrayBuffer;
}
