import prisma from "../lib/prisma";

export async function storePublicKey(
  userId: string,
  publicKeyB64: string,
): Promise<void> {
  // Updates the user's public key in the database.
  // This is useful for key rotation or if a user generates a new device key.
  await prisma.user.update({
    where: { id: userId },
    data: { publicKeyB64 },
  });
}

export async function fetchPublicKey(userId: string): Promise<string> {
  // Find the user by ID and select ONLY the publicKeyB64 field
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { publicKeyB64: true },
  });

  // Handle user not found
  if (!user) {
    // This exact string is caught by routes/keys.ts to return a 404 status
    throw new Error("User not found");
  }

  // Return the key
  return user.publicKeyB64;
}
