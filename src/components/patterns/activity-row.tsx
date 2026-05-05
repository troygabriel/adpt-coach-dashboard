import Link from "next/link";
import { Dumbbell, ClipboardCheck, ImageIcon, Scale } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ActivityItem, ActivityType } from "@/lib/coach-home";
import { formatRelativeDate } from "@/lib/utils";

const TYPE_ICON: Record<ActivityType, typeof Dumbbell> = {
  workout: Dumbbell,
  checkin: ClipboardCheck,
  photo: ImageIcon,
  body_stat: Scale,
};

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = TYPE_ICON[item.type];
  return (
    <li>
      <Link
        href={`/clients/${item.clientId}`}
        className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
      >
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-muted text-[11px] font-medium text-muted-foreground">
            {getInitials(item.firstName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-medium">{item.firstName ?? "A client"}</span>
            <span className="text-muted-foreground"> {item.verb}</span>
            {item.object && (
              <>
                <span className="text-muted-foreground"> </span>
                <span className="font-medium">{item.object}</span>
              </>
            )}
          </p>
          {item.photoUrls && item.photoUrls.length > 0 && (
            <div className="mt-2 flex gap-1.5">
              {item.photoUrls.slice(0, 3).map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="h-12 w-12 rounded-md border border-border bg-muted object-cover"
                />
              ))}
            </div>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatRelativeDate(item.occurredAt)}
          </p>
        </div>
        <Icon
          aria-hidden="true"
          className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground"
        />
      </Link>
    </li>
  );
}
