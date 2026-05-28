// The server ONLY ever sees EncryptedMessage.
// DecryptedMessage only ever lives in browser memory.



// Represents one message as stored in PostgreSQL and transmitted over WebSocket
export interface EncryptedMessage{
    id?:string;
    encryptedPayload:string;
    encryptedKey :string;
    iv:string;
    senderId:string;
    recipientId:string;
    createdAt?:string;

}


// what the browser holds AFTER decrypting an EncryptedMessage
export interface DecryptedMessage{
   id:string;
   plaintext:string;           //actual readable txt message never travel over the network
   senderId:string;
   recipientId:string;
   timestamp:string;
}



// what the client emits via WebSocket when sending a message
export interface SendMessagePayload{
    encryptedPayload:string;
    encryptedKey :string;
    iv:string;
    recipientId:string;
}


//  there is NO "content", "body", or "text" field in
// EncryptedMessage. This is intentional — the TypeScript type
// itself enforces the zero-knowledge constraint.
// If a developer accidentally adds a plaintext field, the
// compiler will catch it immediately.

