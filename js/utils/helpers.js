/**
 * Docs Manager - Utility Helpers
 */

/**
 * Extract Google Drive Folder ID from a full URL, share link, or raw ID
 * Supports:
 * - https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ
 * - https://drive.google.com/drive/u/0/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ
 * - https://drive.google.com/open?id=1aBcDeFgHiJkLmNoPqRsTuVwXyZ
 * - 1aBcDeFgHiJkLmNoPqRsTuVwXyZ (raw 28-33 char ID)
 */
export function extractFolderId(input) {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim();

  // Pattern for /folders/<ID>
  const folderMatch = clean.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }

  // Pattern for ?id=<ID>
  const idParamMatch = clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  // Direct ID check (Google Drive IDs are typically alphanumeric with dashes/underscores, 15-50 chars)
  if (/^[a-zA-Z0-9_-]{15,50}$/.test(clean)) {
    return clean;
  }

  return null;
}

/**
 * Format bytes into human readable string (KB, MB, GB)
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format ISO date string into readable format
 */
export function formatDate(isoString) {
  if (!isoString) return 'Unknown';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Auto-detect category based on document filename heuristics
 */
export function detectCategory(filename) {
  if (!filename) return 'Other';
  const lower = filename.toLowerCase();

  if (/aadhar|aadhaar|pan|passport|voter|license|licence|id[ _-]|birth|certificate/i.test(lower)) {
    return 'Personal';
  }
  if (/bank|statement|hdfc|sbi|icici|axis|cheque|check|passbook|salary|payslip|tax|itr|form16/i.test(lower)) {
    return 'Banking';
  }
  if (/property|deed|registry|land|house|flat|plot|rent|lease|agreement|mortgage/i.test(lower)) {
    return 'Property';
  }
  if (/degree|marksheet|diploma|school|college|university|transcript|education|semester/i.test(lower)) {
    return 'Education';
  }
  if (/insurance|policy|lic|mediclaim|premium|coverage/i.test(lower)) {
    return 'Insurance';
  }
  if (/medical|doctor|prescription|hospital|clinic|report|lab|blood|vaccine|covid/i.test(lower)) {
    return 'Medical';
  }
  if (/gov|government|ration|electricity|bill|utility|affidavit|court|notary/i.test(lower)) {
    return 'Government';
  }

  return 'Other';
}

/**
 * Return category theme styling
 */
export function getCategoryBadge(category) {
  const map = {
    Personal: { bg: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA' },
    Banking: { bg: 'rgba(16, 185, 129, 0.15)', color: '#34D399' },
    Property: { bg: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24' },
    Education: { bg: 'rgba(168, 85, 247, 0.15)', color: '#C084FC' },
    Insurance: { bg: 'rgba(20, 184, 166, 0.15)', color: '#2DD4BF' },
    Medical: { bg: 'rgba(244, 63, 94, 0.15)', color: '#FB7185' },
    Government: { bg: 'rgba(99, 102, 241, 0.15)', color: '#818CF8' },
    Other: { bg: 'rgba(148, 163, 184, 0.15)', color: '#94A3B8' }
  };
  return map[category] || map.Other;
}

/**
 * Check if mimeType or filename is an Image
 */
export function isImageFile(mimeType, filename = '') {
  if (mimeType && mimeType.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(filename);
}

/**
 * Check if mimeType or filename is a PDF
 */
export function isPdfFile(mimeType, filename = '') {
  if (mimeType === 'application/pdf') return true;
  return /\.pdf$/i.test(filename);
}

/**
 * Sanitize string for safe innerHTML injection
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Trigger explicit export of a Blob to normal device Downloads storage
 * CRITICAL SEPARATION RULE:
 * This is ONLY called when the user explicitly clicks the "Download" button.
 * "Keep Offline" uses private IndexedDB storage and never triggers this function.
 */
export function exportFileToDevice(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'document';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
