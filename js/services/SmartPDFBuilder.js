/**
 * Docs Manager - Smart PDF Builder Engine
 * 
 * CORE FEATURES (Section 14):
 * - 100% In-Browser PDF creation & merging via pdf-lib
 * - Converts Images (JPG, PNG, WebP) into PDF pages
 * - Merges multiple PDFs preserving original page order
 * - Fully functional both Online and Offline (uses decrypted offline blobs)
 * - Zero third-party cloud conversion dependencies (100% Private & Free)
 */

import { OfflineStorageService } from './OfflineStorageService.js';
import { GoogleDriveService } from './GoogleDriveService.js';
import { isPdfFile, isImageFile } from '../utils/helpers.js';

class SmartPDFBuilderClass {
  /**
   * Ensure PDFLib is loaded
   */
  async ensurePDFLib() {
    if (window.PDFLib) return window.PDFLib;
    
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window.PDFLib) {
          clearInterval(interval);
          resolve(window.PDFLib);
        } else if (attempts > 30) {
          clearInterval(interval);
          reject(new Error('PDF-Lib engine could not be loaded. Check your internet connection or cached assets.'));
        }
      }, 150);
    });
  }

  /**
   * Acquire binary ArrayBuffer for an item (either from decrypted offline vault or Google Drive)
   */
  async getItemBuffer(item) {
    const fileId = item.id || item.fileId;

    // 1. Check offline storage first
    const offlineDoc = await OfflineStorageService.getDecryptedDocument(fileId);
    if (offlineDoc && offlineDoc.rawBuffer) {
      return { buffer: offlineDoc.rawBuffer, source: 'offline' };
    }

    // 2. Fetch from Google Drive
    const rawBuffer = await GoogleDriveService.downloadFileBuffer(fileId);
    return { buffer: rawBuffer, source: 'online' };
  }

  /**
   * Convert an image buffer (including WebP/GIF) into clean PNG/JPEG bytes via Canvas
   */
  async convertImageToJpegBytes(imageBuffer, mimeType) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([imageBuffer], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        // White background for transparent PNG/WebP
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((convertedBlob) => {
          if (!convertedBlob) {
            reject(new Error('Failed to process image in canvas.'));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve({ bytes: new Uint8Array(reader.result), width: canvas.width, height: canvas.height });
          reader.onerror = (e) => reject(e);
          reader.readAsArrayBuffer(convertedBlob);
        }, 'image/jpeg', 0.92);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for PDF embedding.'));
      };

      img.src = url;
    });
  }

  /**
   * Build single combined PDF from selected collection documents
   * @param {Array} items - Array of document items
   * @param {Object} options - Customization options
   * @param {Function} onProgress - Progress reporter callback
   * @returns {Promise<Blob>}
   */
  async buildCombinedPDF(items, options = {}, onProgress = () => {}) {
    if (!items || items.length === 0) {
      throw new Error('No documents selected in collection.');
    }

    const {
      pageSize = 'A4',         // 'A4' | 'Letter' | 'Original'
      orientation = 'portrait', // 'portrait' | 'landscape'
      imageFit = 'contain',     // 'contain' | 'fill'
      margin = 18,              // Points (0, 18, 36)
      title = 'Docs_Manager_Combined'
    } = options;

    onProgress(10, 'Initializing in-browser PDF engine...');
    const PDFLib = await this.ensurePDFLib();
    const { PDFDocument, rgb } = PDFLib;

    const mergedPdf = await PDFDocument.create();
    mergedPdf.setTitle(title);
    mergedPdf.setProducer('Docs Manager PWA - Secure Family Management');

    // Page dimensions in PDF points (72 points = 1 inch)
    let standardWidth = 595.28; // A4 portrait width
    let standardHeight = 841.89; // A4 portrait height

    if (pageSize === 'Letter') {
      standardWidth = 612;
      standardHeight = 792;
    }

    if (orientation === 'landscape') {
      const temp = standardWidth;
      standardWidth = standardHeight;
      standardHeight = temp;
    }

    const total = items.length;

    for (let i = 0; i < total; i++) {
      const item = items[i];
      const stepPercent = Math.round(15 + ((i / total) * 75));
      onProgress(stepPercent, `Processing (${i + 1}/${total}): ${item.name}...`);

      try {
        const { buffer } = await this.getItemBuffer(item);

        if (isPdfFile(item.mimeType, item.name)) {
          // Process Existing PDF
          const srcPdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
          const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
          for (const page of copiedPages) {
            mergedPdf.addPage(page);
          }
        } else if (isImageFile(item.mimeType, item.name)) {
          // Process Image
          const { bytes, width: imgW, height: imgH } = await this.convertImageToJpegBytes(buffer, item.mimeType);
          const embeddedImage = await mergedPdf.embedJpg(bytes);

          let pageWidth = standardWidth;
          let pageHeight = standardHeight;

          if (pageSize === 'Original') {
            pageWidth = imgW;
            pageHeight = imgH;
          }

          const page = mergedPdf.addPage([pageWidth, pageHeight]);

          // Calculate draw dimensions taking margins into account
          const availW = pageWidth - (margin * 2);
          const availH = pageHeight - (margin * 2);

          let drawW = availW;
          let drawH = availH;
          let drawX = margin;
          let drawY = margin;

          if (imageFit === 'contain') {
            const scale = Math.min(availW / imgW, availH / imgH);
            drawW = imgW * scale;
            drawH = imgH * scale;
            // Center in available area
            drawX = margin + ((availW - drawW) / 2);
            drawY = margin + ((availH - drawH) / 2);
          }

          page.drawImage(embeddedImage, {
            x: drawX,
            y: drawY,
            width: drawW,
            height: drawH
          });
        }
      } catch (err) {
        console.error(`[SmartPDFBuilder] Error processing item ${item.name}:`, err);
        throw new Error(`Failed to process "${item.name}": ${err.message}`);
      }
    }

    onProgress(95, 'Finalizing combined PDF bytes...');
    const pdfBytes = await mergedPdf.save();
    onProgress(100, 'Complete!');

    return new Blob([pdfBytes], { type: 'application/pdf' });
  }
}

export const SmartPDFBuilder = new SmartPDFBuilderClass();
