import { expo } from "@better-auth/expo";
import { createPrismaClient } from "@the-right-party/db";
import { env, googleAuthConfigured } from "@the-right-party/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

export function createAuth() {
  const prisma = createPrismaClient();
  const production = env.NODE_ENV === "production";

  return betterAuth({
    appName: "Acquaintance Afterparty",
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    trustedOrigins: [env.CORS_ORIGIN, "the-right-party://", "exp://", "http://localhost:8081"],
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: googleAuthConfigured()
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID!,
            clientSecret: env.GOOGLE_CLIENT_SECRET!,
            prompt: "select_account",
          },
        }
      : undefined,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: production ? "none" : "lax",
        secure: production,
        httpOnly: true,
      },
    },
    plugins: [expo()],
  });
}

export const auth = createAuth();
