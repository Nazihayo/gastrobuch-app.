import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GastroHub",
    short_name: "GastroHub",
    description:
      "Restaurant-Betriebssystem: Bestellungen, Kasse, Personal, Lager und Kundenbindung an einem Ort.",
    start_url: "/",
    display: "standalone",
    background_color: "#14171a",
    theme_color: "#163f30",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
