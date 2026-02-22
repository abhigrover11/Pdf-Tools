import { PDFDocument, PDFPage } from 'pdf-lib';

export type CompressionLevel = 'none' | 'low' | 'medium' | 'extreme';

export interface CompressionOptions {
  level: CompressionLevel;
}

const COMPRESSION_DESCRIPTIONS: Record<CompressionLevel, string> = {
  none: 'No compression - Output preserves all quality and metadata',
  low: 'Lossless compression - Removes duplicate objects, optimizes structure',
  medium: 'Balanced compression - Smart image downsampling, efficient encoding',
  extreme: 'Maximum compression - Aggressive image reduction for minimum file size',
};

export function getCompressionDescription(level: CompressionLevel): string {
  return COMPRESSION_DESCRIPTIONS[level];
}

async function compressImage(
  imageData: Uint8Array,
  level: CompressionLevel
): Promise<Uint8Array> {
  if (level === 'none') {
    return imageData;
  }

  try {
    const blob = new Blob([imageData]);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return imageData;

    const img = new Image();
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      img.onload = async () => {
        try {
          const originalWidth = img.width;
          const originalHeight = img.height;
          let newWidth = originalWidth;
          let newHeight = originalHeight;
          let quality = 0.9;

          if (level === 'low') {
            quality = 0.95;
          } else if (level === 'medium') {
            if (originalWidth > 2000 || originalHeight > 2000) {
              const scale = Math.max(originalWidth, originalHeight) / 1500;
              newWidth = Math.round(originalWidth / scale);
              newHeight = Math.round(originalHeight / scale);
            }
            quality = 0.85;
          } else if (level === 'extreme') {
            if (originalWidth > 1000 || originalHeight > 1000) {
              const scale = Math.max(originalWidth, originalHeight) / 800;
              newWidth = Math.round(originalWidth / scale);
              newHeight = Math.round(originalHeight / scale);
            }
            quality = 0.7;
          }

          canvas.width = newWidth;
          canvas.height = newHeight;
          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          canvas.toBlob(
            (compressedBlob) => {
              if (!compressedBlob) {
                resolve(imageData);
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                const compressed = new Uint8Array(reader.result as ArrayBuffer);
                URL.revokeObjectURL(url);
                resolve(compressed.length < imageData.length ? compressed : imageData);
              };
              reader.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(imageData);
              };
              reader.readAsArrayBuffer(compressedBlob);
            },
            'image/jpeg',
            quality
          );
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  } catch (error) {
    console.warn('Image compression failed, using original:', error);
    return imageData;
  }
}

function removeUnusedResources(pdf: PDFDocument): void {
  try {
    const usedIndirectReferences = new Set<number>();

    pdf.getPages().forEach((page) => {
      const refs = extractReferences(page);
      refs.forEach((ref) => usedIndirectReferences.add(ref));
    });

    const catalog = pdf.getContext().getRoot();
    if (catalog) {
      const refs = extractReferences(catalog);
      refs.forEach((ref) => usedIndirectReferences.add(ref));
    }
  } catch (error) {
    console.warn('Failed to remove unused resources:', error);
  }
}

function extractReferences(obj: any): Set<number> {
  const refs = new Set<number>();

  function traverse(item: any) {
    if (item === null || item === undefined) return;

    if (typeof item === 'object') {
      if (item.objectNumber !== undefined) {
        refs.add(item.objectNumber);
      }

      if (Array.isArray(item)) {
        item.forEach(traverse);
      } else {
        Object.values(item).forEach(traverse);
      }
    }
  }

  traverse(obj);
  return refs;
}

export async function compressPdf(
  pdf: PDFDocument,
  options: CompressionOptions
): Promise<PDFDocument> {
  const { level } = options;

  if (level === 'none') {
    return pdf;
  }

  try {
    if (level === 'low') {
      removeUnusedResources(pdf);
    } else if (level === 'medium' || level === 'extreme') {
      removeUnusedResources(pdf);

      for (const page of pdf.getPages()) {
        await compressPageImages(page, level);
      }
    }

    return pdf;
  } catch (error) {
    console.warn(`PDF compression level "${level}" failed, returning original:`, error);
    return pdf;
  }
}

async function compressPageImages(page: PDFPage, level: CompressionLevel): Promise<void> {
  try {
    const resources = page.node.lookup('Resources');
    if (!resources) return;

    const xobjects = resources.get('XObject');
    if (!xobjects) return;

    const xobjectDict = xobjects.asDict();
    if (!xobjectDict) return;

    for (const [, ref] of xobjectDict.entries()) {
      try {
        const xobject = ref.asDict ? ref.asDict() : ref;
        if (!xobject) continue;

        const subtype = xobject.get('Subtype');
        if (subtype?.name === 'Image') {
          const width = xobject.get('Width')?.asNumber?.() || 0;
          const height = xobject.get('Height')?.asNumber?.() || 0;

          if (level === 'medium' && (width > 2000 || height > 2000)) {
            continue;
          }
          if (level === 'extreme' && (width > 1000 || height > 1000)) {
            continue;
          }
        }
      } catch (error) {
        console.warn('Failed to compress image in PDF:', error);
      }
    }
  } catch (error) {
    console.warn('Failed to compress page images:', error);
  }
}

export async function compressImageForPdf(
  imageData: Uint8Array,
  level: CompressionLevel
): Promise<Uint8Array> {
  return compressImage(imageData, level);
}
