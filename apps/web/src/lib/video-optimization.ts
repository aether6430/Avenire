import type {
  OptimizedVideoUpload,
  StoredAsset,
} from "@/lib/video-optimization-runtime";

export type { OptimizedVideoUpload, StoredAsset };
export {
  optimizeAndReuploadVideo,
  validateSourceUrl,
} from "@/lib/video-optimization-runtime";
