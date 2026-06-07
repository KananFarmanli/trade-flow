export type PriceType = "retail" | "consignment" | "custom" | "free_bonus";

export const PRICE_TYPES: PriceType[] = ["retail", "consignment", "custom", "free_bonus"];

export const PRICE_TYPE_LABEL: Record<PriceType, string> = {
  retail: "Pərakəndə",
  consignment: "Konsiqnasiya",
  custom: "Fərdi qiymət",
  free_bonus: "Pulsuz / bonus",
};
