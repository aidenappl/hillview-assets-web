// The alert played when a scanned asset carries a warning status.
export const playAlert = (): void => {
  const audio = new Audio("/sounds/alert.wav");
  // Autoplay can be refused before the first interaction; the visual warning
  // still shows, so a refusal is not an error.
  audio.play().catch(() => undefined);
};
