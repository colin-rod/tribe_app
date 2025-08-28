#!/usr/bin/env node

/**
 * Script to replace console.log/error statements with proper logging
 * This script will automatically update console statements in TypeScript files
 */

const fs = require('fs')
const path = require('path')

// File extensions to process
const EXTENSIONS = ['.ts', '.tsx']

// Directory to process
const SRC_DIR = path.join(__dirname, '../src')

// Logger imports to add
const LOGGER_IMPORTS = {
  client: "import { createComponentLogger } from '@/lib/logger'",
  server: "import { createComponentLogger } from '@/lib/logger'"
}

// Patterns to replace
const REPLACEMENTS = [
  // console.error patterns
  {
    pattern: /console\.error\('([^']+)',\s*(\w+)\)/g,
    replacement: "logger.error('$1', $2, { action: '$ACTION' })"
  },
  {
    pattern: /console\.error\('([^']+):\s*([^']*)',\s*(\w+)\)/g,
    replacement: "logger.error('$1', $3, { action: '$ACTION', metadata: { details: '$2' } })"
  },
  {
    pattern: /console\.error\('Error\s+([^']+)',\s*(\w+)\)/g,
    replacement: "logger.error('Failed to $1', $2, { action: '$ACTION' })"
  },
  
  // console.log patterns
  {
    pattern: /console\.log\('([^']+)',\s*([^)]+)\)/g,
    replacement: "logger.info('$1', { action: '$ACTION', metadata: $2 })"
  },
  {
    pattern: /console\.log\('([^']+)'\)/g,
    replacement: "logger.info('$1', { action: '$ACTION' })"
  },
  
  // console.warn patterns
  {
    pattern: /console\.warn\('([^']+)'\)/g,
    replacement: "logger.warn('$1', { action: '$ACTION' })"
  }
]

function getFileList(dir, extensions) {
  let files = []
  
  const items = fs.readdirSync(dir)
  
  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    
    if (stat.isDirectory() && !item.includes('node_modules')) {
      files = files.concat(getFileList(fullPath, extensions))
    } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath)
    }
  }
  
  return files
}

function extractComponentName(filePath) {
  const basename = path.basename(filePath, path.extname(filePath))
  
  // Convert kebab-case to PascalCase
  return basename
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

function addLoggerImport(content, componentName) {
  // Check if logger import already exists
  if (content.includes('createComponentLogger') || content.includes('const logger')) {
    return content
  }
  
  // Find the last import statement
  const lines = content.split('\n')
  let lastImportIndex = -1
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') && !lines[i].includes('from \'react\'')) {
      lastImportIndex = i
    }
  }
  
  if (lastImportIndex >= 0) {
    // Insert logger import after last import
    lines.splice(lastImportIndex + 1, 0, '')
    lines.splice(lastImportIndex + 2, 0, LOGGER_IMPORTS.client)
    lines.splice(lastImportIndex + 3, 0, '')
    lines.splice(lastImportIndex + 4, 0, `const logger = createComponentLogger('${componentName}')`)
    
    return lines.join('\n')
  }
  
  return content
}

function inferActionFromContext(content, lineIndex) {
  const lines = content.split('\n')
  const line = lines[lineIndex].trim()
  
  // Look for function context
  for (let i = lineIndex; i >= 0; i--) {
    const contextLine = lines[i].trim()
    
    // Function declarations
    const funcMatch = contextLine.match(/(?:const|function)\s+(\w+)|(\w+)\s*[=:]\s*(?:async\s+)?\([^)]*\)\s*=>/)
    if (funcMatch) {
      return funcMatch[1] || funcMatch[2]
    }
    
    // Method definitions
    const methodMatch = contextLine.match(/(\w+)\s*\([^)]*\)\s*\{/)
    if (methodMatch) {
      return methodMatch[1]
    }
  }
  
  // Fallback to inferring from the error message
  if (line.includes('loading') || line.includes('fetching')) return 'dataLoading'
  if (line.includes('saving') || line.includes('creating')) return 'dataSaving'
  if (line.includes('updating')) return 'dataUpdate'
  if (line.includes('deleting')) return 'dataDelete'
  
  return 'unknown'
}

function processFile(filePath) {
  console.log(`Processing: ${filePath}`)
  
  let content = fs.readFileSync(filePath, 'utf8')
  const originalContent = content
  
  // Skip if it's the logger file itself
  if (filePath.includes('logger.ts') || filePath.includes('logger.js')) {
    return
  }
  
  // Add logger import and instantiation
  const componentName = extractComponentName(filePath)
  content = addLoggerImport(content, componentName)
  
  // Apply replacements
  const lines = content.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    
    if (line.includes('console.')) {
      const action = inferActionFromContext(content, i)
      
      for (const replacement of REPLACEMENTS) {
        line = line.replace(replacement.pattern, replacement.replacement.replace('$ACTION', action))
      }
      
      lines[i] = line
    }
  }
  
  content = lines.join('\n')
  
  // Only write if content changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`✅ Updated: ${filePath}`)
  } else {
    console.log(`⏭️  Skipped: ${filePath} (no changes needed)`)
  }
}

function main() {
  console.log('🚀 Starting console.log replacement...')
  
  const files = getFileList(SRC_DIR, EXTENSIONS)
  console.log(`📁 Found ${files.length} files to process`)
  
  files.forEach(processFile)
  
  console.log('✨ Console log replacement completed!')
  console.log('\n📋 Manual review needed for:')
  console.log('- Complex console statements with multiple parameters')
  console.log('- Context-specific action names')
  console.log('- Production vs development logging levels')
}

if (require.main === module) {
  main()
}