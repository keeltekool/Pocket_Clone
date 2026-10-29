import { ImageResponse } from "next/og";

// Home-screen icon (iPhone "Add to Home Screen"): the bookmark from the Save button, warm white on terracotta.
// Full-bleed square; iOS rounds the corners itself.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#C85A3B" }}>
        <svg width="96" height="96" viewBox="0 0 24 24" fill="#FFFDFB" stroke="#FFFDFB" strokeWidth="2" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </div>
    ),
    size,
  );
}
