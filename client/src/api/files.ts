// Uploads encrypted blobs and downloads them back.

import apiClient from "./client";

// Upload an encrypted blob, get back a fileId
export async function uploadEncryptedFile(
  encryptedData: ArrayBuffer,
): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([encryptedData], { type: "application/octet-stream" });
  formData.append("file", blob, "encrypted.bin");

  const response = await apiClient.post("/files/upload", formData, {
    // Multipart needs a boundary parameter that the browser generates
    // automatically — but only if we let it set the header itself.
    // Setting Content-Type to undefined removes the apiClient default
    // ("application/json") so the browser injects the correct
    // "multipart/form-data; boundary=..." header.
    headers: { "Content-Type": undefined },
    transformRequest: (data) => data, // don't let axios touch the FormData
  });

  return response.data.fileId;
}

// Download an encrypted blob by fileId
export async function downloadEncryptedFile(
  fileId: string,
): Promise<ArrayBuffer> {
  const response = await apiClient.get(`/files/${fileId}`, {
    responseType: "arraybuffer", // get raw bytes, not JSON
  });
  return response.data as ArrayBuffer;
}
