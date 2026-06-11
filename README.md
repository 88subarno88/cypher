# Cipher

A full-stack, end-to-end encrypted messaging app. Messages and files are encrypted in the browser before they leave the device, so the server only ever stores ciphertext — it cannot read a single message. This is a **zero-knowledge** design: even with full database access, the server operator sees only encrypted blobs.

This README focuses on _how the system is put together_, not just what it does. If you only read one section, read [Architecture](#architecture).

---

## Table of contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
  - [System overview](#system-overview)
  - [Workspaces](#workspaces)
  - [Data model](#data-model)
- [How the encryption works](#how-the-encryption-works)
  - [Registration: generating keys](#registration-generating-keys)
  - [Sending a message](#sending-a-message)
  - [Receiving a message](#receiving-a-message)
  - [File encryption](#file-encryption)
  - [Where the private key lives](#where-the-private-key-lives)
- [Authentication and security](#authentication-and-security)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Running locally](#running-locally)
- [Trying it out](#trying-it-out)
- [Security notes](#security-notes)
- [Limitations and production notes](#limitations-and-production-notes)
- [License](#license)

---

## What it does

- **Real-time messaging** over WebSockets between registered users.
- **End-to-end encryption** using a hybrid scheme: a fresh AES-256-GCM key encrypts each message or file, and that key is wrapped with the recipient's RSA-OAEP 4096 public key.
- **Encrypted file sharing** — images, video, and documents up to 50 MB. Files are encrypted client-side, uploaded as ciphertext, and decrypted only on the recipient's device. Images and videos render inline; other files download.
- **Password-derived key storage** — the private key is encrypted with a key derived from the user's password (PBKDF2, 600k iterations) and stored locally in IndexedDB. The server never sees the private key.
- **Secure auth** — JWT access/refresh tokens with refresh-token rotation, a Redis token blocklist on logout, login rate limiting, Helmet security headers, and strict CORS.
- **Persistent conversations** — chat history and contacts are rebuilt from the database on login.

---

## Architecture

### System overview

The app is a single-page React client talking to a Node backend over two channels: a REST API for request/response work (auth, history, file upload/download) and a Socket.io WebSocket for live message delivery. All cryptography happens in the browser via the Web Crypto API. The server stores and relays ciphertext but holds no keys capable of decrypting it.

```mermaid
flowchart LR
    subgraph Browser["Client — browser"]
        UI["React + Zustand UI"]
        WC["Web Crypto API<br/>(encrypt / decrypt / key-wrap)"]
        IDB[("IndexedDB<br/>encrypted private key")]
        UI <--> WC
        WC <--> IDB
    end

    subgraph Backend["Server — Node"]
        API["Express REST API"]
        WS["Socket.io gateway"]
        AUTH["Auth / JWT service"]
    end

    PG[("PostgreSQL<br/>users · ciphertext messages · file metadata")]
    RD[("Redis<br/>refresh-token blocklist · rate limits")]
    FS["/uploads<br/>encrypted file blobs"]

    UI -->|"HTTPS REST"| API
    UI <-->|"WebSocket"| WS
    API --> AUTH
    API --> PG
    API --> FS
    AUTH --> RD
    WS --> PG
```

**Two paths, on purpose:**

- **REST (request/response):** registration, login/refresh/logout, user search, conversation list, message history, and encrypted file upload/download. These are one-off operations where a normal HTTP round trip fits.
- **WebSocket (push):** delivering a new message to an online recipient the moment it arrives, without polling. The socket also carries the encrypted payload — the server just forwards it.

Both paths only ever move ciphertext plus the wrapped AES key and IV. The plaintext exists only inside the two browsers.

### Workspaces

The project is a monorepo with three workspaces:

| Workspace | Responsibility                                                                 | Key pieces                                                                                                            |
| --------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `client/` | React SPA. All UI, all cryptography, local key storage.                        | Web Crypto wrappers, Zustand stores (`authStore`, `chatStore`, `cryptoStore`), Socket.io client, IndexedDB key store. |
| `server/` | REST API + WebSocket relay + persistence. Never decrypts.                      | Express routes, Socket.io handlers, Prisma data access, JWT auth, Redis blocklist.                                    |
| `shared/` | TypeScript types shared by client and server so the wire format stays in sync. | Message, user, and auth type definitions.                                                                             |

Keeping the wire-format types in `shared/` means the encrypted message shape (ciphertext, wrapped key, IV, file metadata) is defined once and imported by both sides, so the client and server can't drift out of agreement.

### Data model

At a high level the database holds three things: who the users are (and their **public** keys), the ciphertext of every message, and metadata for encrypted files. Nothing here can decrypt a message on its own.

```mermaid
erDiagram
    USER ||--o{ MESSAGE : sends
    USER ||--o{ MESSAGE : receives

    USER {
        string id PK
        string username
        string publicKey "RSA-OAEP 4096, base64"
        string passwordHash "bcrypt"
    }

    MESSAGE {
        string id PK
        string senderId FK
        string recipientId FK
        string ciphertext "AES-256-GCM encrypted body"
        string encryptedKey "AES key wrapped with recipient public key"
        string iv "AES-GCM nonce"
        string messageType "text | file"
        string fileId "for file messages"
        string fileName "metadata only"
        string mimeType "metadata only"
        datetime createdAt
    }
```

Important detail: the database stores the recipient's **public** key, never any private key. The `encryptedKey` column is the per-message AES key after it has been wrapped with that public key — only the recipient's private key (which lives in their browser) can unwrap it.

---

## How the encryption works

Every message and file uses the same hybrid pattern: symmetric AES for the bulk content (fast), asymmetric RSA to safely deliver the AES key to the recipient (no shared secret needed).

### Registration: generating keys

```
1. Browser generates a 4096-bit RSA-OAEP key pair.
2. Browser derives an encryption key from the user's password (PBKDF2, 600k iterations).
3. The RSA *private* key is encrypted with that derived key and stored in IndexedDB.
4. Only the RSA *public* key (and username) is sent to the server.
```

The server learns the username and the public key. It never receives the private key or the password-derived key.

### Sending a message

```mermaid
sequenceDiagram
    participant A as Alice (sender)
    participant S as Server
    participant B as Bob (recipient)

    Note over A: Generate a fresh random AES-256-GCM key
    Note over A: Encrypt the message body with that AES key
    A->>S: Request Bob's RSA public key
    S-->>A: Bob's public key
    Note over A: Wrap the AES key with Bob's public key (RSA-OAEP)
    A->>S: { ciphertext, wrappedKey, iv, type }
    S->>S: Store ciphertext (cannot decrypt)
    S-->>B: Relay { ciphertext, wrappedKey, iv, type }
    Note over B: Unwrap AES key with private RSA key
    Note over B: Decrypt body with the AES key
```

A new AES key is generated for every message, so compromising one message's key reveals nothing about the others.

### Receiving a message

The recipient's browser unwraps the per-message AES key using its RSA private key (loaded into memory after login), then decrypts the ciphertext with that AES key and its IV. History works the same way: the server returns stored ciphertext, and the client decrypts each item locally. Messages that can't be decrypted (for example, encrypted for a key the current browser doesn't hold) are skipped rather than crashing the view.

### File encryption

Files follow the same flow as messages, with the file bytes as the payload:

```
1. Read file into an ArrayBuffer in the browser.
2. Encrypt the bytes with a fresh AES-256-GCM key.
3. Upload the ciphertext blob to the server (stored under /uploads).
4. Wrap the AES key with the recipient's public key and send it alongside
   the file's id, name, and MIME type as a "file" message.
5. Recipient downloads the ciphertext, unwraps the key, decrypts locally,
   and the UI renders images/video inline or offers a download.
```

Filenames and MIME types are stored as metadata so the UI knows how to display a file; the file _contents_ are never stored or transmitted in the clear.

### Where the private key lives

The private key only ever exists:

- **At rest:** encrypted in IndexedDB, locked behind the password-derived key.
- **In use:** decrypted into memory after a successful login, for as long as the session lasts.

It is never sent to the server. Logging in on a new browser means that browser has no private key yet — which is the encryption working as intended, the same way Signal or WhatsApp tie keys to a device.

---

## Authentication and security

```mermaid
flowchart TD
    L["Login: username + password"] --> V{"bcrypt verify"}
    V -->|"fail"| E["Generic error<br/>(same for wrong password and unknown user)"]
    V -->|"ok"| T["Issue access token (short-lived)<br/>+ refresh token (rotated)"]
    T --> U["Client unlocks private key<br/>from IndexedDB with password"]
    LO["Logout"] --> BL["Refresh token added to<br/>Redis blocklist"]
```

- **Access + refresh tokens:** short-lived access token for API calls; refresh token to get a new one. Refresh tokens are rotated on use.
- **Redis blocklist:** on logout, the refresh token is blocklisted in Redis so it can't be reused.
- **Rate limiting:** repeated login attempts are throttled to slow brute-force attacks.
- **Helmet + CORS:** security headers are set, and CORS is restricted to the configured client origin.
- **No username enumeration:** "wrong password" and "user not found" return the same error, so an attacker can't probe which usernames exist.

---

## Tech stack

**Frontend:** React 18, TypeScript, Vite, Zustand, Web Crypto API, Socket.io client
**Backend:** Node, Express, Socket.io, Prisma, PostgreSQL, Redis
**Crypto:** RSA-OAEP 4096 + AES-256-GCM hybrid, PBKDF2 (600k iterations), bcrypt for passwords

---

## Project structure

```
.
├── client/                 # React SPA (UI + all cryptography)
│   ├── src/
│   │   ├── api/            # REST clients (auth, messages, files)
│   │   ├── crypto/        # Web Crypto wrappers, file encryption
│   │   ├── hooks/         # useKeyPair, useEncryptedChat
│   │   ├── socket/        # Socket.io client + event handlers
│   │   ├── store/         # Zustand: authStore, chatStore, cryptoStore
│   │   └── pages/         # register, login, chat, settings
│   └── ...
├── server/                 # Express API + Socket.io relay
│   ├── prisma/            # schema + migrations
│   ├── src/
│   │   ├── routes/        # auth, messages, files, users
│   │   ├── socket/        # WebSocket handlers
│   │   └── index.ts       # entry point
│   └── ...
├── shared/                 # TypeScript types shared by client + server
├── docker-compose.yml      # PostgreSQL + Redis
└── README.md
```

---

## Running locally

You'll need three terminals.

### Prerequisites

- Node.js 18+
- Docker and Docker Compose (for PostgreSQL and Redis)

### 1. Start the databases

```bash
docker compose up -d
```

Wait until PostgreSQL reports it's ready to accept connections.

### 2. Set up environment variables

Create a `.env` file in the project root (and copy it into `server/`):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/cipher_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-access-token-secret
JWT_REFRESH_SECRET=your-refresh-token-secret
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
```

### 3. Start the backend

```bash
cd server
npm install
npx prisma migrate dev    # set up the database schema
npx tsx src/index.ts
```

Wait for `Server running on port 3000`. Verify it with:

```bash
curl http://localhost:3000/health   # → {"status":"ok"}
```

### 4. Start the frontend

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173.

---

## Trying it out

Because encryption keys are stored per-browser (in IndexedDB), test two accounts in **separate browser contexts**:

1. Register one account in a normal window.
2. Register a second account in an **incognito window** (or a different browser).
3. Search for the other user, start a chat, and send messages and files.

Each account's private key lives only on its own device/browser — exactly like Signal or WhatsApp. Logging into a fresh browser means starting without prior keys, which is the encryption working as designed.

---

## Security notes

- Private keys never leave the browser and are stored encrypted at rest.
- The server stores only ciphertext, for both messages and files.
- Passwords are hashed with bcrypt; the same error is returned for "wrong password" and "user not found" to avoid leaking which usernames exist.
- File contents are fully encrypted; filenames and MIME types are stored as metadata so the UI can render them.
- Local file storage (`/uploads`) holds encrypted blobs and is swappable for cloud storage (e.g. S3) in production.

---

## Limitations and production notes

This is a portfolio/educational project. A few things to be aware of before treating it as production-grade:

- **No forward secrecy or ratcheting.** Each message uses a fresh AES key, but the system does not implement a Double Ratchet (as in the Signal Protocol). A compromised long-term RSA private key would expose past messages that were wrapped to it.
- **No multi-device sync.** Keys are tied to a single browser. There is no key-transfer or device-linking flow yet.
- **Trust on first use.** Public keys are fetched from the server and not verified out-of-band, so the design assumes the server delivers honest public keys. Adding key fingerprints/verification would close this gap.
- **Local file storage.** `/uploads` is fine for development; production should use durable object storage and lifecycle policies.
- **Metadata is visible to the server.** The server can see who talks to whom and when, plus filenames and MIME types, even though it cannot read content.

---

## License

For portfolio and educational use.
