const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const toolsDir = path.resolve(__dirname);
const assetsDir = path.resolve(__dirname, '../../crazygames-assets');

function render(htmlFile, outFile, width, height) {
  const htmlUrl = 'file:///' + path.join(toolsDir, htmlFile).replace(/\\/g, '/');
  const targetPng = path.join(assetsDir, outFile);
  
  // Edge headless command
  const args = [
    `"${edgePath}"`,
    '--headless',
    '--disable-gpu',
    `--screenshot="${targetPng}"`,
    `--window-size=${width},${height}`,
    '--hide-scrollbars',
    '--default-background-color=00000000',
    `"${htmlUrl}"`
  ].join(' ');

  console.log(`Rendering ${htmlFile} (${width}x${height}) -> ${outFile}...`);
  try {
    execSync(args, { stdio: 'inherit', timeout: 15000 });
    if (fs.existsSync(targetPng)) {
      console.log(`✓ Created: ${outFile} (${fs.statSync(targetPng).size} bytes)`);
    } else {
      console.error(`✗ File not created: ${outFile}`);
    }
  } catch (err) {
    console.error(`Error rendering ${htmlFile}:`, err.message);
  }
}

// 1. Render Landscape 1920x1080
render('landscape.html', 'cover_landscape_1920x1080.png', 1920, 1080);
