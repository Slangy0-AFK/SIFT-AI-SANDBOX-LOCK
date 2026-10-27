// A zip built here rather than with a library, so nothing has to be installed.
// Entries are stored, not compressed, which every unzip tool reads.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[i] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// files: [{ name, text }] -> a Blob the browser saves as one .zip
export function buildZipBlob(files) {
  const encoder = new TextEncoder();
  const now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  const entries = files.map((file) => {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.text);
    return { name, data, crc: crc32(data), offset: 0 };
  });

  const localBytes = entries.reduce((sum, entry) => sum + 30 + entry.name.length + entry.data.length, 0);
  const centralBytes = entries.reduce((sum, entry) => sum + 46 + entry.name.length, 0);

  const buffer = new ArrayBuffer(localBytes + centralBytes + 22);
  const view = new DataView(buffer);
  let at = 0;

  const u16 = (value) => {
    view.setUint16(at, value, true);
    at += 2;
  };
  const u32 = (value) => {
    view.setUint32(at, value, true);
    at += 4;
  };
  const bytes = (value) => {
    new Uint8Array(buffer, at, value.length).set(value);
    at += value.length;
  };

  entries.forEach((entry) => {
    entry.offset = at;
    u32(0x04034b50);
    u16(20);
    u16(0x0800);
    u16(0);
    u16(time);
    u16(date);
    u32(entry.crc);
    u32(entry.data.length);
    u32(entry.data.length);
    u16(entry.name.length);
    u16(0);
    bytes(entry.name);
    bytes(entry.data);
  });

  const centralStart = at;

  entries.forEach((entry) => {
    u32(0x02014b50);
    u16(20);
    u16(20);
    u16(0x0800);
    u16(0);
    u16(time);
    u16(date);
    u32(entry.crc);
    u32(entry.data.length);
    u32(entry.data.length);
    u16(entry.name.length);
    u16(0);
    u16(0);
    u16(0);
    u16(0);
    u32(0);
    u32(entry.offset);
    bytes(entry.name);
  });

  const centralSize = at - centralStart;

  u32(0x06054b50);
  u16(0);
  u16(0);
  u16(entries.length);
  u16(entries.length);
  u32(centralSize);
  u32(centralStart);
  u16(0);

  return new Blob([buffer], { type: 'application/zip' });
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}