export const DIMENSION_IDS = ["d1", "d2", "d3", "d4", "d5", "d6"] as const;
export type DimensionId = (typeof DIMENSION_IDS)[number];
