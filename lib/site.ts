import video from "./video.manifest.json";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://taxi-rust-psi.vercel.app";

export const NAV_LINKS = [
  { href: "#plataforma", label: "Aplicação" },
  { href: "#funcionalidades", label: "À medida" },
  { href: "#como-funciona", label: "Como trabalhamos" },
  { href: "#contacto", label: "Pedir orçamento" },
] as const;

/** Assets produced by scripts/prepare_video.py, which also writes the frame rate and counts. */
export const HERO_VIDEO = {
  fps: video.fps,
  /** Frames in the MP4, stepped through by the scroll position. */
  frameCount: video.frameCount,
  /** Images of the fallback sequence (24 per second, fewer than the video). */
  fallbackFrameCount: video.fallbackFrameCount,
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
