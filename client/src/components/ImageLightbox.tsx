/* 
 * NanoBanana Gallery — Image Lightbox
 * Design: Aero Glass — dark overlay with frosted glass controls
 * iOS-friendly download: converts to blob and triggers via anchor
 */

import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import type { GalleryImage } from "@/lib/types";
import { toast } from "sonner";

interface ImageLightboxProps {
  images: GalleryImage[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function ImageLightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: ImageLightboxProps) {
  const current = images[currentIndex];
  const [isDownloading, setIsDownloading] = useState(false);

  const goNext = useCallback(() => {
    if (currentIndex < images.length - 1) onNavigate(currentIndex + 1);
  }, [currentIndex, images.length, onNavigate]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(currentIndex - 1);
  }, [currentIndex, onNavigate]);

  /**
   * iOS-friendly download:
   * 1. For data URLs: convert to blob first, then use blob URL
   * 2. For remote URLs: fetch as blob, then trigger download
   * 3. Fallback: open in new tab for long-press save
   */
  const handleDownload = useCallback(async () => {
    if (!current) return;
    setIsDownloading(true);

    const baseName = current.name.replace(/\.[^.]+$/, "") || "image";

    try {
      let blob: Blob;

      if (current.url.startsWith("data:")) {
        // Convert data URL to blob
        const res = await fetch(current.url);
        blob = await res.blob();
      } else {
        // Fetch remote image as blob
        const res = await fetch(current.url);
        if (!res.ok) throw new Error(`Download failed (${res.status})`);
        blob = await res.blob();
      }

      const ext = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
      const fileName = `${baseName}.${ext}`;

      // Check if we're on iOS/iPadOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

      if (isIOS) {
        // On iOS, window.open with blob URL works better than anchor download
        // Safari doesn't support the download attribute on anchor tags
        const blobUrl = URL.createObjectURL(blob);
        // Try using share API first (best iOS experience)
        if (navigator.share && navigator.canShare) {
          try {
            const file = new File([blob], fileName, { type: blob.type });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: fileName,
              });
              URL.revokeObjectURL(blobUrl);
              setIsDownloading(false);
              return;
            }
          } catch (shareErr) {
            // Share was cancelled or failed, fall through to open in new tab
            if ((shareErr as Error).name !== "AbortError") {
              console.warn("Share failed, falling back:", shareErr);
            }
          }
        }
        // Fallback: open blob in new tab — user can long-press to save
        window.open(blobUrl, "_blank");
        toast.info("Image opened — tap and hold to save to Photos");
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } else {
        // Desktop / Android: use anchor download
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      }
    } catch {
      // Last resort: open original URL in new tab
      window.open(current.url, "_blank");
      toast.info("Image opened in new tab — right-click or long-press to save");
    } finally {
      setIsDownloading(false);
    }
  }, [current]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goNext, goPrev]);

  if (!current) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center overflow-hidden"
      onClick={onClose}
    >
      {/* Top bar — counter on left, controls on right, safe from overflow */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
        {/* Counter */}
        <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-medium shrink-0">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            disabled={isDownloading}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-50"
            aria-label="Download image"
          >
            {isDownloading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Close lightbox"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image name — bottom center */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-center z-10">
        <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm text-white text-sm font-medium max-w-[80vw] truncate">
          {current.name}
        </div>
      </div>

      {/* Navigation */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}
      {currentIndex < images.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      {/* Image */}
      <AnimatePresence mode="wait">
        <motion.img
          key={current.id}
          src={current.url}
          alt={current.name}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      </AnimatePresence>
    </motion.div>
  );
}
