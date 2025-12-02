/**
 * Generate a unique ticket code
 * Format: TKT-{timestamp}-{random}
 */
export function generateTicketCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 8).toUpperCase();
  return `TKT-${timestamp}-${random}`;
}

/**
 * Validate ticket code format
 */
export function isValidTicketCode(code: string): boolean {
  return /^TKT-[A-Z0-9]+-[A-Z0-9]+$/.test(code);
}

