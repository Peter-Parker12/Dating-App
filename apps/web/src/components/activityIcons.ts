import { BookOpen, Coffee, Dumbbell, Landmark, LayoutGrid, MessageCircle, PartyPopper, Users, Sparkles, type LucideIcon } from "lucide-react";

export const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  all: LayoutGrid,
  cafe: Coffee,
  study: BookOpen,
  temple: Landmark,
  party: PartyPopper,
  family: Users,
  gym: Dumbbell,
  "online-chat": MessageCircle,
};

export const activityIcon = (slug: string): LucideIcon => ACTIVITY_ICONS[slug] ?? Sparkles;
