/*
 * PixelBoard — Global Gallery Context
 * - IndexedDB persistence for gallery images, grid size, and API key
 * - Images stored as data URLs for persistence (blob URLs don't survive reload)
 * - Lazy API key validation (validated on first real conversion, not upfront)
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type {
  GalleryImage,
  GridSize,
  ConvertedPhoto,
  PromptHistoryItem,
} from "@/lib/types";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { idbGet, idbSet, idbRemove } from "@/lib/idb";

const STORAGE_KEYS = {
  images: "pixelboard-images",
  gridSize: "pixelboard-grid-size",
  apiKey: "pixelboard-api-key",
  promptHistory: "pixelboard-prompt-history",
  stats: "pixelboard-stats",
  convertedPhotos: "pixelboard-converted-photos",
};

const MAX_PROMPT_HISTORY = 50;

interface PersistentStats {
  totalConverted: number;
  totalSuccess: number;
}

interface GalleryContextType {
  // Gallery state
  images: GalleryImage[];
  gridSize: GridSize;
  setGridSize: (size: GridSize) => void;
  addImages: (urls: { url: string; name: string }[]) => void;
  addImageFiles: (files: File[]) => Promise<void>;
  removeImage: (id: string) => void;
  removeImages: (ids: string[]) => void;
  reorderImages: (fromIndex: number, toIndex: number) => void;
  clearGallery: () => void;

  // Converted photos (from batch conversion)
  convertedPhotos: ConvertedPhoto[];
  setConvertedPhotos: (
    photos: ConvertedPhoto[] | ((prev: ConvertedPhoto[]) => ConvertedPhoto[])
  ) => void;
  transferToGallery: (photoIds: string[]) => void;
  transferAllToGallery: () => void;

  // API Key — lazy validation (just save, validated on first real use)
  apiKey: string;
  setApiKey: (key: string) => void;

  // Prompt history & favorites
  promptHistory: PromptHistoryItem[];
  addPromptToHistory: (text: string) => void;
  togglePromptFavorite: (id: string) => void;
  removePromptFromHistory: (id: string) => void;

  // Cumulative conversion stats (persisted across sessions)
  stats: PersistentStats;
  recordConversion: (success: number, failed: number) => void;
}

const GalleryContext = createContext<GalleryContextType | null>(null);

// Helper: convert File to data URL for persistence
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function GalleryProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [gridSize, setGridSizeState] = useState<GridSize>(3);
  const [convertedPhotos, setConvertedPhotos] = useState<ConvertedPhoto[]>([]);
  const [apiKey, setApiKeyState] = useState<string>("");
  const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>([]);
  const [stats, setStats] = useState<PersistentStats>({
    totalConverted: 0,
    totalSuccess: 0,
  });

  // Load all persisted data from IndexedDB on mount
  useEffect(() => {
    Promise.all([
      idbGet<GalleryImage[]>(STORAGE_KEYS.images, []),
      idbGet<number>(STORAGE_KEYS.gridSize, 3),
      idbGet<ConvertedPhoto[]>(STORAGE_KEYS.convertedPhotos, []),
      idbGet<string>(STORAGE_KEYS.apiKey, ""),
      idbGet<PromptHistoryItem[]>(STORAGE_KEYS.promptHistory, []),
      idbGet<PersistentStats>(STORAGE_KEYS.stats, {
        totalConverted: 0,
        totalSuccess: 0,
      }),
    ])
      .then(([imgs, gs, photos, key, history, st]) => {
        setImages(imgs);
        setGridSizeState(([2, 3, 4].includes(gs) ? gs : 3) as GridSize);
        // originalPreview is a blob URL — it dies on page reload, so clear it
        setConvertedPhotos(photos.map((p) => ({ ...p, originalPreview: "" })));
        setApiKeyState(key);
        setPromptHistory(history);
        setStats(st);
      })
      .catch(() => {
        // IDB unavailable — start with defaults
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  // Debounced save for images
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageWarnedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await idbSet(STORAGE_KEYS.images, images);
        storageWarnedRef.current = false;
      } catch {
        if (!storageWarnedRef.current) {
          storageWarnedRef.current = true;
          toast.error(
            "Storage full — some photos may not be saved after reload. Try removing unused images.",
            { id: "storage-full", duration: 6000 }
          );
        }
      }
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [images, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    idbSet(STORAGE_KEYS.gridSize, gridSize);
  }, [gridSize, isLoaded]);

  // Debounced save for converted photos — only persist done/error, strip blob URLs
  const convertedSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isLoaded) return;
    if (convertedSaveRef.current) clearTimeout(convertedSaveRef.current);
    convertedSaveRef.current = setTimeout(() => {
      const persistable = convertedPhotos
        .filter((p) => p.status === "done" || p.status === "error")
        .map((p) => ({ ...p, originalPreview: "" }));
      idbSet(STORAGE_KEYS.convertedPhotos, persistable);
    }, 1000);
    return () => {
      if (convertedSaveRef.current) clearTimeout(convertedSaveRef.current);
    };
  }, [convertedPhotos, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    idbSet(STORAGE_KEYS.stats, stats);
  }, [stats, isLoaded]);

  const recordConversion = useCallback((success: number, failed: number) => {
    if (success === 0 && failed === 0) return;
    setStats((prev) => ({
      totalConverted: prev.totalConverted + success + failed,
      totalSuccess: prev.totalSuccess + success,
    }));
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    idbSet(STORAGE_KEYS.promptHistory, promptHistory);
  }, [promptHistory, isLoaded]);

  const addPromptToHistory = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPromptHistory((prev) => {
      const existing = prev.find(
        (p) => p.text.toLowerCase() === trimmed.toLowerCase()
      );
      if (existing) {
        return prev.map((p) =>
          p.id === existing.id
            ? { ...p, usedAt: Date.now(), useCount: p.useCount + 1 }
            : p
        );
      }
      const newItem: PromptHistoryItem = {
        id: nanoid(),
        text: trimmed,
        usedAt: Date.now(),
        useCount: 1,
        isFavorite: false,
      };
      const updated = [newItem, ...prev];
      if (updated.length > MAX_PROMPT_HISTORY) {
        const favorites = updated.filter((p) => p.isFavorite);
        const nonFavorites = updated.filter((p) => !p.isFavorite);
        return [
          ...favorites,
          ...nonFavorites.slice(0, MAX_PROMPT_HISTORY - favorites.length),
        ];
      }
      return updated;
    });
  }, []);

  const togglePromptFavorite = useCallback((id: string) => {
    setPromptHistory((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p))
    );
  }, []);

  const removePromptFromHistory = useCallback((id: string) => {
    setPromptHistory((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const setGridSize = useCallback((size: GridSize) => {
    setGridSizeState(size);
  }, []);

  const handleSetApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    if (key) {
      idbSet(STORAGE_KEYS.apiKey, key);
    } else {
      idbRemove(STORAGE_KEYS.apiKey);
    }
  }, []);

  // Add images from URLs (already loaded — e.g. converted results)
  const addImages = useCallback((urls: { url: string; name: string }[]) => {
    const newImages: GalleryImage[] = urls.map(({ url, name }) => ({
      id: nanoid(),
      url,
      name,
      addedAt: Date.now(),
    }));
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  // Add images from File objects — converts to data URLs for persistence
  const addImageFiles = useCallback(async (files: File[]) => {
    const newImages: GalleryImage[] = [];
    for (const file of files) {
      try {
        const dataUrl = await fileToDataUrl(file);
        newImages.push({
          id: nanoid(),
          url: dataUrl,
          name: file.name,
          addedAt: Date.now(),
        });
      } catch {
        console.warn("Failed to read file:", file.name);
      }
    }
    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages]);
    }
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const removeImages = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setImages((prev) => prev.filter((img) => !idSet.has(img.id)));
  }, []);

  const reorderImages = useCallback((fromIndex: number, toIndex: number) => {
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const clearGallery = useCallback(() => {
    setImages([]);
  }, []);

  const transferToGallery = useCallback((photoIds: string[]) => {
    setConvertedPhotos((prev) => {
      const toTransfer = prev.filter(
        (p) => photoIds.includes(p.id) && p.status === "done"
      );
      const newImages: GalleryImage[] = toTransfer.map((p) => ({
        id: nanoid(),
        url: p.convertedUrl,
        name: p.originalName + " (converted)",
        addedAt: Date.now(),
      }));
      setImages((prevImages) => [...prevImages, ...newImages]);
      return prev;
    });
  }, []);

  const transferAllToGallery = useCallback(() => {
    setConvertedPhotos((prev) => {
      const done = prev.filter((p) => p.status === "done");
      const newImages: GalleryImage[] = done.map((p) => ({
        id: nanoid(),
        url: p.convertedUrl,
        name: p.originalName + " (converted)",
        addedAt: Date.now(),
      }));
      setImages((prevImages) => [...prevImages, ...newImages]);
      return prev;
    });
  }, []);

  return (
    <GalleryContext.Provider
      value={{
        images,
        gridSize,
        setGridSize,
        addImages,
        addImageFiles,
        removeImage,
        removeImages,
        reorderImages,
        clearGallery,
        convertedPhotos,
        setConvertedPhotos,
        transferToGallery,
        transferAllToGallery,
        apiKey,
        setApiKey: handleSetApiKey,
        promptHistory,
        addPromptToHistory,
        togglePromptFavorite,
        removePromptFromHistory,
        stats,
        recordConversion,
      }}
    >
      {children}
    </GalleryContext.Provider>
  );
}

export function useGallery() {
  const ctx = useContext(GalleryContext);
  if (!ctx) throw new Error("useGallery must be used within GalleryProvider");
  return ctx;
}
