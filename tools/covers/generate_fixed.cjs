const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const toolsDir = path.resolve(__dirname);
const assetsDir = path.resolve(__dirname, '../../crazygames-assets');

function renderHtml(htmlFile, outFile, width, height) {
  const htmlUrl = 'file:///' + path.join(toolsDir, htmlFile).replace(/\\/g, '/');
  const targetFile = path.join(assetsDir, outFile);

  const args = [
    `"${edgePath}"`,
    '--headless',
    '--disable-gpu',
    '--allow-file-access-from-files',
    `--screenshot="${targetFile}"`,
    `--window-size=${width},${height}`,
    '--hide-scrollbars',
    '--default-background-color=00000000',
    `"${htmlUrl}"`
  ].join(' ');

  console.log(`Rendering [${htmlFile}] (${width}x${height}) -> ${outFile}...`);
  try {
    execSync(args, { stdio: 'inherit', timeout: 20000 });
    if (fs.existsSync(targetFile)) {
      console.log(`✓ Created: ${outFile} (${fs.statSync(targetFile).size} bytes)`);
    } else {
      console.error(`✗ File not created: ${outFile}`);
    }
  } catch (err) {
    console.error(`Error rendering ${htmlFile}:`, err.message);
  }
}

// Render all 3 covers matching the user's Figma designs:
// 1. Landscape 1920x1080
renderHtml('figma_landscape.html', 'fixed_cover_landscape_1920x1080.png', 1920, 1080);
renderHtml('figma_landscape.html', 'arcade_v2_landscape_1920x1080.jpg', 1920, 1080);

// 2. Portrait 800x1200
renderHtml('figma_portrait.html', 'fixed_cover_portrait_800x1200.png', 800, 1200);
renderHtml('figma_portrait.html', 'arcade_v2_portrait_800x1200.jpg', 800, 1200);

// 3. Square 800x800
renderHtml('figma_square.html', 'fixed_cover_square_800x800.png', 800, 800);
renderHtml('figma_square.html', 'arcade_v2_square_800x800.jpg', 800, 800);

console.log('All 3 covers rendered successfully!');
