/* 
 * NanoBanana Gallery — Sortable Gallery Item (App-Centric)
 * - Clean photo tile, no hover overlays cluttering the display
 * - Long-press activates drag (handled by sensor config)
 * - Tap opens lightbox
 * - Subtle lift effect when dragging
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { GalleryImage, GridSize } from "@/lib/types";

interface SortableGalleryItemProps {
  image: GalleryImage;
  onView: () => void;
  gridSize: GridSize;
  isDragActive: boolean;
}

export default function SortableGalleryItem({
  image,
  onView,
  gridSize,
  isDragActive,
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
    opacity: isDragging ? 0.4 : 1,
  };

  const radius = gridSize <= 2 ? "rounded-lg" : gridSize <= 3 ? "rounded-md" : "rounded-sm";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative aspect-square ${radius} overflow-hidden cursor-pointer select-none touch-manipulation ${
        isDragging
          ? "scale-95"
          : "active:scale-[0.97] transition-transform duration-150"
      }`}
      onClick={() => {
        if (!isDragging) onView();
      }}
    >
      <img
        src={image.url}
        alt={image.name}
        className="w-full h-full object-cover"
        draggable={false}
      />
    </div>
  );
}
