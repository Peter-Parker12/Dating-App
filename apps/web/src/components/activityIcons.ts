import {
  BookOpen, Bike, Briefcase, Camera, Coffee, Dumbbell, Film, Footprints, Gamepad2, GraduationCap, Heart, Landmark, LayoutGrid,
  MessageCircle, Mic, Music, Palette, PartyPopper, Plane, ShoppingBag, Sparkles, TreePine, Users, Utensils, Waves, type LucideIcon,
} from "lucide-react";

/** Icon keys an admin can choose for an activity; must match ACTIVITY_ICON_KEYS in the API. */
export const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  coffee: Coffee, "book-open": BookOpen, landmark: Landmark, "party-popper": PartyPopper, users: Users, dumbbell: Dumbbell,
  "message-circle": MessageCircle, utensils: Utensils, film: Film, plane: Plane, gamepad: Gamepad2, music: Music,
  camera: Camera, "shopping-bag": ShoppingBag, heart: Heart, sparkles: Sparkles, mic: Mic, palette: Palette, bike: Bike,
  briefcase: Briefcase, "graduation-cap": GraduationCap, footprints: Footprints, tree: TreePine, waves: Waves,
};
export const ICON_KEYS = Object.keys(ACTIVITY_ICONS);

/** The "All" tile uses a fixed icon; every real activity uses the icon its admin picked. */
export const iconByKey = (key: string | undefined): LucideIcon => (key === "all" ? LayoutGrid : ACTIVITY_ICONS[key ?? ""] ?? Sparkles);
