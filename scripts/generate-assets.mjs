import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// ---------------------------------------------------------------------------
// PNG Encoder (Pure Node.js + zlib)
// ---------------------------------------------------------------------------

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[i] = c >>> 0;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

export function createPng(width, height, getPixel) {
  const rowLen = width * 4 + 1;
  const raw = Buffer.alloc(rowLen * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    raw[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const pxOffset = rowOffset + 1 + x * 4;
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a !== undefined ? a : 255;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// ---------------------------------------------------------------------------
// ICO Builder (Wraps 32x32 PNG payload)
// ---------------------------------------------------------------------------

export function createIcoFromPng(pngBuffer, width = 32, height = 32) {
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // reserved
  icoHeader.writeUInt16LE(1, 2); // type 1 = ICO
  icoHeader.writeUInt16LE(1, 4); // count of images = 1

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(width === 256 ? 0 : width, 0);
  dirEntry.writeUInt8(height === 256 ? 0 : height, 1);
  dirEntry.writeUInt8(0, 2); // color palette count
  dirEntry.writeUInt8(0, 3); // reserved
  dirEntry.writeUInt16LE(1, 4); // color planes
  dirEntry.writeUInt16LE(32, 6); // bits per pixel
  dirEntry.writeUInt32LE(pngBuffer.length, 8); // size of image data
  dirEntry.writeUInt32LE(22, 12); // offset of image data (6 header + 16 dir)

  return Buffer.concat([icoHeader, dirEntry, pngBuffer]);
}

// ---------------------------------------------------------------------------
// Minimal Valid Baseline JPEG Encoder
// ---------------------------------------------------------------------------

export function createSimpleJpeg(width, height, getRgb) {
  // We can write a baseline uncompressed or DCT-based standard JFIF JPEG,
  // or use an established standard JFIF stream.
  // Standard JFIF header:
  // SOI (FF D8), APP0 (FF E0), DQT (FF DB), SOF0 (FF C0), DHT (FF C4), SOS (FF DA), Scan data, EOI (FF D9).
  // For simplicity and 100% standards conformance across all social scrapers,
  // we can generate a valid 1200x630 JFIF JPEG file.
  // A minimal valid single-scan JFIF:
  // Let's implement a robust baseline 8x8 block encoder.
  // Standard luminance and chrominance quantization tables:
  const qTable = new Uint8Array([
    16, 11, 10, 16, 24, 40, 51, 61,
    12, 12, 14, 19, 26, 58, 60, 55,
    14, 13, 16, 24, 40, 57, 69, 56,
    14, 17, 22, 29, 51, 87, 80, 62,
    18, 22, 37, 56, 68, 109, 103, 77,
    24, 35, 55, 64, 81, 104, 113, 92,
    49, 64, 78, 87, 103, 121, 120, 101,
    72, 92, 95, 98, 112, 100, 103, 99
  ]);

  // If writing a full DCT JPEG from scratch is complex, we can use a small BMP/PPM to JPEG or write uncompressed JPEG.
  // But wait! Facebook, Twitter, LinkedIn, Google all prefer and accept PNG for og:image!
  // In fact, og:image can be og-image.png, and og-image.jpg can also be provided.
  // Let's see if we can create og-image.png as primary, and we can test creating og-image.jpg as well.
}
