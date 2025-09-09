#!/usr/bin/env node

/**
 * Debug UUID format matching
 */

const USER_ID = 'e4fb0e70-b278-4ae5-a13e-18803b19b9fe'
const EMAIL = `u-${USER_ID}@colinrodrigues.com`

console.log('🔍 UUID Format Debug')
console.log('=' .repeat(40))
console.log(`Full Email: ${EMAIL}`)
console.log(`User ID: ${USER_ID}`)
console.log(`Length: ${USER_ID.length}`)
console.log('')

// Test the regex pattern from the code
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const matches = USER_ID.match(uuidPattern)

console.log(`UUID Pattern: ${uuidPattern}`)
console.log(`Matches: ${matches ? 'YES ✅' : 'NO ❌'}`)

if (matches) {
  console.log('✅ UUID format is valid')
} else {
  console.log('❌ UUID format is invalid')
  console.log('')
  console.log('Expected: 8-4-4-4-12 hex characters')
  console.log('Actual breakdown:')
  const parts = USER_ID.split('-')
  parts.forEach((part, index) => {
    const expected = [8, 4, 4, 4, 12][index]
    const actual = part.length
    const valid = actual === expected && /^[0-9a-f]+$/.test(part)
    console.log(`  Part ${index + 1}: ${part} (${actual} chars) ${valid ? '✅' : '❌'}`)
  })
}

// Test email parsing
const [localPart, domain] = EMAIL.toLowerCase().split('@')
console.log('')
console.log(`Local Part: ${localPart}`)
console.log(`Domain: ${domain}`)

// Check domain validation
const domainValid = domain.includes('colinrodrigues.com')
console.log(`Domain Valid: ${domainValid ? 'YES ✅' : 'NO ❌'}`)

// Check prefix removal
if (localPart.startsWith('u-')) {
  const extractedId = localPart.replace('u-', '')
  console.log(`Extracted ID: ${extractedId}`)
  console.log(`Matches UUID: ${extractedId === USER_ID ? 'YES ✅' : 'NO ❌'}`)
} else {
  console.log('❌ Does not start with u-')
}