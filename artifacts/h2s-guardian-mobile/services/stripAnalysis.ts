import { Platform } from 'react-native';
import type { CalibrationEntry } from '@/constants/calibration';

export type StripRoi = 'full' | 'center' | 'middle-band';
export type Rgb = { r: number; g: number; b: number };
export type Hsv = { h: number; s: number; v: number };

export type StripAnalysis = {
  rgb: Rgb;
  hsv: Hsv;
  dominantHex: string;
  source: 'synthetic-sample' | 'browser-image';
  roi: StripRoi;
  quality: {
    usable: boolean;
    brightness: number;
    contrast: number;
    notes: string[];
  };
  closestCalibration: {
    label: string;
    referenceValue: string;
    distance: number;
  } | null;
  relativeMatch: number | null;
  classification: string;
};

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb) {
  return (
    '#' +
    [r, g, b]
      .map((value) =>
        Math.max(0, Math.min(255, Math.round(value)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()
  );
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === red) h = 60 * (((green - blue) / delta) % 6);
    else if (max === green) h = 60 * ((blue - red) / delta + 2);
    else h = 60 * ((red - green) / delta + 4);
  }

  if (h < 0) h += 360;
  return {
    h: Math.round(h),
    s: Math.round((max === 0 ? 0 : delta / max) * 100),
    v: Math.round(max * 100),
  };
}

function distance(a: Rgb, b: Rgb) {
  return Math.sqrt(
    (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2,
  );
}

function qualityFor(rgb: Rgb, contrast = 28): StripAnalysis['quality'] {
  const brightness = Math.round(
    rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114,
  );
  const notes: string[] = [];

  if (brightness < 35) notes.push('The sampled region is very dark.');
  if (brightness > 235) notes.push('The sampled region is very bright.');
  if (contrast < 8)
    notes.push('The sampled region has low contrast and may be blurry or blank.');
  if (notes.length === 0)
    notes.push(
      'Brightness and contrast are suitable for an experimental colour comparison.',
    );

  return {
    usable: notes.length === 1,
    brightness,
    contrast: Math.round(contrast),
    notes,
  };
}

export function analyzeRgb(
  rgb: Rgb,
  source: StripAnalysis['source'],
  roi: StripRoi,
  calibration: CalibrationEntry[],
  contrast = 28,
): StripAnalysis {
  const matches = calibration
    .map((entry) => ({ entry, distance: distance(rgb, hexToRgb(entry.hex)) }))
    .sort((a, b) => a.distance - b.distance);
  const closest = matches[0];
  const relativeMatch = closest
    ? Math.max(0, Math.round((1 - closest.distance / 442) * 100))
    : null;

  return {
    rgb: {
      r: Math.round(rgb.r),
      g: Math.round(rgb.g),
      b: Math.round(rgb.b),
    },
    hsv: rgbToHsv(rgb),
    dominantHex: rgbToHex(rgb),
    source,
    roi,
    quality: qualityFor(rgb, contrast),
    closestCalibration: closest
      ? {
          label: closest.entry.label,
          referenceValue: closest.entry.referenceValue,
          distance: Math.round(closest.distance),
        }
      : null,
    relativeMatch,
    classification: closest
      ? closest.entry.label
      : 'No calibration reference available',
  };
}

export async function analyzeBrowserImage(
  uri: string,
  roi: StripRoi,
  calibration: CalibrationEntry[],
): Promise<StripAnalysis> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    throw new Error('Pixel sampling is available in web preview only.');
  }

  const image = new Image();
  image.src = uri;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('The selected image could not be read.'));
  });

  const canvas = document.createElement('canvas');
  const width = 180;
  const height = Math.max(1, Math.round((image.height / image.width) * width));
  canvas.width = width;
  canvas.height = Math.min(180, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('The browser image sampler is unavailable.');

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const bounds =
    roi === 'full'
      ? { left: 0, top: 0, right: canvas.width, bottom: canvas.height }
      : roi === 'center'
        ? {
            left: canvas.width * 0.2,
            top: canvas.height * 0.2,
            right: canvas.width * 0.8,
            bottom: canvas.height * 0.8,
          }
        : {
            left: canvas.width * 0.15,
            top: canvas.height * 0.38,
            right: canvas.width * 0.85,
            bottom: canvas.height * 0.62,
          };

  const data = context.getImageData(
    Math.floor(bounds.left),
    Math.floor(bounds.top),
    Math.max(1, Math.floor(bounds.right - bounds.left)),
    Math.max(1, Math.floor(bounds.bottom - bounds.top)),
  ).data;
  const pixels: Rgb[] = [];

  for (let index = 0; index < data.length; index += 16) {
    if (data[index + 3] > 20) {
      pixels.push({ r: data[index], g: data[index + 1], b: data[index + 2] });
    }
  }
  if (pixels.length === 0)
    throw new Error('No usable pixels were found in the selected region.');

  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };
  const rgb = {
    r: median(pixels.map((pixel) => pixel.r)),
    g: median(pixels.map((pixel) => pixel.g)),
    b: median(pixels.map((pixel) => pixel.b)),
  };
  const brightnesses = pixels.map(
    (pixel) => pixel.r * 0.299 + pixel.g * 0.587 + pixel.b * 0.114,
  );
  const mean =
    brightnesses.reduce((sum, value) => sum + value, 0) / brightnesses.length;
  const contrast = Math.sqrt(
    brightnesses.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      brightnesses.length,
  );

  return analyzeRgb(rgb, 'browser-image', roi, calibration, contrast);
}