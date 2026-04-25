import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');

const replacements = [
  { from: /â€”/g, to: '-' },
  { from: /â€“/g, to: '-' },
  { from: /â†”/g, to: '<->' },
  { from: /âŸ·/g, to: '->' },
  { from: /â†’/g, to: '->' },
  { from: /â† /g, to: '<-' },
  { from: /â”€/g, to: '-' },
  { from: /â€¢/g, to: '•' },
  { from: /â€¦/g, to: '...' },
  { from: /â† /g, to: '<-' },
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const r of replacements) {
        if (r.from.test(content)) {
          content = content.replace(r.from, r.to);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Cleaned: ${fullPath}`);
      }
    }
  }
}

processDir(srcDir);
console.log('Done cleaning encoding issues.');
