const fs = require('fs');

// Read the 128x128 PNG file
const pngData = fs.readFileSync('src-tauri/icons/128x128.png');

// Create ICO file structure
const ico = Buffer.alloc(22 + pngData.length);
let offset = 0;

// ICONDIR header
ico[offset++] = 0x00; // Reserved
ico[offset++] = 0x00;
ico[offset++] = 0x01; // Type = ICO (1)
ico[offset++] = 0x00;
ico[offset++] = 0x01; // Number of images = 1
ico[offset++] = 0x00;

// ICONDIRENTRY for first (and only) image
ico[offset++] = 0x80; // Width = 128
ico[offset++] = 0x00; // Height = 128
ico[offset++] = 0x00; // Color count = 0
ico[offset++] = 0x00; // Reserved
ico[offset++] = 0x01; // Color planes = 1
ico[offset++] = 0x00;
ico[offset++] = 0x20; // Bits per pixel = 32
ico[offset++] = 0x00;

// Size of image data
ico.writeUInt32LE(pngData.length, offset);
offset += 4;

// Offset to image data
ico.writeUInt32LE(22, offset);

// Append PNG data as the image
pngData.copy(ico, 22);

// Write the ICO file
fs.writeFileSync('src-tauri/icons/icon.ico', ico);
console.log('✓ Valid icon.ico created from PNG');
