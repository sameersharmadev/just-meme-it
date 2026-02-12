/** Only allow https: and data: image URLs to prevent XSS via javascript: or other schemes. */
export function isValidImageUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.startsWith('https://') || url.startsWith('data:');
}
