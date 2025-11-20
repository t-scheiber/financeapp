import { prisma } from "@/lib/db";
import type { User } from "@/lib/generated/prisma";

interface EnsureUserParams {
  email: string;
  name?: string | null;
  image?: string | null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
  );
}

/**
 * Ensure a user exists for the given email.
 * Creates a new record if none exists and returns the user.
 */
export async function ensureUserByEmail({
  email,
  name,
  image,
}: EnsureUserParams): Promise<User | null> {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return existingUser;
    }

    return await prisma.user.create({
      data: {
        email,
        name: name ?? null,
        image: image ?? null,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return prisma.user.findUnique({
        where: { email },
      });
    }

    return null;
  }
}

/**
 * Get a user's ID by email. Returns null if not found.
 */
export async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return user?.id ?? null;
  } catch {
    return null;
  }
}
