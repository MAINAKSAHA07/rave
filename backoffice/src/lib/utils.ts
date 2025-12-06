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
      // Use API proxy for hosted environments to handle CORS and authentication
      // Get collection ID from the record or infer from context
      // PocketBase stores collection ID in the record, but we need to get it from the collection name
      const pb = getPocketBase();
      let collectionId = record.collectionId;
      
      // If collectionId is not available, try to get it from the collection name
      if (!collectionId) {
        // Try common collection names and their IDs
        // For venues collection, we need to get the actual collection ID
        // Since we're in a hosted environment, use the proxy for file access
        // The collection ID format in PocketBase is usually a short string
        // We'll use the collection name as fallback and let PocketBase handle it
        const collectionName = record.collectionName || 'venues';
        // For now, we'll construct the URL and let the proxy figure out the collection ID
        // The proxy will need to look up the collection ID from the collection name
        collectionId = collectionName;
      }
      
      const recordId = record.id;
      // Encode filename to handle special characters and slashes
      const encodedFilename = encodeURIComponent(actualFilename).replace(/%2F/g, '/');
      const proxyUrl = `/api/pocketbase/api/files/${collectionId}/${recordId}/${encodedFilename}`;
      
      console.log('[getPocketBaseFileUrl] Using proxy URL for hosted environment:', {
        record_id: recordId,
        filename: actualFilename,
        proxyUrl,
        collectionId,
        record_keys: Object.keys(record),
      });
      
      return proxyUrl;
    } else {
      // Use direct URL for localhost
      const pb = getPocketBase();
      const url = pb.files.getUrl(record, actualFilename);
      
      console.log('[getPocketBaseFileUrl] Generated direct URL:', {
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
