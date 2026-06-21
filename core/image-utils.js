"use strict";

const fs = require("fs");
const path = require("path");

const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Read native width/height from PNG or JPEG buffer.
 * Returns { width, height, format } or throws.
 */
function getImageDimensions(buf) {
  if (!Buffer.isBuffer(buf)) {
    buf = Buffer.from(buf);
  }

  // PNG: signature 89 50 4E 47, dimensions in IHDR at bytes 16-23
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height, format: "PNG" };
  }

  // JPEG: signature FF D8
  if (buf.length >= 4 && buf[0] === 0xFF && buf[1] === 0xD8) {
    let offset = 2;
    while (offset < buf.length - 1) {
      if (buf[offset] !== 0xFF) {
        offset++;
        continue;
      }
      const marker = buf[offset + 1];

      // SOF markers: C0-C3, C5-C7, C9-CB, CD-CF
      if (
        (marker >= 0xC0 && marker <= 0xC3) ||
        (marker >= 0xC5 && marker <= 0xC7) ||
        (marker >= 0xC9 && marker <= 0xCB) ||
        (marker >= 0xCD && marker <= 0xCF)
      ) {
        // offset+2 = length (2 bytes), offset+4 = precision (1 byte)
        // offset+5 = height (2 bytes), offset+7 = width (2 bytes)
        if (offset + 8 < buf.length) {
          const height = buf.readUInt16BE(offset + 5);
          const width = buf.readUInt16BE(offset + 7);
          return { width, height, format: "JPEG" };
        }
      }

      // Skip marker segment
      if (marker === 0xD0 || marker === 0xD1 || marker === 0xD2 || marker === 0xD3 ||
          marker === 0xD4 || marker === 0xD5 || marker === 0xD6 || marker === 0xD7 ||
          marker === 0xD8 || marker === 0xD9 || marker === 0x01) {
        offset += 2;
        continue;
      }

      if (offset + 3 < buf.length) {
        const segLen = buf.readUInt16BE(offset + 2);
        offset += 2 + segLen;
      } else {
        break;
      }
    }
    throw new Error("JPEG file: could not find SOF marker for dimensions");
  }

  throw new Error("Unsupported image format. Only PNG and JPEG are supported.");
}

/**
 * Resolve and validate an image `src` path.
 * Only relative paths inside the current working directory are allowed.
 * Returns the absolute resolved path.
 *
 * @param {string} src - Relative path from source JSON
 * @param {string} [index] - Operation index for error messages
 * @returns {string}
 */
function resolveImagePath(src, index) {
  const prefix = index ? `Operation ${index} (image) ` : "image ";
  if (!src || typeof src !== "string") {
    throw new Error(`${prefix}missing "src" field`);
  }
  if (path.isAbsolute(src) || src.includes("\0")) {
    throw new Error(`${prefix}"src" must be a relative path: "${src}"`);
  }
  const imageBaseDir = path.resolve(process.cwd());
  const resolvedPath = path.resolve(imageBaseDir, src);
  if (resolvedPath !== imageBaseDir && !resolvedPath.startsWith(imageBaseDir + path.sep)) {
    throw new Error(`${prefix}"src" escapes the working directory: "${src}"`);
  }
  return resolvedPath;
}

/**
 * Read an image file with size limits.
 *
 * @param {string} resolvedPath
 * @param {string} [index]
 * @param {number} [maxSizeBytes]
 * @returns {Buffer}
 */
function readImageFile(resolvedPath, index, maxSizeBytes = MAX_IMAGE_SIZE_BYTES) {
  const prefix = index ? `Operation ${index} (image) ` : "image ";
  let stats;
  try {
    stats = fs.statSync(resolvedPath);
  } catch (err) {
    throw new Error(`${prefix}could not stat file "${resolvedPath}": ${err.message}`);
  }
  if (stats.size > maxSizeBytes) {
    throw new Error(`${prefix}file exceeds ${maxSizeBytes} bytes: "${resolvedPath}"`);
  }
  let buf;
  try {
    buf = fs.readFileSync(resolvedPath);
  } catch (err) {
    throw new Error(`${prefix}could not read file "${resolvedPath}": ${err.message}`);
  }
  if (!buf || buf.length === 0) {
    throw new Error(`${prefix}file is empty: "${resolvedPath}"`);
  }
  return buf;
}

/**
 * Resolve display dimensions from source operation and content bounds.
 *
 * @param {object} op - Operation with width/widthMm/heightMm
 * @param {number} nativeW - Native image width in pixels
 * @param {number} nativeH - Native image height in pixels
 * @param {number} contentWidthMm - Available content width in mm
 * @returns {{ widthMm: number, heightMm: number }}
 */
function resolveImageSize(op, nativeW, nativeH, contentWidthMm) {
  const ratio = nativeH / nativeW;

  // Explicit mm for both dimensions (may distort)
  if (op.widthMm !== undefined && op.heightMm !== undefined) {
    return { widthMm: Number(op.widthMm), heightMm: Number(op.heightMm) };
  }

  // Percentage width, derive height from aspect ratio
  if (op.width !== undefined) {
    const pctStr = String(op.width);
    let widthMm;
    if (pctStr.endsWith("%")) {
      const pct = parseFloat(pctStr) / 100;
      widthMm = contentWidthMm * pct;
    } else {
      widthMm = parseFloat(pctStr);
    }
    return { widthMm, heightMm: widthMm * ratio };
  }

  // Explicit widthMm only, derive height
  if (op.widthMm !== undefined) {
    const widthMm = Number(op.widthMm);
    return { widthMm, heightMm: widthMm * ratio };
  }

  // Explicit heightMm only, derive width
  if (op.heightMm !== undefined) {
    const heightMm = Number(op.heightMm);
    return { widthMm: heightMm / ratio, heightMm };
  }

  // Default: fill content width
  return { widthMm: contentWidthMm, heightMm: contentWidthMm * ratio };
}

module.exports = {
  getImageDimensions,
  resolveImageSize,
  resolveImagePath,
  readImageFile,
  MAX_IMAGE_SIZE_BYTES,
};
