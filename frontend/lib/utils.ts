import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatiert Prozentzahlen konsistent für bessere Lesbarkeit in Charts
 * @param value - Wert zwischen 0 und 1 (für 0% bis 100%)
 * @param options - Formatierungsoptionen
 */
export function formatPercentage(
  value: number,
  options: {
    /** Minimaler Wert um Label anzuzeigen (verhindert Überlappungen) */
    minDisplayThreshold?: number;
    /** Dezimalstellen für kleine Werte */
    smallValueDecimals?: number;
    /** Schwellenwert für "kleine Werte" */
    smallValueThreshold?: number;
    /** Suffix anhängen */
    suffix?: string;
  } = {}
): string | null {
  const {
    minDisplayThreshold = 0.01, // 1%
    smallValueDecimals = 1,
    smallValueThreshold = 0.1, // 10%
    suffix = '%'
  } = options;

  const percentValue = value * 100;

  // Zu kleine Werte nicht anzeigen (verhindert Überlappung)
  if (percentValue < minDisplayThreshold * 100) {
    return null;
  }

  // Formatierung basierend auf Größe
  if (percentValue < smallValueThreshold * 100) {
    return `${percentValue.toFixed(smallValueDecimals)}${suffix}`;
  } else {
    return `${Math.round(percentValue)}${suffix}`;
  }
}

// Label-Positionierungs-Funktionen entfernt - Labels werden jetzt nur noch in Hover-Tooltips angezeigt
