/* 
 * NanoBanana Gallery — Global Gallery Context
 * Manages gallery images, grid size, and converted photos across pages
 * Design: Aero Glass — iOS-inspired glassmorphism
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { GalleryImage, GridSize, ConvertedPhoto } from "@/lib/types";
import { nanoid } from "nanoid";

interface GalleryContextType {
  // Gallery state
  images: GalleryImage[];
  gridSize: GridSize;
  setGridSize: (size: GridSize) => void;
  addImages: (urls: { url: string; name: string }[]) => void;
  removeImage: (id: string) => void;
  reorderImages: (fromIndex: number, toIndex: number) => void;
  clearGallery: () => void;
  
  // Converted photos (from batch conversion)
  convertedPhotos: ConvertedPhoto[];
  setConvertedPhotos: (photos: ConvertedPhoto[] | ((prev: ConvertedPhoto[]) => ConvertedPhoto[])) => void;
  transferToGallery: (photoIds: string[]) => void;
  transferAllToGallery: () => void;
  
  // API Key
  apiKey: string;
  setApiKey: (key: string) => void;
}

const GalleryContext = createContext<GalleryContextType | null>(null);

export function GalleryProvider({ children }: { children: ReactNode }) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [gridSize, setGridSize] = useState<GridSize>(3);
  const [convertedPhotos, setConvertedPhotos] = useState<ConvertedPhoto[]>([]);
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem("nanobanana-api-key") || "";
    } catch {
      return "";
    }
  });

  const handleSetApiKey = useCallback((key: string) => {
    setApiKey(key);
    try {
      localStorage.setItem("nanobanana-api-key", key);
    } catch { /* ignore */ }
  }, []);

  const addImages = useCallback((urls: { url: string; name: string }[]) => {
    const newImages: GalleryImage[] = urls.map(({ url, name }) => ({
      id: nanoid(),
      url,
      name,
      addedAt: Date.now(),
    }));
    setImages(prev => [...prev, ...newImages]);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
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
        removeImage,
        reorderImages,
        clearGallery,
        convertedPhotos,
        setConvertedPhotos,
        transferToGallery,
        transferAllToGallery,
        apiKey,
        setApiKey: handleSetApiKey,
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
