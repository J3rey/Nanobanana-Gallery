/*
 * PixelBoard — Global Gallery Context
 * - localStorage persistence for gallery images, grid size, and API key
 * - Images compressed to max 1280px before storing (keeps each image ~150-300KB)
 * - Converted photos stored in sessionStorage (own quota, survives tab refresh)
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { GalleryImage, GridSize, ConvertedPhoto, PromptHistoryItem } from "@/lib/types";
import { nanoid } from "nanoid";
import { toast } from "sonner";

const STORAGE_KEYS = {
  images: "pixelboard-images",
  gridSize: "pixelboard-grid-size",
  apiKey: "pixelboard-api-key",
  promptHistory: "pixelboard-prompt-history",
  stats: "pixelboard-stats",
};

// Converted photos use sessionStorage — large blobs that would eat into
// the localStorage quota shared with gallery images. sessionStorage persists
// through page refreshes within the same browser tab.
const SESSION_KEYS = {
  convertedPhotos: "pixelboard-converted-photos",
};

const MAX_PROMPT_HISTORY = 50;

interface PersistentStats {
  totalConverted: number;
  totalSuccess: number;
}

interface GalleryContextType {
  images: GalleryImage[];
  gridSize: GridSize;
  setGridSize: (size: GridSize) => void;
  addImages: (urls: { url: string; name: string }[]) => Promise<void>;
  addImageFiles: (files: File[]) => Promise<void>;
  removeImage: (id: string) => void;
  removeImages: (ids: string[]) => void;
  reorderImages: (fromIndex: number, toIndex: number) => void;
  clearGallery: () => void;

  convertedPhotos: ConvertedPhoto[];
  setConvertedPhotos: (photos: ConvertedPhoto[] | ((prev: ConvertedPhoto[]) => ConvertedPhoto[])) => void;
  transferToGallery: (photoIds: string[]) => Promise<void>;
  transferAllToGallery: () => Promise<void>;

  apiKey: string;
  setApiKey: (key: string) => void;

  promptHistory: PromptHistoryItem[];
  addPromptToHistory: (text: string) => void;
  togglePromptFavorite: (id: string) => void;
  removePromptFromHistory: (id: string) => void;

  stats: PersistentStats;
  recordConversion: (success: number, failed: number) => void;
}

const GalleryContext = createContext<GalleryContextType | null>(null);

// Compress any image src (data URL or blob URL) to a JPEG at max 1280px.
// Keeps file size to ~150-300KB — small enough to store many in localStorage.
function compressImage(src: string, maxDim = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(src); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(src); // fallback: use original
    img.src = src;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: any): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function loadFromSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToSession(key: string, value: any): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("sessionStorage write failed:", e);
  }
}

export function GalleryProvider({ children }: { children: ReactNode }) {
  // One-time migration: remove old convertedPhotos from localStorage
  // (moved to sessionStorage to free quota for gallery images).
  (() => {
    try { localStorage.removeItem("pixelboard-converted-photos"); } catch { /* ignore */ }
  })();

  const [images, setImages] = useState<GalleryImage[]>(() =>
    loadFromStorage<GalleryImage[]>(STORAGE_KEYS.images, [])
  );
  const [gridSize, setGridSizeState] = useState<GridSize>(() => {
    const stored = loadFromStorage<number>(STORAGE_KEYS.gridSize, 3);
    return ([2, 3, 4].includes(stored) ? stored : 3) as GridSize;
  });
  const [convertedPhotos, setConvertedPhotos] = useState<ConvertedPhoto[]>(() =>
    loadFromSession<ConvertedPhoto[]>(SESSION_KEYS.convertedPhotos, [])
  );
  const [apiKey, setApiKeyState] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEYS.apiKey) || ""; } catch { return ""; }
  });
  const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>(() =>
    loadFromStorage<PromptHistoryItem[]>(STORAGE_KEYS.promptHistory, [])
  );
  const [stats, setStats] = useState<PersistentStats>(() =>
    loadFromStorage<PersistentStats>(STORAGE_KEYS.stats, { totalConverted: 0, totalSuccess: 0 })
  );

  useEffect(() => { saveToStorage(STORAGE_KEYS.stats, stats); }, [stats]);

  const recordConversion = useCallback((success: number, failed: number) => {
    if (success === 0 && failed === 0) return;
    setStats(prev => ({
      totalConverted: prev.totalConverted + success + failed,
      totalSuccess: prev.totalSuccess + success,
    }));
  }, []);

  useEffect(() => { saveToStorage(STORAGE_KEYS.promptHistory, promptHistory); }, [promptHistory]);

  const addPromptToHistory = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPromptHistory(prev => {
      const existing = prev.find(p => p.text.toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        return prev.map(p =>
          p.id === existing.id ? { ...p, usedAt: Date.now(), useCount: p.useCount + 1 } : p
        );
      }
      const newItem: PromptHistoryItem = { id: nanoid(), text: trimmed, usedAt: Date.now(), useCount: 1, isFavorite: false };
      const updated = [newItem, ...prev];
      if (updated.length > MAX_PROMPT_HISTORY) {
        const favorites = updated.filter(p => p.isFavorite);
        const nonFavorites = updated.filter(p => !p.isFavorite);
        return [...favorites, ...nonFavorites.slice(0, MAX_PROMPT_HISTORY - favorites.length)];
      }
      return updated;
    });
  }, []);

  const togglePromptFavorite = useCallback((id: string) => {
    setPromptHistory(prev => prev.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
  }, []);

  const removePromptFromHistory = useCallback((id: string) => {
    setPromptHistory(prev => prev.filter(p => p.id !== id));
  }, []);

  // Persist gallery images (debounced). Warn user if storage is full.
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageWarnedRef = useRef(false);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const ok = saveToStorage(STORAGE_KEYS.images, images);
      if (!ok && !storageWarnedRef.current) {
        storageWarnedRef.current = true;
        toast.error("Gallery storage full — photos may not survive a reload. Remove some images to free space.", {
          id: "storage-full",
          duration: 8000,
        });
      } else if (ok) {
        storageWarnedRef.current = false;
      }
    }, 500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [images]);

  useEffect(() => { saveToStorage(STORAGE_KEYS.gridSize, gridSize); }, [gridSize]);

  // Persist converted photos to sessionStorage (debounced).
  const convertedSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (convertedSaveRef.current) clearTimeout(convertedSaveRef.current);
    convertedSaveRef.current = setTimeout(() => {
      // Clear blob originalPreview URLs — they die on page reload.
      const persistable = convertedPhotos.map(p => ({ ...p, originalPreview: '' }));
      saveToSession(SESSION_KEYS.convertedPhotos, persistable);
    }, 500);
    return () => { if (convertedSaveRef.current) clearTimeout(convertedSaveRef.current); };
  }, [convertedPhotos]);

  const setGridSize = useCallback((size: GridSize) => setGridSizeState(size), []);

  const handleSetApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    try {
      if (key) localStorage.setItem(STORAGE_KEYS.apiKey, key);
      else localStorage.removeItem(STORAGE_KEYS.apiKey);
    } catch { /* ignore */ }
  }, []);

  // Compress then add images from URL strings (e.g. transferred converted results)
  const addImages = useCallback(async (urls: { url: string; name: string }[]) => {
    const newImages: GalleryImage[] = [];
    for (const { url, name } of urls) {
      const compressed = await compressImage(url);
      newImages.push({ id: nanoid(), url: compressed, name, addedAt: Date.now() });
    }
    if (newImages.length > 0) setImages(prev => [...prev, ...newImages]);
  }, []);

  // Add images from File objects — compress before storing
  const addImageFiles = useCallback(async (files: File[]) => {
    const newImages: GalleryImage[] = [];
    for (const file of files) {
      try {
        const dataUrl = await fileToDataUrl(file);
        const compressed = await compressImage(dataUrl);
        newImages.push({ id: nanoid(), url: compressed, name: file.name, addedAt: Date.now() });
      } catch {
        console.warn("Failed to read file:", file.name);
      }
    }
    if (newImages.length > 0) setImages(prev => [...prev, ...newImages]);
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

  const clearGallery = useCallback(() => setImages([]), []);

  // Transfer selected converted photos to gallery (compress each before storing)
  const transferToGallery = useCallback(async (photoIds: string[]) => {
    const toTransfer = convertedPhotos.filter(p => photoIds.includes(p.id) && p.status === 'done');
    const newImages: GalleryImage[] = [];
    for (const p of toTransfer) {
      const url = await compressImage(p.convertedUrl);
      newImages.push({ id: nanoid(), url, name: p.originalName + " (converted)", addedAt: Date.now() });
    }
    if (newImages.length > 0) setImages(prev => [...prev, ...newImages]);
  }, [convertedPhotos]);

  const transferAllToGallery = useCallback(async () => {
    const done = convertedPhotos.filter(p => p.status === 'done');
    const newImages: GalleryImage[] = [];
    for (const p of done) {
      const url = await compressImage(p.convertedUrl);
      newImages.push({ id: nanoid(), url, name: p.originalName + " (converted)", addedAt: Date.now() });
    }
    if (newImages.length > 0) setImages(prev => [...prev, ...newImages]);
  }, [convertedPhotos]);

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
