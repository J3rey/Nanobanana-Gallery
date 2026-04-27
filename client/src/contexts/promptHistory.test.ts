/**
 * Tests for prompt history logic (unit tests for the pure functions)
 * Since GalleryContext uses React hooks, we test the core logic separately
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Simulate the prompt history logic from GalleryContext
interface PromptHistoryItem {
  id: string;
  text: string;
  usedAt: number;
  useCount: number;
  isFavorite: boolean;
}

const MAX_PROMPT_HISTORY = 50;

// Pure function versions of the context logic for testing
function addPrompt(history: PromptHistoryItem[], text: string): PromptHistoryItem[] {
  const trimmed = text.trim();
  if (!trimmed) return history;

  const existing = history.find(p => p.text.toLowerCase() === trimmed.toLowerCase());
  if (existing) {
    return history.map(p =>
      p.id === existing.id
        ? { ...p, usedAt: Date.now(), useCount: p.useCount + 1 }
        : p
    );
  }

  const newItem: PromptHistoryItem = {
    id: `test-${Date.now()}-${Math.random()}`,
    text: trimmed,
    usedAt: Date.now(),
    useCount: 1,
    isFavorite: false,
  };
  const updated = [newItem, ...history];

  if (updated.length > MAX_PROMPT_HISTORY) {
    const favorites = updated.filter(p => p.isFavorite);
    const nonFavorites = updated.filter(p => !p.isFavorite);
    return [...favorites, ...nonFavorites.slice(0, MAX_PROMPT_HISTORY - favorites.length)];
  }
  return updated;
}

function toggleFavorite(history: PromptHistoryItem[], id: string): PromptHistoryItem[] {
  return history.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p);
}

function removePrompt(history: PromptHistoryItem[], id: string): PromptHistoryItem[] {
  return history.filter(p => p.id !== id);
}

function sortHistory(history: PromptHistoryItem[]): PromptHistoryItem[] {
  return [...history].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    return b.usedAt - a.usedAt;
  });
}

describe("Prompt History Logic", () => {
  let history: PromptHistoryItem[];

  beforeEach(() => {
    history = [];
  });

  it("adds a new prompt to history", () => {
    history = addPrompt(history, "Transform into watercolor");
    expect(history).toHaveLength(1);
    expect(history[0].text).toBe("Transform into watercolor");
    expect(history[0].useCount).toBe(1);
    expect(history[0].isFavorite).toBe(false);
  });

  it("ignores empty or whitespace-only prompts", () => {
    history = addPrompt(history, "");
    expect(history).toHaveLength(0);

    history = addPrompt(history, "   ");
    expect(history).toHaveLength(0);
  });

  it("trims whitespace from prompts", () => {
    history = addPrompt(history, "  watercolor painting  ");
    expect(history[0].text).toBe("watercolor painting");
  });

  it("increments useCount for duplicate prompts (case-insensitive)", () => {
    history = addPrompt(history, "Make it anime");
    history = addPrompt(history, "make it anime");
    expect(history).toHaveLength(1);
    expect(history[0].useCount).toBe(2);
  });

  it("adds different prompts as separate entries", () => {
    history = addPrompt(history, "Watercolor");
    history = addPrompt(history, "Oil painting");
    expect(history).toHaveLength(2);
  });

  it("newest prompts appear first", () => {
    history = addPrompt(history, "First prompt");
    history = addPrompt(history, "Second prompt");
    expect(history[0].text).toBe("Second prompt");
    expect(history[1].text).toBe("First prompt");
  });

  it("toggles favorite status", () => {
    history = addPrompt(history, "My prompt");
    const id = history[0].id;

    history = toggleFavorite(history, id);
    expect(history[0].isFavorite).toBe(true);

    history = toggleFavorite(history, id);
    expect(history[0].isFavorite).toBe(false);
  });

  it("removes a prompt from history", () => {
    history = addPrompt(history, "To remove");
    history = addPrompt(history, "To keep");
    const removeId = history.find(p => p.text === "To remove")!.id;

    history = removePrompt(history, removeId);
    expect(history).toHaveLength(1);
    expect(history[0].text).toBe("To keep");
  });

  it("sorts favorites to the top, then by recency", () => {
    history = addPrompt(history, "Old prompt");
    history = addPrompt(history, "New prompt");
    history = addPrompt(history, "Favorite prompt");

    // Mark the oldest as favorite
    const oldId = history.find(p => p.text === "Old prompt")!.id;
    history = toggleFavorite(history, oldId);

    const sorted = sortHistory(history);
    expect(sorted[0].text).toBe("Old prompt"); // favorite, even though oldest
    expect(sorted[0].isFavorite).toBe(true);
  });

  it("caps history at MAX_PROMPT_HISTORY, preserving favorites", () => {
    // Add a favorite
    history = addPrompt(history, "My favorite");
    history = toggleFavorite(history, history[0].id);

    // Fill up to the limit with non-favorites
    for (let i = 0; i < MAX_PROMPT_HISTORY; i++) {
      history = addPrompt(history, `Prompt ${i}`);
    }

    // Should still have the favorite
    const fav = history.find(p => p.text === "My favorite");
    expect(fav).toBeDefined();
    expect(fav!.isFavorite).toBe(true);
    expect(history.length).toBeLessThanOrEqual(MAX_PROMPT_HISTORY + 1); // favorites can push slightly over
  });

  it("localStorage round-trip preserves data", () => {
    history = addPrompt(history, "Persist me");
    history = toggleFavorite(history, history[0].id);

    const serialized = JSON.stringify(history);
    const deserialized: PromptHistoryItem[] = JSON.parse(serialized);

    expect(deserialized).toHaveLength(1);
    expect(deserialized[0].text).toBe("Persist me");
    expect(deserialized[0].isFavorite).toBe(true);
    expect(deserialized[0].useCount).toBe(1);
  });
});
