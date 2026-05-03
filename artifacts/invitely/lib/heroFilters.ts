export type HeroFilterId =
  | "none"
  | "warm"
  | "cool"
  | "bright"
  | "soft"
  | "dim";

export type HeroFilter = {
  id: HeroFilterId;
  label: string;
  overlayColor: string;
  overlayOpacity: number;
};

export const HERO_FILTERS: HeroFilter[] = [
  { id: "none", label: "Original", overlayColor: "transparent", overlayOpacity: 0 },
  { id: "bright", label: "Bright", overlayColor: "#ffffff", overlayOpacity: 0.14 },
  { id: "soft", label: "Soft", overlayColor: "#fff1e0", overlayOpacity: 0.22 },
  { id: "warm", label: "Warm", overlayColor: "#ff8a3d", overlayOpacity: 0.18 },
  { id: "cool", label: "Cool", overlayColor: "#3d7bff", overlayOpacity: 0.18 },
  { id: "dim", label: "Moody", overlayColor: "#000000", overlayOpacity: 0.22 },
];

export function getHeroFilter(id?: HeroFilterId | null): HeroFilter {
  return HERO_FILTERS.find((f) => f.id === (id ?? "none")) ?? HERO_FILTERS[0];
}
