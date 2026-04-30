/* 
 * PixelBoard — Type Definitions
 * Design: Aero Glass — iOS-inspired glassmorphism
 */

export interface UploadedPhoto {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
}

export interface ConvertedPhoto {
  id: string;
  originalPreview: string;
  convertedUrl: string;
  originalName: string;
  prompt: string;
  status: 'pending' | 'converting' | 'done' | 'error';
  error?: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  name: string;
  addedAt: number;
}

export type GridSize = 2 | 3 | 4;

export interface PromptHistoryItem {
  id: string;
  text: string;
  usedAt: number;
  useCount: number;
  isFavorite: boolean;
}

export interface GalleryState {
  images: GalleryImage[];
  gridSize: GridSize;
}

export interface BatchConversionState {
  photos: UploadedPhoto[];
  results: ConvertedPhoto[];
  prompt: string;
  apiKey: string;
  isConverting: boolean;
  progress: number;
  total: number;
}
