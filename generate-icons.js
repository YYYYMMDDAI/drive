// Run this with Node.js to generate PNG icons from SVG
// Usage: node generate-icons.js
// Requires no dependencies — uses built-in canvas simulation via data URL

const fs = require("fs");
const path = require("path");

const svgSource = fs.readFileSync(
  path.join(__dirname, "icons", "icon.svg"),
  "utf-8"
);

// Create a simple HTML file that auto-generates PNGs when opened in browser
const html = `<!DOCTYPE html>
<html><head><title>Generating icons...</title></head>
<body>
<p id="status">Generating PNG icons...</p>
<canvas id="c"></canvas>
<script>
const svg = \`${svgSource}\`;
const blob = new Blob([svg], {type: 'image/svg+xml'});
const url = URL.createObjectURL(blob);
const img = new Image();
img.onload = () => {
  const sizes = [[192, 'icon-192.png'], [512, 'icon-512.png'], [256, 'icon.png']];
  sizes.forEach(([size, name]) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    canvas.toBlob((b) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = name;
      a.click();
    }, 'image/png');
  });
  document.getElementById('status').textContent =
    'Done! Move the downloaded PNG files into the icons/ folder.';
  URL.revokeObjectURL(url);
};
img.src = url;
</script>
</body></html>`;

const outPath = path.join(__dirname, "icons", "generate-icons.html");
fs.writeFileSync(outPath, html);
console.log("Open this file in Chrome to download the PNG icons:");
console.log("  " + outPath);
console.log("");
console.log("Then move icon-192.png, icon-512.png, icon.png into icons/ folder.");
