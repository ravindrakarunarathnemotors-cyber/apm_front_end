// Simple Base64 encoding (for obfuscation)
export function encodeId(id) {
  return Buffer.from(id.toString()).toString('base64');
}

export function decodeId(encoded) {
  try {
    // First, decode URL encoding
    const decodedUrl = decodeURIComponent(encoded);
    // Then decode Base64
    return Buffer.from(decodedUrl, 'base64').toString('utf-8');
  } catch (err) {
    console.error('Failed to decode ID:', err);
    return encoded; // fallback
  }
}
