/* 
 * NanoBanana Gallery — Sortable Gallery Item
 * Design: Aero Glass — floating card with depth
 * - Drag handle with visual feedback
 * - Selection checkbox
 * - Hover actions (view, delete)
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { GripVertical, Maximize2, Trash2, Check } from "lucide-react";
import type { GalleryImage, GridSize } from "@/lib/types";

interface SortableGalleryItemProps {
  image: GalleryImage;
  isSelected: boolean;
  onToggleSelect: () => void;
  onRemove: () => void;
  onView: () => void;
  gridSize: GridSize;
}

export default function SortableGalleryItem({
  image,
  isSelected,
  onToggleSelect,
  onRemove,
  onView,
  gridSize,
}: SortableGalleryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative aspect-square rounded-2xl overflow-hidden group cursor-pointer ${
        isDragging
          ? "ring-2 ring-blue-400 shadow-2xl shadow-blue-500/20 scale-105"
          : "card-shadow hover:card-shadow-hover"
      } ${isSelected ? "ring-2 ring-blue-500" : ""}`}
    >
      <img
        src={image.url}
        alt={image.name}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        onClick={onView}
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 w-8 h-8 rounded-lg bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-white" />
      </div>

      {/* Selection checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
        className={`absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
          isSelected
            ? "bg-blue-500 text-white"
            : "bg-black/40 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100"
        }`}
      >
        {isSelected && <Check className="w-4 h-4" />}
      </button>

      {/* Bottom actions */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[11px] text-white font-medium truncate max-w-[60%] bg-black/30 backdrop-blur-sm rounded px-2 py-0.5">
          {image.name}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="w-7 h-7 rounded-lg bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="w-7 h-7 rounded-lg bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500/70 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
