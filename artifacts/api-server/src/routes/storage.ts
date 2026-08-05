import { Readable } from "stream";
import { z } from "zod";
import { Router, type IRouter, type Request, type Response } from "express";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";
import { db, submittedDealsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

// Allowed image MIME types for deal photo uploads
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const RequestUploadUrlBody = z.object({
  name: z.string().min(1).max(500),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES, {
    message: `File size must not exceed ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB`,
  }),
  contentType: z.string().min(1),
});

const RequestUploadUrlResponse = z.object({
  uploadURL: z.string(),
  objectPath: z.string(),
  metadata: z.object({ name: z.string(), size: z.number(), contentType: z.string() }),
});

/**
 * POST /storage/uploads/request-url
 * Public endpoint — allows unauthenticated uploads for community deal photo submissions.
 * Enforces MIME type allowlist and max file size before issuing the presigned URL.
 */
router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    res.status(400).json({ error: "invalid_request", message: firstIssue?.message ?? "Missing or invalid fields" });
    return;
  }

  const { name, size, contentType } = parsed.data;

  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    res.status(400).json({
      error: "invalid_request",
      message: `File type '${contentType}' is not allowed. Accepted: JPG, PNG, WEBP, GIF, HEIC.`,
    });
    return;
  }

  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json(RequestUploadUrlResponse.parse({ uploadURL, objectPath, metadata: { name, size, contentType } }));
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/public-objects/*
 * Serve public assets — unconditionally public, no auth.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const response = await objectStorageService.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 * Serve community deal photos — restricted to paths referenced in the
 * submitted_deals table. Objects not referenced by any deal are denied,
 * preventing exposure of arbitrary private-bucket content.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const imageUrl = `/api/storage${objectPath}`;

    // Gate: only serve objects that are linked to an approved submission
    const [row] = await db
      .select({ id: submittedDealsTable.id })
      .from(submittedDealsTable)
      .where(eq(submittedDealsTable.imageUrl, imageUrl))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Object not found" });
      return;
    }

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
