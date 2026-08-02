import { NextResponse } from "next/server";
import { getCustomerIdentityFromRequest } from "@/lib/server/customer-auth";
import { getStaffPrincipal } from "@/lib/server/staff-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getMediaBindings, MediaInfrastructureError } from "@/lib/server/cloudflare-media";
import { sanitizeDownloadFilename } from "@/lib/media-contract";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}
const CRC_TABLE = buildCrcTable();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTime(date: Date) {
  return (((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() >> 1) & 0x1f)) >>> 0;
}

function dosDate(date: Date) {
  return (((Math.max(1980, date.getFullYear()) - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0x0f) << 5) | (date.getDate() & 0x1f);
}

function nameBytes(name: string) {
  return new TextEncoder().encode(name);
}

function localHeader(name: Uint8Array) {
  const header = new Uint8Array(30);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint32(16, 0, true);
  view.setUint32(20, 0, true);
  view.setUint32(24, 0, true);
  view.setUint16(26, name.length, true);
  return header;
}

function dataDescriptor(crc: number, size: number) {
  const descriptor = new Uint8Array(16);
  const view = new DataView(descriptor.buffer);
  view.setUint32(0, 0x08074b50, true);
  view.setUint32(4, crc, true);
  view.setUint32(8, size, true);
  view.setUint32(12, size, true);
  return descriptor;
}

function centralHeader(nameBytes: Uint8Array, crc: number, size: number, offset: number, date: Date) {
  const header = new Uint8Array(46 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0x0800, true);
  view.setUint16(14, dosTime(date), true);
  view.setUint16(16, dosDate(date), true);
  view.setUint32(18, crc, true);
  view.setUint32(22, size, true);
  view.setUint32(26, size, true);
  view.setUint16(30, nameBytes.length, true);
  view.setUint32(42, offset, true);
  header.set(nameBytes, 46);
  return header;
}

function eocd(count: number, centralSize: number, centralOffset: number) {
  const bytes = new Uint8Array(22);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, count, true);
  view.setUint16(10, count, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  return bytes;
}

export async function GET(_request: Request, { params }: { params: Promise<{ galleryId: string }> }) {
  const { galleryId } = await params;
  if (!UUID.test(galleryId)) return NextResponse.json({ error: "Gallery not found." }, { status: 404 });

  const admin = getSupabaseAdmin();
  const galleryResult = await admin.from("galleries").select("id,title,client_id,status,published,expires_at,downloads_enabled").eq("id", galleryId).maybeSingle();
  if (galleryResult.error || !galleryResult.data) return NextResponse.json({ error: "Gallery not found." }, { status: 404 });
  const gallery = galleryResult.data;
  if (!gallery.downloads_enabled || gallery.status !== "published" || !gallery.published) {
    return NextResponse.json({ error: "Downloads are not enabled for this gallery." }, { status: 403 });
  }

  const customer = await getCustomerIdentityFromRequest(_request);
  const staff = customer ? null : await getStaffPrincipal(_request);
  const authorized = staff || (customer && gallery.client_id === customer.clientId);
  if (!authorized) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!staff && gallery.expires_at && new Date(gallery.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "This gallery has expired." }, { status: 403 });
  }

  const linksResult = await admin.from("gallery_assets").select("media_asset_id,download_variant")
    .eq("gallery_id", galleryId)
    .eq("visibility", "gallery")
    .eq("approval_status", "approved")
    .eq("downloadable", true)
    .order("order", { ascending: true });
  if (linksResult.error) return NextResponse.json({ error: "Unable to build archive." }, { status: 500 });
  const links = linksResult.data ?? [];
  const assetIds = links.map((l) => l.media_asset_id).filter((id): id is string => Boolean(id));
  const mediaResult = await admin.from("media_assets").select("id,original_filename").in("id", assetIds).eq("status", "ready");
  if (mediaResult.error) return NextResponse.json({ error: "Unable to load media." }, { status: 500 });
  const mediaById = new Map((mediaResult.data ?? []).map((m) => [m.id, m]));

  let bindings: Awaited<ReturnType<typeof getMediaBindings>>;
  try {
    bindings = await getMediaBindings();
  } catch (error) {
    const message = error instanceof MediaInfrastructureError ? error.message : "Media infrastructure is unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  if (!links.length) return NextResponse.json({ error: "There are no downloadable images in this gallery." }, { status: 409 });

  const archiveName = sanitizeDownloadFilename(`${gallery.title} - download`);
  const downloadStamp = new Date();

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const entries: Array<{ name: Uint8Array; bytes: Uint8Array; crc: number; offset: number }> = [];
      let offset = 0;
      for (const link of links) {
        const assetId = link.media_asset_id;
        if (!assetId) continue;
        const row = mediaById.get(assetId);
        if (!row) continue;
        const derivativeName = (link.download_variant ?? "web") === "watermarked" ? "gallery-preview-watermarked" : "gallery-preview";
        const object = await bindings.clientMedia.get(`derivatives/${row.id}/${derivativeName}.webp`);
        if (!object) continue;
        const bytes = new Uint8Array(await object.arrayBuffer());
        const extension = row.original_filename?.match(/\.[^.]+$/)?.[0] ?? ".webp";
        const base = sanitizeDownloadFilename((row.original_filename ?? row.id).replace(/\.[^.]+$/, ""));
        entries.push({ name: nameBytes(`${base}${extension}`), bytes, crc: crc32(bytes), offset });
        offset += 30 + bytes.length;
      }
      if (!entries.length) { controller.error(new Error("No downloadable assets available.")); return; }

      let runningOffset = 0;
      const localPieces: Uint8Array[] = [];
      const centralPieces: Uint8Array[] = [];
      for (const entry of entries) {
        entry.offset = runningOffset;
        localPieces.push(localHeader(entry.name), entry.bytes, dataDescriptor(entry.crc, entry.bytes.length));
        centralPieces.push(centralHeader(entry.name, entry.crc, entry.bytes.length, runningOffset, downloadStamp));
        runningOffset += 30 + entry.bytes.length + 16;
      }
      const centralBytes = centralPieces.reduce((acc, piece) => { const out = new Uint8Array(acc.length + piece.length); out.set(acc, 0); out.set(piece, acc.length); return out; }, new Uint8Array(0));
      controller.enqueue(concat(localPieces));
      controller.enqueue(centralBytes);
      controller.enqueue(eocd(entries.length, centralBytes.length, runningOffset));
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${archiveName}.zip"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const part of parts) { out.set(part, cursor); cursor += part.length; }
  return out;
}