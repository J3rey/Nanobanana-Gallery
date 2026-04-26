/* 
 * NanoBanana Gallery — Gallery Page
 * Design: Aero Glass — iOS-inspired glassmorphism
 * - Scalable grid layouts (2x2 to 5x5)
 * - Drag and drop reordering
 * - Add/remove images
 * - Smooth animations between grid sizes
 */

import { useState, useCallback, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Grid2X2,
  Grid3X3,
  Plus,
  Trash2,
  Images,
  Download,
  Maximize2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGallery } from "@/contexts/GalleryContext";
import type { GridSize } from "@/lib/types";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import SortableGalleryItem from "@/components/SortableGalleryItem";
import ImageLightbox from "@/components/ImageLightbox";

const EMPTY_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663298019635/3prKGU3n6QAPMMPEGR89Zp/empty-gallery-edzpttNQwkET8Ezqf7jspo.webp";

const gridOptions: { size: GridSize; label: string; icon: any }[] = [
  { size: 2, label: "2x2", icon: Grid2X2 },
  { size: 3, label: "3x3", icon: Grid3X3 },
  { size: 4, label: "4x4", icon: Grid3X3 },
  { size: 5, label: "5x5", icon: Grid3X3 },
];

export default function Gallery() {
  const {
    images,
    gridSize,
    setGridSize,
    addImages,
    removeImage,
    reorderImages,
    clearGallery,
  } = useGallery();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((img) => img.id === active.id);
      const newIndex = images.findIndex((img) => img.id === over.id);
      reorderImages(oldIndex, newIndex);
    }
  };

  const handleAddFiles = useCallback(
    (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (imageFiles.length === 0) return;

      const newImages = imageFiles.map((file) => ({
        url: URL.createObjectURL(file),
        name: file.name,
      }));
      addImages(newImages);
      toast.success(`Added ${imageFiles.length} image${imageFiles.length > 1 ? "s" : ""}`);
    },
    [addImages]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleAddFiles(e.dataTransfer.files);
    },
    [handleAddFiles]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelected = () => {
    selectedIds.forEach((id) => removeImage(id));
    toast.success(`Removed ${selectedIds.size} image${selectedIds.size > 1 ? "s" : ""}`);
    setSelectedIds(new Set());
  };

  const gridCols: Record<GridSize, string> = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
    5: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5",
  };

  return (
    <div className="container max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 mb-1">
            Gallery
          </h1>
          <p className="text-slate-500">
            {images.length} image{images.length !== 1 ? "s" : ""} — drag to
            reorder, click to view
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Grid Size Selector */}
          <div className="glass rounded-xl p-1 flex items-center gap-0.5">
            {gridOptions.map(({ size, label }) => (
              <button
                key={size}
                onClick={() => setGridSize(size)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  gridSize === size
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            className="glass rounded-xl text-slate-600 hover:bg-white/60"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add
          </Button>

          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="glass rounded-xl text-red-500 hover:bg-red-50/50 hover:text-red-600"
              onClick={deleteSelected}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete ({selectedIds.size})
            </Button>
          )}

          {images.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="glass rounded-xl text-red-400 hover:bg-red-50/50 hover:text-red-600"
              onClick={() => {
                clearGallery();
                setSelectedIds(new Set());
                toast.success("Gallery cleared");
              }}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleAddFiles(e.target.files)}
      />

      {/* Gallery Grid */}
      {images.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={images.map((img) => img.id)}
            strategy={rectSortingStrategy}
          >
            <div
              className={`grid ${gridCols[gridSize]} gap-3 sm:gap-4`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <AnimatePresence>
                {images.map((image, index) => (
                  <SortableGalleryItem
                    key={image.id}
                    image={image}
                    isSelected={selectedIds.has(image.id)}
                    onToggleSelect={() => toggleSelect(image.id)}
                    onRemove={() => {
                      removeImage(image.id);
                      toast.success("Image removed");
                    }}
                    onView={() => setLightboxIndex(index)}
                    gridSize={gridSize}
                  />
                ))}
              </AnimatePresence>

              {/* Add More Card */}
              <motion.div
                layout
                className="aspect-square rounded-2xl border-2 border-dashed border-blue-300/50 bg-white/20 hover:bg-white/40 hover:border-blue-400/70 transition-all flex flex-col items-center justify-center cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="w-8 h-8 text-blue-400 group-hover:text-blue-500 mb-2 transition-colors" />
                <span className="text-xs font-semibold text-blue-400 group-hover:text-blue-500 transition-colors">
                  Add Images
                </span>
              </motion.div>
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-3xl p-12 sm:p-16 text-center card-shadow"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <img
            src={EMPTY_IMAGE}
            alt="Empty gallery"
            className="w-48 h-36 sm:w-64 sm:h-48 object-contain mx-auto mb-6 opacity-80"
          />
          <h3 className="text-xl font-bold text-slate-700 mb-2">
            Your Gallery is Empty
          </h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Add images by uploading them directly, or convert photos using the
            Batch Convert feature and transfer them here.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl h-11 px-6 font-semibold shadow-lg shadow-blue-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload Images
            </Button>
            <Link href="/convert">
              <Button
                variant="outline"
                className="glass rounded-xl h-11 px-6 font-semibold text-slate-600 hover:bg-white/60"
              >
                <Images className="w-4 h-4 mr-2" />
                Batch Convert
              </Button>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
