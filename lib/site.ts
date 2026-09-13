export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://taxi-rust-psi.vercel.app";

export const NAV_LINKS = [
  { href: "#plataforma", label: "Plataforma" },
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#contacto", label: "Pedir orçamento" },
] as const;

/** Assets produced by scripts/prepare_video.py. */
export const HERO_VIDEO = {
  fps: 24,
  frameCount: 240,
  aspect: 16 / 9,
  src: "/video/taxi-flow-cinematic.mp4",
  srcSmall: "/video/taxi-flow-cinematic-720.mp4",
  frameUrl: (index: number) =>
    `/video/frames/${String(index).padStart(3, "0")}.webp`,
  posterStart: "/video/poster-start.webp",
  posterStartSmall: "/video/poster-start-960.webp",
  posterEnd: "/video/poster-end.webp",
  posterEndSmall: "/video/poster-end-960.webp",
} as const;
