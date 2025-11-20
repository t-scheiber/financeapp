import { prisma } from "@/lib/db";
import { decryptApiKey, encryptApiKey } from "./encryption";

export interface UserApiKey {
  id: string;
  userId: string;
  provider: "alpha_vantage" | "newsapi" | "huggingface";
  key: string; // encrypted
  isValid: boolean;
  lastTested?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKeyValidationResult {
  isValid: boolean;
  message: string;
  quota?: {
    used: number;
    limit: number;
    resetDate?: Date;
  };
}

/**
 * API Provider configurations and limits
 */
const PROVIDER_CONFIGS = {
  alpha_vantage: {
    freeTierLimit: 500, // calls per day
    freeTierPerMinute: 5,
    testEndpoint:
      "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey=",
  },
  newsapi: {
    freeTierLimit: 100, // requests per day
    testEndpoint: "https://newsapi.org/v2/everything?q=apple&apiKey=",
  },
  huggingface: {
    freeTierLimit: -1, // unlimited
    testEndpoint:
      "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english",
  },
};

/**
 * Get user's API key for a provider (decrypted)
 */
export async function getUserApiKey(
  userId: string,
  provider: UserApiKey["provider"],
): Promise<string | null> {
  try {
    const apiKeyRecord = await prisma.userApiKey.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });

    if (!apiKeyRecord) {
      return null;
    }

    return decryptApiKey(apiKeyRecord.key);
  } catch {
    return null;
  }
}

/**
 * Set user's API key for a provider (encrypted)
 */
export async function setUserApiKey(
  userId: string,
  provider: UserApiKey["provider"],
  apiKey: string,
): Promise<boolean> {
  try {
    // Encrypt the API key before storing
    const encryptedKey = encryptApiKey(apiKey);

    await prisma.userApiKey.upsert({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
      update: {
        key: encryptedKey,
        isValid: false, // Will be validated when tested
        lastTested: null,
      },
      create: {
        userId,
        provider,
        key: encryptedKey,
        isValid: false,
      },
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Test API key validity and update validation status
 */
export async function validateApiKey(
  userId: string,
  provider: UserApiKey["provider"],
): Promise<ApiKeyValidationResult> {
  try {
    const apiKey = await getUserApiKey(userId, provider);

    if (!apiKey) {
      return {
        isValid: false,
        message: "No API key found",
      };
    }

    const config = PROVIDER_CONFIGS[provider];

    // Test the API key
    let isValid = false;
    let validationMessage: string | null = null;
    let lastStatus: number | null = null;

    switch (provider) {
      case "alpha_vantage":
        try {
          const response = await fetch(`${config.testEndpoint}${apiKey}`);
          if (response.ok) {
            isValid = true;
          } else if (response.status === 429) {
            isValid = true; // Valid but rate limited
          }
        } catch {
          // Invalid key or network error
        }
        break;

      case "newsapi":
        try {
          const response = await fetch(
            `${config.testEndpoint}${apiKey}&pageSize=1`,
          );
          if (response.ok) {
            const data = await response.json();
            if (data.status === "ok") {
              isValid = true;
            }
          }
        } catch {
          // Invalid key or network error
        }
        break;

      case "huggingface":
        try {
          const profileResponse = await fetch(
            "https://huggingface.co/api/whoami-v2",
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
            },
          );
          lastStatus = profileResponse.status;

          if (profileResponse.ok) {
            const profile = (await profileResponse
              .json()
              .catch(() => null)) as { name?: string } | null;

            isValid = true;
            validationMessage = profile?.name
              ? `API key is valid for Hugging Face user ${profile.name}.`
              : "API key is valid.";
            break;
          }

          if (
            profileResponse.status === 401 ||
            profileResponse.status === 403
          ) {
            validationMessage = "Authentication failed with Hugging Face.";
            isValid = false;
            break;
          }
        } catch {
          validationMessage ??=
            "Unable to reach Hugging Face user profile API.";
        }

        try {
          const response = await fetch(config.testEndpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: "Test message",
              options: { wait_for_model: false },
            }),
          });
          lastStatus = response.status;

          if (response.status === 401 || response.status === 403) {
            validationMessage = "Authentication failed with Hugging Face.";
            isValid = false;
            break;
          }

          if (response.status === 429) {
            validationMessage =
              "API key is valid but rate limited by Hugging Face.";
            isValid = true;
            break;
          }

          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;

          if (response.ok) {
            isValid = true;
            validationMessage =
              data?.error ??
              "API key accepted. The model may still be warming up.";
          } else if (
            (response.status === 503 || response.status === 500) &&
            typeof data?.error === "string" &&
            data.error.toLowerCase().includes("loading")
          ) {
            isValid = true;
            validationMessage = data.error;
          } else if (
            typeof data?.error === "string" &&
            /invalid|unauthoriz(ed|ation)/i.test(data.error)
          ) {
            validationMessage = data.error;
            isValid = false;
          } else {
            validationMessage =
              data?.error ?? "Unable to verify Hugging Face API key.";
          }
        } catch {
          validationMessage ??= "Unable to reach Hugging Face inference API.";
        }
        break;
    }

    // Update the database record
    await prisma.userApiKey.update({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
      data: {
        isValid,
        lastTested: new Date(),
      },
    });

    return {
      isValid,
      message:
        validationMessage ??
        (isValid
          ? "API key is valid"
          : lastStatus
            ? `Unable to verify Hugging Face API key (status ${lastStatus}).`
            : "API key is invalid or expired"),
      quota:
        config.freeTierLimit > 0
          ? {
              used: 0, // Would need to track actual usage
              limit: config.freeTierLimit,
            }
          : undefined,
    };
  } catch {
    return {
      isValid: false,
      message: "Failed to validate API key",
    };
  }
}

/**
 * Get all API keys for a user (encrypted)
 */
export async function getUserApiKeys(userId: string): Promise<UserApiKey[]> {
  return prisma.userApiKey.findMany({
    where: { userId },
    orderBy: { provider: "asc" },
  }) as Promise<UserApiKey[]>;
}

/**
 * Delete user's API key for a provider
 */
export async function deleteUserApiKey(
  userId: string,
  provider: UserApiKey["provider"],
): Promise<boolean> {
  try {
    await prisma.userApiKey.delete({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if user has valid API keys for required providers
 */
export async function getApiKeyStatus(
  userId: string,
  requiredProviders: UserApiKey["provider"][] = [
    "alpha_vantage",
    "newsapi",
    "huggingface",
  ],
): Promise<{
  alphaVantage: boolean;
  newsApi: boolean;
  huggingFace: boolean;
  hasAll: boolean;
  missingProviders: UserApiKey["provider"][];
}> {
  const keys = await getUserApiKeys(userId);

  const alphaVantage = keys.some(
    (k) => k.provider === "alpha_vantage" && k.isValid,
  );
  const newsApi = keys.some((k) => k.provider === "newsapi" && k.isValid);
  const huggingFace = keys.some(
    (k) => k.provider === "huggingface" && k.isValid,
  );

  const missingProviders = requiredProviders.filter((provider) => {
    switch (provider) {
      case "alpha_vantage":
        return !alphaVantage;
      case "newsapi":
        return !newsApi;
      case "huggingface":
        return !huggingFace;
      default:
        return true;
    }
  });

  return {
    alphaVantage,
    newsApi,
    huggingFace,
    hasAll: missingProviders.length === 0,
    missingProviders,
  };
}
