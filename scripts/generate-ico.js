const fs = require('fs');
const path = require('path');

// Create ICO from PNG files (ICO format: header + directory + PNG data)
const sizes = [16, 32, 64, 128, 256];
const pngs = sizes.map(s => {
  return { size: s, data: fs.readFileSync(path.join(__dirname, '..', 'resources', `icon_${s}.png`)) };
});

const numImages = pngs.length;
const headerSize = 6;
const dirEntrySize = 16;
const dirSize = numImages * dirEntrySize;
let dataOffset = headerSize + dirSize;

// ICO header
const header = Buffer.alloc(headerSize);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(numImages, 4);

// Directory entries
const dirEntries = Buffer.alloc(dirSize);
let offset = dataOffset;
pngs.forEach((png, i) => {
  const base = i * dirEntrySize;
  dirEntries.writeUInt8(png.size >= 256 ? 0 : png.size, base);
  dirEntries.writeUInt8(png.size >= 256 ? 0 : png.size, base + 1);
  dirEntries.writeUInt8(0, base + 2);
  dirEntries.writeUInt8(0, base + 3);
  dirEntries.writeUInt16LE(1, base + 4);
  dirEntries.writeUInt16LE(32, base + 6);
  dirEntries.writeUInt32LE(png.data.length, base + 8);
  dirEntries.writeUInt32LE(offset, base + 12);
  offset += png.data.length;
});

const icoBuffer = Buffer.concat([header, dirEntries, ...pngs.map(p => p.data)]);
fs.writeFileSync(path.join(__dirname, '..', 'resources', 'icon.ico'), icoBuffer);
console.log(`Created icon.ico (${icoBuffer.length} bytes)`);
