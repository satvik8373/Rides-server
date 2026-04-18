import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const nestedDir = path.join(distDir, 'apps', 'api', 'src');

// Copy all files from nested src to root dist
if (fs.existsSync(nestedDir)) {
  const files = fs.readdirSync(nestedDir, { recursive: true });
  
  for (const file of files) {
    const srcPath = path.join(nestedDir, file);
    const destPath = path.join(distDir, file);
    
    // Create directory if it doesn't exist
    if (fs.statSync(srcPath).isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
  
  // Remove nested structure
  fs.rmSync(path.join(distDir, 'apps'), { recursive: true });
  
  console.log('✓ Build output flattened to dist/');
}
