/**
 * Pixelation utility for creating Tamagotchi-style avatars
 * Converts camera photos into retro pixel art
 */

import { PixelData } from '../types/character';

/**
 * Process a base64 image into pixelated avatar data
 * Works on both web (Canvas API) and native (simplified palette)
 */
export async function processImageToPixels(
  base64Image: string,
  pixelSize: number = 8,
  paletteSize: number = 16
): Promise<PixelData> {
  // Check if we're on web platform
  if (typeof document !== 'undefined' && typeof HTMLCanvasElement !== 'undefined') {
    return processImageOnWeb(base64Image, pixelSize, paletteSize);
  }
  
  // Native fallback - generate based on image hash for variety
  return generateAvatarFromBase64(base64Image, pixelSize, paletteSize);
}

/**
 * Process image on web using Canvas API
 */
async function processImageOnWeb(
  base64Image: string,
  pixelSize: number,
  paletteSize: number
): Promise<PixelData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(generatePlaceholderAvatar(pixelSize));
          return;
        }
        
        // Set canvas size
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Process through pixelation
        const pixelData = pixelateImage(
          imageData.data,
          canvas.width,
          canvas.height,
          pixelSize,
          paletteSize
        );
        
        resolve(pixelData);
      } catch (error) {
        console.error('Error processing image:', error);
        resolve(generatePlaceholderAvatar(pixelSize));
      }
    };
    
    img.onerror = () => {
      console.error('Failed to load image');
      resolve(generatePlaceholderAvatar(pixelSize));
    };
    
    // Load the base64 image
    const prefix = base64Image.startsWith('data:') ? '' : 'data:image/png;base64,';
    img.src = prefix + base64Image;
  });
}

/**
 * Generate avatar variation from base64 string (native fallback)
 * Uses the image data to seed color generation for variety
 */
function generateAvatarFromBase64(
  base64Image: string,
  pixelSize: number,
  paletteSize: number
): PixelData {
  // Create a simple hash from the base64 string for variety
  let hash = 0;
  for (let i = 0; i < Math.min(base64Image.length, 1000); i++) {
    hash = ((hash << 5) - hash) + base64Image.charCodeAt(i);
    hash = hash & hash;
  }
  
  const palette = COLOR_PALETTES[paletteSize] || COLOR_PALETTES[16];
  const width = Math.ceil(64 / pixelSize);
  const height = Math.ceil(64 / pixelSize);
  const colors: string[][] = [];
  
  // Use hash to create pseudo-random but consistent pattern
  const seedRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  for (let y = 0; y < height; y++) {
    const row: string[] = [];
    for (let x = 0; x < width; x++) {
      // Create face-like pattern with mirror symmetry
      const mirrorX = x < width / 2 ? x : width - 1 - x;
      const seed = hash + mirrorX * 100 + y * 10;
      
      // Face region detection
      const centerX = width / 2;
      const centerY = height / 2;
      const distFromCenter = Math.sqrt(
        Math.pow((x - centerX) / (width / 2), 2) + 
        Math.pow((y - centerY) / (height / 2), 2)
      );
      
      let colorIndex: number;
      
      if (distFromCenter > 0.9) {
        // Background
        colorIndex = Math.floor(seedRandom(seed) * 2);
      } else if (distFromCenter > 0.7) {
        // Face edge
        colorIndex = Math.floor(seedRandom(seed + 1) * 3) + 2;
      } else if (y < height * 0.35) {
        // Hair region
        colorIndex = Math.floor(seedRandom(seed + 2) * 4) + (hash % 4);
      } else if (y > height * 0.55 && y < height * 0.75 && Math.abs(x - centerX) < width * 0.15) {
        // Mouth region
        colorIndex = Math.floor(seedRandom(seed + 3) * 2) + 10;
      } else if (y > height * 0.35 && y < height * 0.55 && 
                 (Math.abs(x - centerX) > width * 0.1 && Math.abs(x - centerX) < width * 0.35)) {
        // Eye region
        colorIndex = seedRandom(seed + 4) > 0.5 ? 8 : 0; // White or dark
      } else {
        // Face fill
        colorIndex = Math.floor(seedRandom(seed + 5) * 3) + 4;
      }
      
      row.push(palette[colorIndex % palette.length]);
    }
    colors.push(row);
  }
  
  return { width, height, pixelSize, colors };
}

// Predefined color palettes for different evolution tiers
const COLOR_PALETTES: Record<number, string[]> = {
  4: ['#0a0e1a', '#00E5BF', '#FFFFFF', '#1a2235'],
  8: ['#0a0e1a', '#00E5BF', '#00D9B5', '#FFFFFF', '#1a2235', '#FFB547', '#FF6B6B', '#64B5F6'],
  16: [
    '#0a0e1a', '#121829', '#1a2235', '#2a3548',
    '#00E5BF', '#00D9B5', '#00C4A3', '#4ECCA3',
    '#FFFFFF', '#B8C1D1', '#7A8599', '#FFB547',
    '#FF6B6B', '#FF8A9B', '#64B5F6', '#B794F4'
  ],
  32: [
    '#0a0e1a', '#121829', '#1a2235', '#2a3548', '#3a4558', '#4a5568',
    '#00E5BF', '#00D9B5', '#00C4A3', '#4ECCA3', '#00BCD4', '#26C6DA',
    '#FFFFFF', '#F5F5F5', '#E0E0E0', '#B8C1D1', '#9CA3AF', '#7A8599',
    '#FFB547', '#FFC107', '#FF9800', '#FF6B6B', '#EF5350', '#FF8A9B',
    '#64B5F6', '#42A5F5', '#2196F3', '#B794F4', '#9C27B0', '#7C4DFF'
  ],
  64: generateExtendedPalette(),
};

