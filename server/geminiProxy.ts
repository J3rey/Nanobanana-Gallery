/**
 * Gemini Image Generation/Editing Proxy
 *
 * Proxies requests to the Google Gemini API (Google AI Studio) from the backend.
 * Uses the Gemini generateContent endpoint with responseModalities: ["TEXT", "IMAGE"]
 * to perform image editing (image + text prompt → new image).
 *
 * This is a synchronous API — a single POST returns the generated image
 * as base64 inline data. No polling required.
 *
 * Key resolution order:
 *   1. User-supplied key (sent per-request, never stored server-side)
 *   2. Server default key from GEMINI_DEFAULT_API_KEY env var
 * The effective key is never returned to the client.
 */

import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
// No S3 dependency — images returned as base64 data URLs

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Default model — Nano Banana 2 (fast, good quality)
const DEFAULT_MODEL = "gemini-2.5-flash-image";

// ── Router ────────────────────────────────────────────────────────────

export const geminiRouter = router({
  /**
   * Generate / edit an image via Gemini's generateContent endpoint.
   *
   * For image editing: sends the user's image + text prompt.
   * For text-to-image: sends just the text prompt (no image).
   *
   * Returns the generated image as a base64 data URL (no S3 dependency).
   */
  generate: publicProcedure
    .input(
      z.object({
        apiKey: z.string().optional(),
        prompt: z.string().min(1, "Prompt is required"),
        imageBase64: z.string().optional(),
        imageMimeType: z.string().default("image/jpeg"),
        model: z.string().default(DEFAULT_MODEL),
      }),
    )
    .mutation(async ({ input }) => {
      const { prompt, imageBase64, imageMimeType, model } = input;

      // Resolve the effective API key — user key takes precedence over server default
      let effectiveKey: string;
      if (input.apiKey && input.apiKey.trim().length > 0) {
        const trimmed = input.apiKey.trim();
        // Basic format check: Google API keys start with "AIza" and are ~39 chars
        if (!/^AIza[A-Za-z0-9_-]{30,}$/.test(trimmed)) {
          return {
            ok: false,
            status: 400,
            data: { message: "Invalid API key format. Gemini keys should start with 'AIza'." },
          };
        }
        effectiveKey = trimmed;
      } else {
        const serverKey = process.env.GEMINI_DEFAULT_API_KEY;
        if (!serverKey) {
          return {
            ok: false,
            status: 400,
            data: {
              message:
                "No API key available. Please provide your own Gemini API key or contact the server administrator.",
            },
          };
        }
        effectiveKey = serverKey;
      }

      try {
        // Build the parts array
        const parts: Array<Record<string, unknown>> = [
          { text: prompt },
        ];

        // If an image is provided, add it as inlineData for editing
        if (imageBase64) {
          parts.push({
            inlineData: {
              mimeType: imageMimeType,
              data: imageBase64,
            },
          });
        }

        // Build the request body
        const requestBody = {
          contents: [
            {
              parts,
            },
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        };

        const url = `${GEMINI_API_BASE}/models/${model}:generateContent`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120_000);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": effectiveKey,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle HTTP errors
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData?.error?.message || `Gemini API error (${response.status})`;

          return {
            ok: false,
            status: response.status,
            data: {
              message: errorMessage,
              ...errorData,
            },
          };
        }

        // Parse the response
        const data = await response.json();
        const candidates = data?.candidates;

        if (!candidates || candidates.length === 0) {
          // Check for prompt feedback (safety block)
          const blockReason = data?.promptFeedback?.blockReason;
          if (blockReason) {
            return {
              ok: false,
              status: 400,
              data: {
                message: `Request blocked by safety filter: ${blockReason}. Try a different prompt.`,
              },
            };
          }
          return {
            ok: false,
            status: 500,
            data: { message: "No candidates returned from Gemini" },
          };
        }

        // Extract image parts from the response
        const responseParts = candidates[0]?.content?.parts || [];
        const imageResults: Array<{ url: string }> = [];
        let textResponse = "";

        for (const part of responseParts) {
          if (part.text) {
            textResponse += part.text;
          }
          if (part.inlineData?.data) {
            // Return as base64 data URL — no S3 upload needed
            const mimeType = part.inlineData.mimeType || "image/png";
            const dataUrl = `data:${mimeType};base64,${part.inlineData.data}`;
            imageResults.push({ url: dataUrl });
          }
        }

        if (imageResults.length === 0) {
          // Gemini returned text only (no image generated)
          return {
            ok: false,
            status: 422,
            data: {
              message:
                textResponse ||
                "Gemini did not generate an image. Try rephrasing your prompt to explicitly request image output.",
            },
          };
        }

        return {
          ok: true,
          status: 200,
          data: {
            images: imageResults,
            text: textResponse,
          },
        };
      } catch (err: any) {
        if (err instanceof TRPCError) throw err;

        if (err.name === "AbortError") {
          return {
            ok: false,
            status: 408,
            data: { message: "Request to Gemini API timed out. Try again." },
          };
        }

        return {
          ok: false,
          status: 500,
          data: { message: err.message || "Unknown error during image generation" },
        };
      }
    }),

  /**
   * Returns whether the server has a default Gemini API key configured.
   * Never exposes the key value — only a boolean.
   */
  serverKeyStatus: publicProcedure.query(() => {
    return { configured: !!process.env.GEMINI_DEFAULT_API_KEY };
  }),

  /**
   * Validate a Gemini API key by making a lightweight test request.
   * We send a simple text-only request to check if the key is valid.
   */
  validateKey: publicProcedure
    .input(
      z.object({
        apiKey: z.string().min(1, "API key is required"),
      }),
    )
    .mutation(async ({ input }) => {
      const { apiKey } = input;

      try {
        const url = `${GEMINI_API_BASE}/models/${DEFAULT_MODEL}:generateContent`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15_000);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: "Say hello in one word." }],
              },
            ],
            generationConfig: {
              maxOutputTokens: 10,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 400) {
          // 400 can mean invalid key format or bad request — check the error
          const errorData = await response.json().catch(() => ({}));
          const msg = errorData?.error?.message || "";
          if (msg.toLowerCase().includes("api key")) {
            return { valid: false, error: "Invalid API key. Please check and try again." };
          }
          // Other 400 errors mean the key itself is valid
          return { valid: true };
        }

        if (response.status === 401 || response.status === 403) {
          return { valid: false, error: "Invalid API key. Please check and try again." };
        }

        if (response.status === 429) {
          // Rate limited but key is valid
          return { valid: true, error: "Key is valid but you are being rate limited. Wait a moment." };
        }

        if (response.ok) {
          return { valid: true };
        }

        return {
          valid: false,
          error: `Unexpected response (${response.status}). Key may still be valid.`,
        };
      } catch (err: any) {
        if (err.name === "AbortError") {
          return { valid: false, error: "Validation request timed out. Try again." };
        }
        return { valid: false, error: `Connection error: ${err.message}` };
      }
    }),
});
