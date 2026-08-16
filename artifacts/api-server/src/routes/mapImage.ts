import { Router, type Request, type Response } from "express";
import sharp from "sharp";

const router = Router();

/** Convert lat/lng to absolute pixel coordinates at a given zoom */
function latLngToPixel(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const px = ((lng + 180) / 360) * n * 256;
  const latRad = (lat * Math.PI) / 180;
  const py =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    n *
    256;
  return { px, py };
}

async function fetchTile(z: number, x: number, y: number): Promise<Buffer | null> {
  const maxTile = Math.pow(2, z);
  if (x < 0 || y < 0 || x >= maxTile || y >= maxTile) return null;
  try {
    const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    const res = await fetch(url, {
      headers: { "User-Agent": "EventCarpooling/1.0 (eventcarpooling.com)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

router.get("/map-image", async (req: Request, res: Response) => {
  try {
    // Parse params
    const centerStr = String(req.query.center ?? "30.267,-97.743");
    const [latStr, lngStr] = centerStr.split(",");
    const lat = parseFloat(latStr ?? "30.267");
    const lng = parseFloat(lngStr ?? "-97.743");
    const zoom = Math.min(16, Math.max(1, parseInt(String(req.query.zoom ?? "10"))));
    const sizeStr = String(req.query.size ?? "580x260");
    const [wStr, hStr] = sizeStr.split("x");
    const width = Math.min(800, Math.max(100, parseInt(wStr ?? "580")));
    const height = Math.min(600, Math.max(100, parseInt(hStr ?? "260")));
    const markersStr = String(req.query.markers ?? "");

    // Parse markers: "lat,lng,color|lat,lng,color"
    const markers: { lat: number; lng: number; featured: boolean }[] = [];
    if (markersStr) {
      for (const m of markersStr.split("|")) {
        const parts = m.split(",");
        if (parts.length >= 2) {
          const mlat = parseFloat(parts[0] ?? "0");
          const mlng = parseFloat(parts[1] ?? "0");
          if (isFinite(mlat) && isFinite(mlng)) {
            markers.push({ lat: mlat, lng: mlng, featured: (parts[2] ?? "") === "yellow" });
          }
        }
      }
    }

    // Compute origin pixel (top-left corner of canvas)
    const center = latLngToPixel(lat, lng, zoom);
    const originPxX = center.px - width / 2;
    const originPxY = center.py - height / 2;

    // Determine which tiles cover the canvas
    const originTileX = Math.floor(originPxX / 256);
    const originTileY = Math.floor(originPxY / 256);
    const endTileX = Math.floor((originPxX + width) / 256);
    const endTileY = Math.floor((originPxY + height) / 256);

    // Fetch all tiles in parallel
    const tileJobs: Promise<{ tx: number; ty: number; buf: Buffer | null }>[] = [];
    for (let tx = originTileX; tx <= endTileX; tx++) {
      for (let ty = originTileY; ty <= endTileY; ty++) {
        tileJobs.push(fetchTile(zoom, tx, ty).then((buf) => ({ tx, ty, buf })));
      }
    }
    const tileResults = await Promise.all(tileJobs);

    // Build sharp composite inputs for tiles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const composites: any[] = [];
    for (const { tx, ty, buf } of tileResults) {
      if (!buf) continue;
      const left = Math.round(tx * 256 - originPxX);
      const top = Math.round(ty * 256 - originPxY);
      composites.push({ input: buf, left, top });
    }

    // Build SVG marker overlay
    const svgPins: string[] = [];
    for (const m of markers) {
      const { px, py } = latLngToPixel(m.lat, m.lng, zoom);
      const cx = Math.round(px - originPxX);
      const cy = Math.round(py - originPxY);
      if (cx < -20 || cx > width + 20 || cy < -20 || cy > height + 20) continue;

      const fill   = m.featured ? "#f59e0b" : "#7c3aed";
      const stroke = m.featured ? "#92400e" : "#4c1d95";
      // Teardrop pin shape: circle + stem pointing down
      svgPins.push(`
        <circle cx="${cx}" cy="${cy - 10}" r="10" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
        <circle cx="${cx}" cy="${cy - 10}" r="4"  fill="white" opacity="0.9"/>
        <polygon points="${cx - 4},${cy - 3} ${cx + 4},${cy - 3} ${cx},${cy + 3}"
                 fill="${fill}" stroke="${stroke}" stroke-width="1"/>
      `);
    }

    const markerSvgBuf =
      svgPins.length > 0
        ? Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${svgPins.join("")}</svg>`
          )
        : null;

    if (markerSvgBuf) {
      composites.push({ input: markerSvgBuf, left: 0, top: 0 });
    }

    // Compose final image
    const base = sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 200, g: 215, b: 200 }, // subtle green-grey fallback
      },
    });

    const png = await (composites.length > 0 ? base.composite(composites) : base)
      .png()
      .toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600");
    res.send(png);
  } catch (err) {
    console.error("map-image error:", err);
    // Fallback: grey rectangle so the email slot isn't broken
    const fallback = await sharp({
      create: { width: 580, height: 260, channels: 3, background: { r: 235, g: 235, b: 235 } },
    })
      .png()
      .toBuffer();
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(fallback);
  }
});

export default router;
