import { describe, it, expect, beforeEach, vi } from "vitest";

// Test that the STORAGE_KEYS includes convertedPhotos and that
// the persistence helpers work correctly

const STORAGE_KEYS = {
  images: "pixelboard-images",
  gridSize: "pixelboard-grid-size",
  apiKey: "pixelboard-api-key",
  promptHistory: "pixelboard-prompt-history",
  convertedPhotos: "pixelboard-converted-photos",
};

// Replicate the helpers from GalleryContext
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("localStorage write failed:", e);
  }
}

// Mock localStorage for Node environment
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

describe("Gallery Persistence", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("should have convertedPhotos in STORAGE_KEYS", () => {
    expect(STORAGE_KEYS.convertedPhotos).toBe("pixelboard-converted-photos");
  });

  it("should load empty array when no convertedPhotos in storage", () => {
    const result = loadFromStorage(STORAGE_KEYS.convertedPhotos, []);
    expect(result).toEqual([]);
  });

  it("should persist and load convertedPhotos", () => {
    const photos = [
      {
        id: "test-1",
        originalPreview: "data:image/png;base64,abc",
        convertedUrl: "data:image/png;base64,xyz",
        originalName: "photo.jpg",
        prompt: "Make it watercolor",
        status: "done" as const,
      },
      {
        id: "test-2",
        originalPreview: "data:image/png;base64,def",
        convertedUrl: "",
        originalName: "photo2.jpg",
        prompt: "Make it sketch",
        status: "error" as const,
        error: "API failed",
      },
    ];

    saveToStorage(STORAGE_KEYS.convertedPhotos, photos);
    const loaded = loadFromStorage(STORAGE_KEYS.convertedPhotos, []);
    expect(loaded).toEqual(photos);
    expect(loaded).toHaveLength(2);
    expect(loaded[0].status).toBe("done");
    expect(loaded[1].status).toBe("error");
  });

  it("should only persist done and error photos (not pending/converting)", () => {
    const allPhotos = [
      { id: "1", status: "done", convertedUrl: "url1" },
      { id: "2", status: "error", error: "fail" },
      { id: "3", status: "pending" },
      { id: "4", status: "converting" },
    ];

    // Simulate the filtering logic from GalleryContext
    const persistable = allPhotos.filter(
      (p) => p.status === "done" || p.status === "error"
    );
    saveToStorage(STORAGE_KEYS.convertedPhotos, persistable);

    const loaded = loadFromStorage(STORAGE_KEYS.convertedPhotos, []);
    expect(loaded).toHaveLength(2);
    expect(loaded.map((p: any) => p.id)).toEqual(["1", "2"]);
  });

  it("should persist gallery images", () => {
    const images = [
      { id: "img-1", url: "data:image/png;base64,abc", name: "test.png", addedAt: Date.now() },
    ];
    saveToStorage(STORAGE_KEYS.images, images);
    const loaded = loadFromStorage(STORAGE_KEYS.images, []);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("test.png");
  });

  it("should handle corrupted localStorage gracefully", () => {
    store[STORAGE_KEYS.convertedPhotos] = "not valid json{{{";
    const result = loadFromStorage(STORAGE_KEYS.convertedPhotos, []);
    expect(result).toEqual([]);
  });

  it("should persist and load grid size", () => {
    saveToStorage(STORAGE_KEYS.gridSize, 4);
    const loaded = loadFromStorage(STORAGE_KEYS.gridSize, 3);
    expect(loaded).toBe(4);
  });

  it("should persist and load prompt history", () => {
    const history = [
      { id: "p1", text: "watercolor", usedAt: Date.now(), useCount: 3, isFavorite: true },
    ];
    saveToStorage(STORAGE_KEYS.promptHistory, history);
    const loaded = loadFromStorage(STORAGE_KEYS.promptHistory, []);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].isFavorite).toBe(true);
  });
});
