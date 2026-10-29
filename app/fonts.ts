import localFont from "next/font/local";

const inter = localFont({
  src: [{ path: "../assets/fonts/Inter-Variable.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-inter",
  display: "swap",
});

const interItalic = localFont({
  src: [{ path: "../assets/fonts/Inter-Italic-Variable.woff2", weight: "100 900", style: "italic" }],
  variable: "--font-inter-italic",
  display: "swap",
  preload: false,
});

const fraunces = localFont({
  src: [
    { path: "../assets/fonts/Fraunces-600.woff2", style: "normal", weight: "600" },
    { path: "../assets/fonts/Fraunces-Italic.woff2", style: "italic", weight: "600" },
  ],
  variable: "--font-fraunces",
  display: "swap",
});

export const fontClassName = `${inter.variable} ${interItalic.variable} ${fraunces.variable}`;
