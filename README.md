# Cypher

A full-stack, end-to-end encrypted messaging app. Messages and files are encrypted in the browser before they ever leave the device, so the server only ever stores ciphertext — it cannot read a single message. This is a **zero-knowledge** design: even with full database access, the server operator sees nothing but encrypted blobs.

## What it does

- **Real-time messaging** over WebSockets between registered users
- **End-to-end encryption** using a hybrid scheme: a fresh AES-256-GCM key encrypts each message/file, and that key is wrapped with the recipient's RSA-OAEP 4096 public key
- **Encrypted file sharing** — images, video, and any document up to 50 MB. Files are encrypted client-side, uploaded as ciphertext, and decrypted only on the recipient's device. Images and videos render inline; other files download.
- **Password-derived key storage** — your private key is encrypted with a key derived from your password (PBKDF2, 600k iterations) and stored locally in IndexedDB. The server never sees your private key.
- **Secure auth** — JWT access/refresh tokens with refresh-token rotation, a Redis token blocklist on logout, login rate limiting, Helmet security headers, and strict CORS.
- **Persistent conversations** — chat history and contacts are rebuilt from the database on login.

## How the encryption works

```
SEND:  message/file -> fresh AES-256-GCM key encrypts the content
                     -> AES key wrapped with recipient's RSA public key
                     -> server stores only ciphertext
RECV:  recipient unwraps the AES key with their RSA private key
                     -> decrypts the content locally
```

The server is a relay and a ciphertext store. It never holds any private key, so it can never decrypt anything.

## Tech stack

**Frontend:** React 18, TypeScript, Vite, Zustand, Web Crypto API
**Backend:** Node, Express, Socket.io, Prisma, PostgreSQL, Redis
**Crypto:** RSA-OAEP 4096 + AES-256-GCM hybrid, PBKDF2 (600k iterations)

The project is a monorepo with three workspaces: `client/` (React app), `server/` (API + WebSocket server), and `shared/` (shared TypeScript types).

## Prerequisites

- Node.js 18+
- Docker and Docker Compose (for PostgreSQL and Redis)

## Running locally

You'll need three terminals.

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

Wait for `Server running on port 3000`. You can verify it with:

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

## Trying it out

Because encryption keys are stored per-browser (in IndexedDB), test two accounts in **separate browser contexts**:

1. Register one account in a normal window
2. Register a second account in an **incognito window** (or a different browser)
3. Search for the other user, start a chat, and send messages and files

Each account's private key lives only on its own device/browser — exactly like Signal or WhatsApp. Logging into a fresh browser means starting without prior keys, which is the encryption working as designed.

## Security notes

- Private keys never leave the browser and are stored encrypted at rest.
- The server stores only ciphertext, both for messages and files.
- Passwords are hashed with bcrypt; the same error is returned for "wrong password" and "user not found" to avoid leaking which usernames exist.
- File contents are fully encrypted; filenames and MIME types are stored as metadata so the UI can render them.
- Local file storage (`/uploads`) is used for encrypted blobs and is swappable for cloud storage (e.g. S3) in production.

## License

For portfolio and educational use.
