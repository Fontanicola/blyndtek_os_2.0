import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Blyndtek OS",
    short_name: "Blyndtek OS",
    description: "Sistema de gestión interno de Blyndtek.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#263a6d",
    icons: [
      {
        src: "/Favicon_Blyndtek.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  };
}
