import { describe, expect, it } from "vitest";
import { decodeDigestTestAttachment } from "./digestTestAttachment";

const validPdfBase64 = Buffer.from("%PDF-1.4\n1 0 obj << >> endobj\n%%EOF\n").toString("base64");

describe("decodeDigestTestAttachment", () => {
  it("accepts a bounded PDF payload and returns its bytes", () => {
    expect(decodeDigestTestAttachment(validPdfBase64)?.toString("ascii")).toContain("%PDF-1.4");
  });

  it("rejects malformed base64, non-PDF content, and truncated PDFs", () => {
    expect(decodeDigestTestAttachment("%%%=")).toBeNull();
    expect(decodeDigestTestAttachment(Buffer.from("not a PDF").toString("base64"))).toBeNull();
    expect(decodeDigestTestAttachment(Buffer.from("%PDF-1.4\nno eof").toString("base64"))).toBeNull();
  });

  it("rejects oversized attachments", () => {
    const tooLarge = Buffer.alloc(150_001);
    Buffer.from("%PDF-1.4").copy(tooLarge);
    Buffer.from("%%EOF").copy(tooLarge, tooLarge.length - 5);
    expect(decodeDigestTestAttachment(tooLarge.toString("base64"))).toBeNull();
  });
});
