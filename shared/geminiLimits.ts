export const MAX_IMAGES_PER_DAY = 20;
export const MAX_BATCH_SIZE = 3;
export const MAX_IMAGES_PER_USER_PER_DAY = 5;

export type GeminiLimitType = "batch" | "global_daily" | "user_daily";

export interface GeminiUsageSnapshot {
  day: string;
  globalUsed: number;
  globalRemaining: number;
  userUsed: number;
  userRemaining: number;
  maxImagesPerDay: number;
  maxImagesPerUserPerDay: number;
  maxBatchSize: number;
  resetTimezone: "America/Los_Angeles";
}
