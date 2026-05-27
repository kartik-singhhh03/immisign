const fs = require('fs');
const path = require('path');

const nextDir = path.join(__dirname, '.next');

if (fs.existsSync(nextDir)) {
  console.log('🧹 Cleaning .next compilation cache...');
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log('✨ Next.js cache deleted successfully!');
  } catch (err) {
    console.error('⚠️ Failed to delete .next cache:', err.message);
  }
} else {
  console.log('✨ Next.js cache is already clean.');
}
