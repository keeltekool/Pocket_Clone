import type { MetadataRoute } from "next";

// Home-screen app: opens full screen, no Safari bars. The icon comes from apple-icon.tsx.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pocket Clone",
    short_name: "Pocket",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF7F2",
    theme_color: "#FAF7F2",
  };
}
