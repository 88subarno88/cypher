// A simple in-memory cache mapping fileId -> local blob URL.
// When the SENDER uploads a file, they keep the original plaintext
// bytes here as a blob URL. The sender's message (which comes back
// from the server encrypted-for-the-recipient) can then look up its
// own viewable copy by fileId — no decrypt needed, and no duplicate
// message in the store.
 
const cache: Record<string, string> = {};
 
export function setLocalFile(fileId: string, url: string) {
  cache[fileId] = url;
}
 
export function getLocalFile(fileId: string): string | undefined {
  return cache[fileId];
}