/* 
 * PixelBoard — Global Gallery Context
 * - localStorage persistence for gallery images, grid size, and API key
 * - Images stored as data URLs for persistence (blob URLs don't survive reload)
 * - Lazy API key validation (validated on first real conversion, not upfront)
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { GalleryImage, GridSize, ConvertedPhoto, PromptHistoryItem } from "@/lib/types";
import { nanoid } from "nanoid";

const STORAGE_KEYS = {
  images: "pixelboard-images",
  gridSize: "pixelboard-grid-size",
  apiKey: "pixelboard-api-key",
  promptHistory: "pixelboard-prompt-history",
  convertedPhotos: "pixelboard-converted-photos",
};

const MAX_PROMPT_HISTORY = 50;

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
  setConvertedPhotos: (photos: ConvertedPhoto[] | ((prev: ConvertedPhoto[]) => ConvertedPhoto[])) => void;
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

// Helper: safe JSON parse from localStorage
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// Helper: safe JSON write to localStorage
function saveToStorage(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("localStorage write failed:", e);
  }
}

export function GalleryProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage
  const [images, setImages] = useState<GalleryImage[]>(() =>
    loadFromStorage<GalleryImage[]>(STORAGE_KEYS.images, [])
  );
  const [gridSize, setGridSizeState] = useState<GridSize>(() => {
    const stored = loadFromStorage<number>(STORAGE_KEYS.gridSize, 3);
    return ([2, 3, 4].includes(stored) ? stored : 3) as GridSize;
  });
  const [convertedPhotos, setConvertedPhotos] = useState<ConvertedPhoto[]>(() =>
    loadFromStorage<ConvertedPhoto[]>(STORAGE_KEYS.convertedPhotos, [])
  );
  const [apiKey, setApiKeyState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.apiKey) || "";
    } catch {
      return "";
    }
  });
  const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>(() =>
    loadFromStorage<PromptHistoryItem[]>(STORAGE_KEYS.promptHistory, [])
  );

  // Persist prompt history
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.promptHistory, promptHistory);
  }, [promptHistory]);

  const addPromptToHistory = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPromptHistory(prev => {
      const existing = prev.find(p => p.text.toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        // Update existing entry
        return prev.map(p =>
          p.id === existing.id
            ? { ...p, usedAt: Date.now(), useCount: p.useCount + 1 }
            : p
        );
      }
      // Add new entry, cap at MAX_PROMPT_HISTORY
      const newItem: PromptHistoryItem = {
        id: nanoid(),
        text: trimmed,
        usedAt: Date.now(),
        useCount: 1,
        isFavorite: false,
      };
      const updated = [newItem, ...prev];
      // Remove oldest non-favorites if over limit
      if (updated.length > MAX_PROMPT_HISTORY) {
        const favorites = updated.filter(p => p.isFavorite);
        const nonFavorites = updated.filter(p => !p.isFavorite);
        return [...favorites, ...nonFavorites.slice(0, MAX_PROMPT_HISTORY - favorites.length)];
      }
      return updated;
    });
  }, []);

  const togglePromptFavorite = useCallback((id: string) => {
    setPromptHistory(prev =>
      prev.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p)
    );
  }, []);

  const removePromptFromHistory = useCallback((id: string) => {
    setPromptHistory(prev => prev.filter(p => p.id !== id));
  }, []);

  // Debounced save for images (avoid writing on every tiny change)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist images to localStorage (debounced)
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToStorage(STORAGE_KEYS.images, images);
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [images]);

  // Persist grid size immediately
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.gridSize, gridSize);
  }, [gridSize]);

  // Persist converted photos (debounced — they can contain large base64 data)
  const convertedSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (convertedSaveRef.current) clearTimeout(convertedSaveRef.current);
    convertedSaveRef.current = setTimeout(() => {
      // Only persist completed or errored photos (not in-progress ones)
      const persistable = convertedPhotos.filter(p => p.status === 'done' || p.status === 'error');
      saveToStorage(STORAGE_KEYS.convertedPhotos, persistable);
    }, 1000);
    return () => {
      if (convertedSaveRef.current) clearTimeout(convertedSaveRef.current);
    };
  }, [convertedPhotos]);

  const setGridSize = useCallback((size: GridSize) => {
    setGridSizeState(size);
  }, []);

  const handleSetApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    try {
      if (key) {
        localStorage.setItem(STORAGE_KEYS.apiKey, key);
      } else {
        localStorage.removeItem(STORAGE_KEYS.apiKey);
      }
    } catch { /* ignore */ }
  }, []);

  // Add images from URLs (already loaded — e.g. converted results)
  const addImages = useCallback((urls: { url: string; name: string }[]) => {
    const newImages: GalleryImage[] = urls.map(({ url, name }) => ({
      id: nanoid(),
      url,
      name,
      addedAt: Date.now(),
    }));
    setImages(prev => [...prev, ...newImages]);
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
      setImages(prev => [...prev, ...newImages]);
    }
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const removeImages = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setImages(prev => prev.filter(img => !idSet.has(img.id)));
  }, []);

  const reorderImages = useCallback((fromIndex: number, toIndex: number) => {
    setImages(prev => {
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
    setConvertedPhotos(prev => {
      const toTransfer = prev.filter(p => photoIds.includes(p.id) && p.status === 'done');
      const newImages: GalleryImage[] = toTransfer.map(p => ({
        id: nanoid(),
        url: p.convertedUrl,
        name: p.originalName + " (converted)",
        addedAt: Date.now(),
      }));
      setImages(prevImages => [...prevImages, ...newImages]);
      return prev;
    });
  }, []);

  const transferAllToGallery = useCallback(() => {
    setConvertedPhotos(prev => {
      const done = prev.filter(p => p.status === 'done');
      const newImages: GalleryImage[] = done.map(p => ({
        id: nanoid(),
        url: p.convertedUrl,
        name: p.originalName + " (converted)",
        addedAt: Date.now(),
      }));
      setImages(prevImages => [...prevImages, ...newImages]);
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
