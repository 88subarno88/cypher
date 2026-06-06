// client/src/components/ui/Badge.tsx
// Small label used for status indicators across the app.
// Variants: online, offline, encrypted, unread count.

interface BadgeProps {
  variant: "online" | "offline" | "encrypted" | "unread";
  count?: number;   // only used for variant="unread"
  label?: string;   // custom label — overrides default text
}

const STYLES: Record<
  BadgeProps["variant"],
  { background: string; color: string; border: string }
> = {
  online: {
    background: "#D1FAE5",
    color: "#065F46",
    border: "1px solid #6EE7B7",
  },
  offline: {
    background: "#F3F4F6",
    color: "#6B7280",
    border: "1px solid #E5E7EB",
  },
  encrypted: {
    background: "#EEF2FF",
    color: "#4338CA",
    border: "1px solid #C7D2FE",
  },
  unread: {
    background: "#4F46E5",
    color: "white",
    border: "none",
  },
};

const DEFAULT_LABELS: Record<BadgeProps["variant"], string> = {
  online:    "Online",
  offline:   "Offline",
  encrypted: "🔒 Encrypted",
  unread:    "",
};

export default function Badge({ variant, count, label }: BadgeProps) {
  const style = STYLES[variant];

  // For unread badge show the count number
  const text =
    variant === "unread"
      ? count !== undefined
        ? count > 99
          ? "99+"
          : String(count)
        : "0"
      : label ?? DEFAULT_LABELS[variant];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: variant === "unread" ? "0 6px" : "2px 8px",
        minWidth: variant === "unread" ? "20px" : undefined,
        height: variant === "unread" ? "20px" : undefined,
        borderRadius: "20px",
        fontSize: "11px",
        fontWeight: 600,
        fontFamily: "sans-serif",
        whiteSpace: "nowrap",
        userSelect: "none",
        ...style,
      }}
    >
      {text}
    </span>
  );
}