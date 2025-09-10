const fs = require('fs')
const path = require('path')

function formatFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    
    // Add line breaks after key patterns while preserving string contents
    content = content
      // Add breaks after imports
      .replace(/import\s+[^;]+;(?=\s*import)/g, '$&\n')
      .replace(/import\s+[^;]+;(?=\s*(?!import))/g, '$&\n\n')
      
      // Add breaks around interface/type definitions
      .replace(/(interface\s+\w+[^{]*{[^}]+})/g, '\n$1\n')
      .replace(/(type\s+\w+[^=]+=\s*[^;]+;)/g, '\n$1\n')
      
      // Add breaks around function definitions
      .replace(/(export\s+(?:async\s+)?function\s+\w+[^{]*{)/g, '\n$1')
      .replace(/(const\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*{)/g, '\n$1')
      
      // Add breaks around export statements
      .replace(/(export\s+(?:default\s+)?(?:class|function|const|interface|type)\s+)/g, '\n$1')
      
      // Add breaks around component returns
      .replace(/(return\s*\()/g, '\n  $1\n    ')
      .replace(/(\)\s*}$)/g, '\n  $1')
      
      // Clean up multiple consecutive line breaks
      .replace(/\n{3,}/g, '\n\n')
      
      // Ensure file starts cleanly
      .replace(/^\s*\n+/, '')

    fs.writeFileSync(filePath, content)
    console.log(`Fixed formatting for: ${filePath}`)
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message)
  }
}

function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = []
  
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir)
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
        walk(fullPath)
      } else if (stat.isFile() && extensions.some(ext => entry.endsWith(ext))) {
        files.push(fullPath)
      }
    }
  }
  
  walk(dir)
  return files
}

// Process all TypeScript/JavaScript files
const srcFiles = findFiles('./src')
console.log(`Found ${srcFiles.length} files to format`)

srcFiles.forEach(formatFile)

console.log('Formatting complete!')