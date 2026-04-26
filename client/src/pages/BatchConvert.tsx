/* 
 * NanoBanana Gallery — Batch Convert Page
 * Design: Aero Glass — iOS-inspired glassmorphism
 * - Drag & drop upload zone with animated border
 * - Prompt input with style presets
 * - Progress tracking with circular indicators
 * - Results grid with transfer-to-gallery action
 */

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  Sparkles,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Images,
  Trash2,
  ArrowRight,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useGallery } from "@/contexts/GalleryContext";
import type { UploadedPhoto, ConvertedPhoto } from "@/lib/types";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import ApiKeyDialog from "@/components/ApiKeyDialog";
import { Link } from "wouter";

const STYLE_PRESETS = [
  "Transform into a watercolor painting",
  "Convert to anime style",
  "Make it look like a vintage photograph",
  "Apply oil painting effect",
  "Transform into pixel art",
  "Convert to pencil sketch",
  "Make it look cyberpunk",
  "Apply pop art style",
];

export default function BatchConvert() {
  const { apiKey, convertedPhotos, setConvertedPhotos, transferAllToGallery } = useGallery();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showApiDialog, setShowApiDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (imageFiles.length === 0) {
      toast.error("Please select image files only");
      return;
    }

    const newPhotos: UploadedPhoto[] = imageFiles.map((file) => ({
      id: nanoid(),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    }));

    setPhotos((prev) => [...prev, ...newPhotos]);
    toast.success(`Added ${imageFiles.length} photo${imageFiles.length > 1 ? "s" : ""}`);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const clearAll = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotos([]);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const convertPhotos = async () => {
    if (!apiKey) {
      setShowApiDialog(true);
      return;
    }
    if (photos.length === 0) {
      toast.error("Please upload some photos first");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Please enter a conversion prompt");
      return;
    }

    setIsConverting(true);
    setProgress(0);

    const results: ConvertedPhoto[] = photos.map((p) => ({
      id: p.id,
      originalPreview: p.preview,
      convertedUrl: "",
      originalName: p.name,
      prompt: prompt,
      status: "pending" as const,
    }));

    setConvertedPhotos(results);

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];

      // Update status to converting
      setConvertedPhotos((prev) =>
        prev.map((r) =>
          r.id === photo.id ? { ...r, status: "converting" as const } : r
        )
      );

      try {
        const base64 = await fileToBase64(photo.file);

        const response = await fetch(
          "https://api.magichour.ai/api/v1/ai-image-generator/generate",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              image_count: 1,
              style: {
                prompt: prompt,
                tool: "general",
                image: `data:${photo.file.type};base64,${base64}`,
              },
              aspect_ratio: "1:1",
              model: "nano-banana",
              name: photo.name,
              resolution: "1k",
            }),
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            errData.message || `API error: ${response.status}`
          );
        }

        const data = await response.json();
        const imageUrl =
          data?.images?.[0]?.url ||
          data?.result?.url ||
          data?.url ||
          photo.preview; // fallback to original

        setConvertedPhotos((prev) =>
          prev.map((r) =>
            r.id === photo.id
              ? { ...r, status: "done" as const, convertedUrl: imageUrl }
              : r
          )
        );
      } catch (err: any) {
        console.error("Conversion error:", err);
        setConvertedPhotos((prev) =>
          prev.map((r) =>
            r.id === photo.id
              ? {
                  ...r,
                  status: "error" as const,
                  error: err.message || "Conversion failed",
                  convertedUrl: photo.preview,
                }
              : r
          )
        );
      }

      setProgress(((i + 1) / photos.length) * 100);
    }

    setIsConverting(false);
    toast.success("Batch conversion complete!");
  };

  const doneCount = convertedPhotos.filter((p) => p.status === "done").length;
  const errorCount = convertedPhotos.filter((p) => p.status === "error").length;

  return (
    <div className="container max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 mb-2">
          Batch Convert
        </h1>
        <p className="text-slate-500 text-lg">
          Upload photos and transform them all with a single AI prompt.
        </p>
      </div>

      {/* Upload Zone */}
      <motion.div
        className={`glass rounded-3xl p-6 sm:p-8 card-shadow mb-6 transition-all ${
          isDragOver ? "ring-2 ring-blue-400 bg-blue-50/30" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        {photos.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <motion.div
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-5"
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
            >
              <Upload className="w-9 h-9 text-blue-500" />
            </motion.div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">
              Drop photos here or click to browse
            </h3>
            <p className="text-sm text-slate-400">
              Supports JPG, PNG, WebP — up to 25 photos at once
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-slate-700">
                  {photos.length} photo{photos.length > 1 ? "s" : ""} selected
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {(
                    photos.reduce((sum, p) => sum + p.size, 0) /
                    1024 /
                    1024
                  ).toFixed(1)}{" "}
                  MB
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="glass rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white/60"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Add More
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="glass rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50/50"
                  onClick={clearAll}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Clear
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              <AnimatePresence>
                {photos.map((photo) => (
                  <motion.div
                    key={photo.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative group aspect-square rounded-xl overflow-hidden"
                  >
                    <img
                      src={photo.preview}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white truncate font-medium bg-black/40 rounded px-1.5 py-0.5">
                        {photo.name}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>

      {/* Prompt & Convert */}
      <div className="glass rounded-3xl p-6 sm:p-8 card-shadow mb-6">
        <h3 className="text-base font-bold text-slate-700 mb-3">
          Conversion Prompt
        </h3>
        <div className="flex gap-3 mb-4">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe how you want to transform your photos..."
            className="h-12 rounded-xl bg-white/50 border-white/40 focus:border-blue-400 text-base"
            disabled={isConverting}
          />
          <Button
            onClick={convertPhotos}
            disabled={isConverting || photos.length === 0}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl h-12 px-6 font-semibold shadow-lg shadow-blue-500/25 shrink-0"
          >
            {isConverting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Convert
              </>
            )}
          </Button>
        </div>

        {/* Style Presets */}
        <div className="flex flex-wrap gap-2">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => setPrompt(preset)}
              disabled={isConverting}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                prompt === preset
                  ? "bg-blue-500 text-white shadow-md shadow-blue-500/25"
                  : "bg-white/50 text-slate-500 hover:bg-white/70 hover:text-slate-700"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      {isConverting && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-6 card-shadow mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="text-sm font-semibold text-slate-700">
                Converting photos...
              </span>
            </div>
            <span className="text-sm font-mono text-slate-500">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2 rounded-full" />
        </motion.div>
      )}

      {/* Results */}
      {convertedPhotos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-6 sm:p-8 card-shadow mb-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-700">
                Conversion Results
              </h3>
              <p className="text-sm text-slate-400 mt-0.5">
                {doneCount} converted
                {errorCount > 0 && `, ${errorCount} failed`}
              </p>
            </div>
            {doneCount > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    transferAllToGallery();
                    toast.success(`Transferred ${doneCount} photos to gallery`);
                  }}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl h-10 px-5 font-semibold shadow-lg shadow-emerald-500/25"
                >
                  <Images className="w-4 h-4 mr-2" />
                  Transfer All to Gallery
                </Button>
                <Link href="/gallery">
                  <Button
                    variant="outline"
                    className="glass rounded-xl h-10 text-slate-600 hover:bg-white/60"
                  >
                    View Gallery
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <AnimatePresence>
              {convertedPhotos.map((photo) => (
                <motion.div
                  key={photo.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative rounded-xl overflow-hidden aspect-square group"
                >
                  <img
                    src={
                      photo.status === "done"
                        ? photo.convertedUrl
                        : photo.originalPreview
                    }
                    alt={photo.originalName}
                    className="w-full h-full object-cover"
                  />

                  {/* Status overlay */}
                  {photo.status === "converting" && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full border-3 border-white/30 border-t-white animate-spin" />
                    </div>
                  )}
                  {photo.status === "pending" && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <span className="text-xs font-semibold text-white bg-black/40 px-3 py-1 rounded-full">
                        Pending
                      </span>
                    </div>
                  )}
                  {photo.status === "done" && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 drop-shadow-lg" />
                    </div>
                  )}
                  {photo.status === "error" && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                      <div className="text-center">
                        <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-1" />
                        <span className="text-[10px] text-red-300 font-medium">
                          {photo.error || "Failed"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[11px] text-white truncate font-medium">
                      {photo.originalName}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* No API Key Warning */}
      {!apiKey && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-6 card-shadow border border-amber-200/50"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-700 mb-1">
                API Key Required
              </h3>
              <p className="text-sm text-slate-500 mb-3">
                You need a Magic Hour API key to use the NanoBanana conversion
                features. Get a free key to start.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowApiDialog(true)}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl h-9 px-4 text-sm font-semibold"
                >
                  Set API Key
                </Button>
                <a
                  href="https://magichour.ai/api/nano-banana"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="glass rounded-xl text-slate-600 hover:bg-white/60"
                  >
                    Get Free Key
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <ApiKeyDialog open={showApiDialog} onOpenChange={setShowApiDialog} />
    </div>
  );
}
