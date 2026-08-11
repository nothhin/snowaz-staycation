import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SnowAZ Staycation",
    short_name: "SnowAZ",
    description:
      "Book the SnowAZ Staycation condo at Urban Deca Homes Banilad, Mandaue City.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f1e8",
    theme_color: "#a77a4b",
    icons: [
      {
        src: "/images/snowaz/logo.jpg",
        sizes: "1200x1200",
        type: "image/jpeg",
        purpose: "any",
      },
    ],
  };
}
