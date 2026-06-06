// client/src/components/ui/Avatar.tsx
// Shows a profile picture or falls back to initials in a coloured circle.
// Used in ConversationList, Chat header, and anywhere a user avatar is needed.

interface AvatarProps {
  username: string;
  size?: number; // diameter in px — default 40
  src?: string; // optional profile image URL
  online?: boolean; // shows a green dot if true
}

// Pick a consistent colour for each username so the same
// user always gets the same colour across the app.
function getColour(username: string): string {
  const colours = [
    "#4F46E5", // indigo
    "#7C3AED", // violet
    "#DB2777", // pink
    "#EA580C", // orange
    "#16A34A", // green
    "#0284C7", // sky
    "#DC2626", // red
    "#D97706", // amber
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colours[Math.abs(hash) % colours.length];
}

export default function Avatar({
  username,
  size = 40,
  src,
  online,
}: AvatarProps) {
  const initials = username.slice(0, 1).toUpperCase();
  const colour = getColour(username);

  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      {src ? (
        // Profile image if provided
        <img
          src={src}
          alt={username}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
      ) : (
        // Fallback: coloured circle with initials
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: colour,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.4,
            fontWeight: 600,
            fontFamily: "sans-serif",
            userSelect: "none",
          }}
        >
          {initials}
        </div>
      )}

      {/* Online presence dot — bottom right corner */}
      {online !== undefined && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: "50%",
            background: online ? "#22C55E" : "#9CA3AF",
            border: "2px solid white",
          }}
        />
      )}
    </div>
  );
}
