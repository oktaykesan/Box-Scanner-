// BoxScan — Magic Byte Validation
//
// Validates actual file content against known image magic bytes.
// This is an additional layer on top of the MIME type check —
// it prevents content-type spoofing where a client sends a malicious
// file with a valid image MIME header.
//
// Supported signatures:
//   JPEG  : FF D8 FF  (offset 0, 3 bytes)
//   PNG   : 89 50 4E 47 0D 0A 1A 0A  (offset 0, 8 bytes)
//   WebP  : 52 49 46 46 ?? ?? ?? ?? 57 45 42 50  (RIFF....WEBP)
//   HEIC/HEIF: 66 74 79 70  (ftyp box, offset 4, 4 bytes)

export function validateMagicBytes(buf: Buffer): boolean {
    if (buf.length < 12) return false;

    // JPEG: starts with FF D8 FF
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
        return true;
    }

    // PNG: 8-byte signature 89 50 4E 47 0D 0A 1A 0A
    if (
        buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
        buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
    ) {
        return true;
    }

    // WebP: bytes 0-3 = "RIFF", bytes 8-11 = "WEBP"
    if (
        buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
        buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
    ) {
        return true;
    }

    // HEIC/HEIF: "ftyp" box at offset 4 (66 74 79 70)
    if (
        buf.length >= 8 &&
        buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70
    ) {
        return true;
    }

    return false;
}
