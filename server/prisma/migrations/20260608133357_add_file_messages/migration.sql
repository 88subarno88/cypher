-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "fileId" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "messageType" TEXT NOT NULL DEFAULT 'text',
ADD COLUMN     "mimeType" TEXT;
