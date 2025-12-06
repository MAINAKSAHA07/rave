import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { getPocketBase } from './pocketbase';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get PocketBase file URL for a record
 * Works in both local and AWS environments
 * Handles both string and array formats for filename
 */
export function getPocketBaseFileUrl(record: any, filename: string | string[] | null | undefined): string {
  if (!filename || !record) {
    return '';
  }
  
  // Handle array format (when maxSelect > 1 or PocketBase returns array)
  const actualFilename = Array.isArray(filename) ? filename[0] : filename;
  
  if (!actualFilename) {
    return '';
  }
  
  try {
    const pb = getPocketBase();
    const url = pb.files.getUrl(record, actualFilename);
    console.log('[getPocketBaseFileUrl] Generated URL:', {
      record_id: record.id,
      filename: actualFilename,
      url,
    });
    return url;
  } catch (error) {
    console.error('[getPocketBaseFileUrl] Error generating URL:', {
      record_id: record.id,
      filename: actualFilename,
      error,
    });
    return '';
  }
}
