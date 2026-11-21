export const FPS = 30;
export const COMPOSITION_WIDTH = 1080;
export const COMPOSITION_HEIGHT = 1920;

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const formatDurationSec = (frames: number): string => {
  return (frames / FPS).toFixed(2);
};
