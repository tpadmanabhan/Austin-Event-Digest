const MAX_PDF_BYTES = 150_000;
const MAX_BASE64_LENGTH = 200_000;

/**
 * Decode a one-off digest attachment only when it is a small, intact PDF.
 * The request schema separately validates the filename and base64 alphabet.
 */
export function decodeDigestTestAttachment(contentBase64: string): Buffer | null {
  if (
    contentBase64.length > MAX_BASE64_LENGTH ||
    contentBase64.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(contentBase64)
  ) {
    return null;
  }

  const bytes = Buffer.from(contentBase64, "base64");
  if (
    bytes.length === 0 ||
    bytes.length > MAX_PDF_BYTES ||
    bytes.toString("base64") !== contentBase64 ||
    bytes.subarray(0, 5).toString("ascii") !== "%PDF-"
  ) {
    return null;
  }

  const tail = bytes.subarray(Math.max(0, bytes.length - 2_048));
  if (!tail.includes(Buffer.from("%%EOF", "ascii"))) return null;

  return bytes;
}
