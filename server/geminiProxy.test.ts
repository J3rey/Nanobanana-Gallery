import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to mock the storage module that geminiProxy imports.
// The key is that vi.mock is hoisted, so it runs before imports.
vi.mock("./storage.ts", () => ({
  storagePut: vi.fn(async (key: string) => ({
    key,
    url: `/manus-storage/${key}`,
  })),
}));

import { geminiRouter } from "./geminiProxy";
import { createCallerFactory } from "./_core/trpc";

const createCaller = createCallerFactory(geminiRouter);
const caller = createCaller({} as any);

// Helper to create a mock fetch response
function mockFetchResponse(status: number, body: any) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

describe("geminiRouter", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── validateKey ──────────────────────────────────────────────────

  describe("validateKey", () => {
    it("returns valid: true when Gemini responds 200", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, {
          candidates: [{ content: { parts: [{ text: "Hello" }] } }],
        }),
      );

      const result = await caller.validateKey({ apiKey: "test-key-123" });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("returns valid: false for 401 Unauthorized", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(401, { error: { message: "Invalid API key" } }),
      );

      const result = await caller.validateKey({ apiKey: "bad-key" });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid API key");
    });

    it("returns valid: false for 403 Forbidden", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(403, { error: { message: "Forbidden" } }),
      );

      const result = await caller.validateKey({ apiKey: "forbidden-key" });
      expect(result.valid).toBe(false);
    });

    it("returns valid: true for 429 rate limit (key is valid)", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(429, { error: { message: "Rate limited" } }),
      );

      const result = await caller.validateKey({ apiKey: "rate-limited-key" });
      expect(result.valid).toBe(true);
      expect(result.error).toContain("rate limited");
    });

    it("returns valid: false for 400 with API key error message", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(400, { error: { message: "API key not valid. Please pass a valid API key." } }),
      );

      const result = await caller.validateKey({ apiKey: "malformed-key" });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid API key");
    });

    it("returns valid: true for 400 without API key error (other bad request)", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(400, { error: { message: "Invalid request body" } }),
      );

      const result = await caller.validateKey({ apiKey: "valid-key" });
      expect(result.valid).toBe(true);
    });
  });

  // ── generate ─────────────────────────────────────────────────────

  describe("generate", () => {
    it("returns ok: true with image URL on successful generation", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, {
          candidates: [
            {
              content: {
                parts: [
                  { text: "Here is your edited image" },
                  {
                    inlineData: {
                      mimeType: "image/png",
                      data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    },
                  },
                ],
              },
            },
          ],
        }),
      );

      const result = await caller.generate({
        apiKey: "test-key",
        prompt: "Make it watercolor",
        imageBase64: "dGVzdA==",
        imageMimeType: "image/jpeg",
      });

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data.images).toHaveLength(1);
      expect(result.data.images[0].url).toContain("data:image/png;base64,");
    });

    it("returns ok: false for 401 auth error", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(401, { error: { message: "Invalid API key" } }),
      );

      const result = await caller.generate({
        apiKey: "bad-key",
        prompt: "Edit this",
        imageBase64: "dGVzdA==",
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe(401);
    });

    it("returns ok: false for 429 rate limit", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(429, { error: { message: "Rate limit exceeded" } }),
      );

      const result = await caller.generate({
        apiKey: "test-key",
        prompt: "Edit this",
        imageBase64: "dGVzdA==",
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe(429);
    });

    it("returns ok: false with message when no image is generated (text-only response)", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, {
          candidates: [
            {
              content: {
                parts: [{ text: "I cannot generate that image" }],
              },
            },
          ],
        }),
      );

      const result = await caller.generate({
        apiKey: "test-key",
        prompt: "Something that fails",
        imageBase64: "dGVzdA==",
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe(422);
      expect(result.data.message).toContain("cannot generate");
    });

    it("returns ok: false when response is blocked by safety filter", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, {
          candidates: [],
          promptFeedback: { blockReason: "SAFETY" },
        }),
      );

      const result = await caller.generate({
        apiKey: "test-key",
        prompt: "Blocked prompt",
        imageBase64: "dGVzdA==",
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
      expect(result.data.message).toContain("safety filter");
    });

    it("sends text-only request when no imageBase64 is provided", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, {
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: "image/png",
                      data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    },
                  },
                ],
              },
            },
          ],
        }),
      );
      globalThis.fetch = mockFetch;

      const result = await caller.generate({
        apiKey: "test-key",
        prompt: "Generate a sunset",
      });

      expect(result.ok).toBe(true);

      // Verify the request body only has text part, no inline_data
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.contents[0].parts).toHaveLength(1);
      expect(callBody.contents[0].parts[0].text).toBe("Generate a sunset");
    });

    it("includes inlineData when imageBase64 is provided", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        mockFetchResponse(200, {
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: "image/png",
                      data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    },
                  },
                ],
              },
            },
          ],
        }),
      );
      globalThis.fetch = mockFetch;

      await caller.generate({
        apiKey: "test-key",
        prompt: "Make it watercolor",
        imageBase64: "dGVzdA==",
        imageMimeType: "image/jpeg",
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.contents[0].parts).toHaveLength(2);
      expect(callBody.contents[0].parts[1].inlineData.mimeType).toBe("image/jpeg");
      expect(callBody.contents[0].parts[1].inlineData.data).toBe("dGVzdA==");
    });
  });
});
