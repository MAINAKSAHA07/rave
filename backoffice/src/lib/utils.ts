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
export function getPocketBaseFileUrl(record: any, filename: string | string[] | null | undefined, collectionName?: string): string {
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
      // In hosted environments, use the proxy route to handle CORS and authentication
      // Try to determine collection name from record or use provided parameter
      let collectionId = collectionName || record.collectionId || record.collectionName;
      
      // If we still don't have a collection name, try to infer from record structure
      // This is a fallback - ideally collectionName should be passed
      if (!collectionId) {
        // Common collection names based on typical record fields
        if (record.venue_id !== undefined || record.layout_image !== undefined) {
          collectionId = 'venues';
        } else if (record.event_id !== undefined || record.ticket_type_id !== undefined) {
          collectionId = 'tickets';
        } else if (record.organizer_id !== undefined || record.venue_id !== undefined || record.start_date !== undefined) {
          collectionId = 'events';
        } else if (record.price_minor !== undefined || record.event_id !== undefined) {
          collectionId = 'ticket_types';
        } else {
          collectionId = 'events'; // Default fallback
        }
      }
      
      const recordId = record.id;
      const encodedFilename = encodeURIComponent(actualFilename).replace(/%2F/g, '/');
      const proxyUrl = `/api/pocketbase/api/files/${collectionId}/${recordId}/${encodedFilename}`;
      return proxyUrl;
    } else {
      // For localhost, use PocketBase SDK to generate direct URL
      const pb = getPocketBase();
      const url = pb.files.getUrl(record, actualFilename);
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
