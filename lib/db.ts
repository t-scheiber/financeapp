import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { PrismaClient } from "./generated/prisma";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { DEMO_USER_ID, readSessionToken } from "./demo/config";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  demoPrisma: PrismaClient | undefined;
};

const defaultDatabaseUrl = "file:./data/finance.db";
const defaultDemoDatabaseUrl = "file:./data/demo.db";

// Build time or missing env - placeholder path so generate/build completes
const databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl;
// The demo account reads a separate SQLite file, so demo data and real data
// never share a table. scripts/migrate-demo-db.mjs creates its schema.
const demoDatabaseUrl =
  process.env.DEMO_DATABASE_URL || defaultDemoDatabaseUrl;

const createClient = (url: string) =>
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
    adapter: new PrismaBetterSqlite3({ url }),
  });

/**
 * The real database. Better Auth (users, sessions, accounts) always uses this
 * client, including for the demo user's sessions.
 */
export const basePrisma = globalForPrisma.prisma ?? createClient(databaseUrl);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;

/** The demo database. Only the demo seeding code should call this directly. */
export function getDemoPrisma(): PrismaClient {
  if (!globalForPrisma.demoPrisma) {
    globalForPrisma.demoPrisma = createClient(demoDatabaseUrl);
  }
  return globalForPrisma.demoPrisma;
}

/**
 * True if the session token belongs to the demo user. Expiry is ignored on
 * purpose: a stale demo tab must keep reading the demo database, never the
 * real one. Better Auth still rejects the expired session itself.
 */
export async function isDemoSessionToken(token: string): Promise<boolean> {
  const session = await basePrisma.session.findUnique({
    where: { token },
    select: { userId: true },
  });
  return session?.userId === DEMO_USER_ID;
}

/**
 * True if the current request is signed in as the demo user. Returns false
 * outside a request (scripts, build) and for anonymous requests.
 */
export async function isDemoRequest(): Promise<boolean> {
  let cookieStore: Awaited<ReturnType<typeof cookies>>;
  try {
    cookieStore = await cookies();
  } catch (error) {
    // Let Next.js handle its own control-flow errors (dynamic rendering).
    unstable_rethrow(error);
    return false;
  }
  const token = readSessionToken((name) => cookieStore.get(name)?.value);
  if (!token) return false;
  return isDemoSessionToken(token);
}

async function resolveClient(): Promise<PrismaClient> {
  return (await isDemoRequest()) ? getDemoPrisma() : basePrisma;
}

// Client methods that touch data and must follow the request's database.
const REQUEST_SCOPED_CLIENT_METHODS = new Set([
  "$transaction",
  "$queryRaw",
  "$queryRawUnsafe",
  "$executeRaw",
  "$executeRawUnsafe",
]);

type AnyFunction = (...args: unknown[]) => unknown;

const delegateCache = new Map<string, unknown>();

function scopedDelegate(model: string, delegate: object): unknown {
  const cached = delegateCache.get(model);
  if (cached) return cached;
  const proxy = new Proxy(delegate, {
    get(target, method) {
      if (typeof method !== "string") return Reflect.get(target, method);
      return async (...args: unknown[]) => {
        const client = (await resolveClient()) as unknown as Record<
          string,
          Record<string, AnyFunction>
        >;
        return client[model][method](...args);
      };
    },
  });
  delegateCache.set(model, proxy);
  return proxy;
}

/**
 * The client used by pages, API routes and services. Each query runs against
 * the real database, or against the demo database when the request carries a
 * demo session. Query methods return plain promises, so the array form of
 * $transaction is not supported (the code base does not use it).
 */
export const prisma = new Proxy(basePrisma, {
  get(target, prop) {
    const value: unknown = Reflect.get(target, prop);
    if (typeof prop !== "string" || prop.startsWith("_")) return value;
    if (prop.startsWith("$")) {
      if (REQUEST_SCOPED_CLIENT_METHODS.has(prop)) {
        return async (...args: unknown[]) => {
          const client = (await resolveClient()) as unknown as Record<
            string,
            AnyFunction
          >;
          return client[prop](...args);
        };
      }
      return typeof value === "function"
        ? (value as AnyFunction).bind(target)
        : value;
    }
    if (value && typeof value === "object") {
      return scopedDelegate(prop, value);
    }
    return value;
  },
}) as PrismaClient;
