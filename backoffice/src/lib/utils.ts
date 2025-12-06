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
 * Uses API proxy for hosted environments to handle authentication and CORS
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
    // Check if we're in a hosted environment (not localhost)
    const isHosted = typeof window !== 'undefined' && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1';
    
    if (isHosted) {
      // In hosted environments, always use the proxy route to handle CORS and authentication
      const collectionId = record.collectionId || record.collectionName || 'venues';
      const recordId = record.id;
      const encodedFilename = encodeURIComponent(actualFilename).replace(/%2F/g, '/');
      const proxyUrl = `/api/pocketbase/api/files/${collectionId}/${recordId}/${encodedFilename}`;
      
      console.log('[getPocketBaseFileUrl] Using proxy URL for hosted environment:', {
        record_id: recordId,
        filename: actualFilename,
        proxyUrl,
        collectionId,
      });
      
      return proxyUrl;
    } else {
      // For localhost, use PocketBase SDK to generate direct URL
      const pb = getPocketBase();
      const url = pb.files.getUrl(record, actualFilename);
      
      console.log('[getPocketBaseFileUrl] Generated direct URL for localhost:', {
        record_id: record.id,
        filename: actualFilename,
        url,
      });
      
      return url;
    }
  } catch (error) {
    console.error('[getPocketBaseFileUrl] Error generating URL:', {
      record_id: record?.id,
      filename: actualFilename,
      error,
    });
    return '';
  }
}
