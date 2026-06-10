import {
  Calendar,
  Clock,
  Lightbulb,
  Lock,
  Mail,
  Phone,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Phone,
  Mail,
  Calendar,
  Lightbulb,
  Lock,
  Sparkles,
  Clock,
};

export function resolveNoteTypeIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || Clock;
}
