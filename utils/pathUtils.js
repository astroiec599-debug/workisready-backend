// utils/pathUtils.js
import path from 'path';

/**
 * Normalize file paths for consistent storage
 * Converts Windows backslashes to forward slashes
 */
export const normalizeFilePath = (filePath) => {
  if (!filePath) return '';
  
  // Convert backslashes to forward slashes
  const normalized = filePath.replace(/\\/g, '/');
  
  // Remove any duplicate slashes
  return normalized.replace(/\/+/g, '/');
};

/**
 * Extract filename from path
 */
export const getFilenameFromPath = (filePath) => {
  if (!filePath) return '';
  const normalized = normalizeFilePath(filePath);
  return normalized.split('/').pop();
};

/**
 * Get relative path for database storage
 */
export const getRelativePath = (filePath, baseDir = 'uploads') => {
  if (!filePath) return '';
  
  const normalized = normalizeFilePath(filePath);
  const parts = normalized.split(baseDir);
  
  if (parts.length > 1) {
    return baseDir + parts[1];
  }
  
  return normalized;
};

/**
 * Get absolute path for serving files
 */
export const getAbsolutePath = (relativePath) => {
  if (!relativePath) return '';
  return path.join(process.cwd(), normalizeFilePath(relativePath));
};