#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Animation classes to remove
const animationPatterns = [
  /transition-all\s+duration-\d+/g,
  /transition-colors\s+duration-\d+/g,
  /transition-transform\s+duration-\d+/g,
  /transition-opacity\s+duration-\d+/g,
  /transition-all/g,
  /transition-colors/g,
  /transition-transform/g,
  /transition-opacity/g,
  /duration-\d+/g,
  /hover:scale-\[[^\]]+\]/g,
  /hover:scale-\d+/g,
  /animate-spin/g,
  /animate-pulse/g,
  /animate-bounce/g,
];

function removeAnimationsFromFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    animationPatterns.forEach(pattern => {
      if (content.match(pattern)) {
        modified = true;
        content = content.replace(pattern, '');
      }
    });
    
    if (modified) {
      // Clean up extra spaces
      content = content.replace(/\s+/g, ' ');
      content = content.replace(/className="\s+/g, 'className="');
      content = content.replace(/\s+"/g, '"');
      content = content.replace(/className="(\s*)"/, 'className=""');
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Removed animations from: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  entries.forEach(entry => {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      processDirectory(fullPath);
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      removeAnimationsFromFile(fullPath);
    }
  });
}

console.log('🧹 Starting animation cleanup...');
processDirectory('./src');
console.log('✨ Animation cleanup complete!');