function generateExtendedPalette(): string[] {
  // Generate a rich 64-color palette
  const palette: string[] = [];
  
  // Base colors
  const baseHues = [180, 120, 0, 30, 60, 210, 270, 330];
  
  for (const hue of baseHues) {
    for (let sat = 40; sat <= 100; sat += 30) {
      for (let light = 20; light <= 80; light += 30) {
        palette.push(hslToHex(hue, sat, light));
      }
    }
  }
  
  // Add grayscale
  for (let i = 0; i < 8; i++) {
    const light = Math.round((i / 7) * 100);
    palette.push(hslToHex(0, 0, light));
  }
  
  return palette.slice(0, 64);
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Find the closest color in a palette
 */
function findClosestColor(r: number, g: number, b: number, palette: string[]): string {
  let minDistance = Infinity;
  let closestColor = palette[0];
  
  for (const color of palette) {
    const pr = parseInt(color.slice(1, 3), 16);
    const pg = parseInt(color.slice(3, 5), 16);
    const pb = parseInt(color.slice(5, 7), 16);
    
    // Use weighted Euclidean distance for better perceptual matching
    const distance = Math.sqrt(
      2 * Math.pow(r - pr, 2) +
      4 * Math.pow(g - pg, 2) +
      3 * Math.pow(b - pb, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }
  
  return closestColor;
}

/**
 * Convert image data to pixelated avatar
 */
export function pixelateImage(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  pixelSize: number = 8,
  paletteSize: number = 16
): PixelData {
  const palette = COLOR_PALETTES[paletteSize] || COLOR_PALETTES[16];
  
  // Calculate output dimensions
  const outputWidth = Math.ceil(width / pixelSize);
  const outputHeight = Math.ceil(height / pixelSize);
  
  const colors: string[][] = [];
  
  for (let py = 0; py < outputHeight; py++) {
    const row: string[] = [];
    
    for (let px = 0; px < outputWidth; px++) {
      // Sample the average color in this pixel block
      let r = 0, g = 0, b = 0;
      let count = 0;
      
      for (let y = py * pixelSize; y < Math.min((py + 1) * pixelSize, height); y++) {
        for (let x = px * pixelSize; x < Math.min((px + 1) * pixelSize, width); x++) {
          const i = (y * width + x) * 4;
          r += imageData[i];
          g += imageData[i + 1];
          b += imageData[i + 2];
          count++;
        }
      }
      
      if (count > 0) {
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
      }
      
      // Find closest palette color
      const color = findClosestColor(r, g, b, palette);
      row.push(color);
    }
    
    colors.push(row);
  }
  
  return {
    width: outputWidth,
    height: outputHeight,
    pixelSize,
    colors,
  };
}

/**
 * Apply visual effects based on character mood
 */
export function applyMoodEffects(
  pixelData: PixelData,
  effects: string[]
): PixelData {
  let colors = pixelData.colors.map(row => [...row]);
  
  for (const effect of effects) {
    if (effect.startsWith('desaturate_')) {
      const amount = parseInt(effect.split('_')[1]) / 100;
      colors = colors.map(row =>
        row.map(color => desaturateColor(color, amount))
      );
    }
    
    if (effect.startsWith('dim_')) {
      const amount = parseInt(effect.split('_')[1]) / 100;
      colors = colors.map(row =>
        row.map(color => dimColor(color, amount))
      );
    }
  }
  
  return {
    ...pixelData,
    colors,
  };
}

function desaturateColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  
  const newR = Math.round(r + (gray - r) * amount);
  const newG = Math.round(g + (gray - g) * amount);
  const newB = Math.round(b + (gray - b) * amount);
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function dimColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const factor = 1 - amount;
  
  const newR = Math.round(r * factor);
  const newG = Math.round(g * factor);
  const newB = Math.round(b * factor);
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Generate placeholder pixel data for new characters
 */
export function generatePlaceholderAvatar(pixelSize: number = 16): PixelData {
  const size = 8; // 8x8 pixel avatar
  const colors: string[][] = [];
  
  // Simple smiley face pattern
  const pattern = [
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 2, 1, 1, 2, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 2, 1, 1, 1, 1, 2, 1],
    [0, 1, 2, 2, 2, 2, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
  ];
  
  const colorMap = ['#0a0e1a', '#00E5BF', '#FFFFFF'];
  
  for (const row of pattern) {
    colors.push(row.map(i => colorMap[i]));
  }
  
  return {
    width: size,
    height: size,
    pixelSize,
    colors,
  };
}
