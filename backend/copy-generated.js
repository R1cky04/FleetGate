const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'generated');
const dest = path.join(__dirname, 'dist', 'generated');

try {
  // Remove existing dest if it exists
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  
  // Copy the generated folder
  fs.cpSync(src, dest, { recursive: true, force: true });
  console.log('✓ Generated folder copied to dist/');
} catch (err) {
  console.error('Error copying generated folder:', err.message);
  process.exit(1);
}
