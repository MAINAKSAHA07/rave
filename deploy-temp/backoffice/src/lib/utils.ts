import { getPocketBase } from './pocketbase';

/**
 * Get PocketBase file URL for a record
 * Works in both local and AWS environments
 */
export function getPocketBaseFileUrl(record: any, filename: string): string {
  const pb = getPocketBase();
  return pb.files.getUrl(record, filename);
}
