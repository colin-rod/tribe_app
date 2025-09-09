#!/usr/bin/env node

/**
 * Validate the correct UUID format
 */

const CORRECT_USER_ID = 'e4fb0e70-b278-4ae5-a13e-18803b1909fe'
const EMAIL = `u-${CORRECT_USER_ID}@colinrodrigues.com`

console.log('🔍 UUID Validation for Correct ID')
console.log('=' .repeat(40))
console.log(`UUID: ${CORRECT_USER_ID}`)
console.log(`Email: ${EMAIL}`)
console.log(`Length: ${CORRECT_USER_ID.length}`)
console.log('')

// Test the regex pattern from the webhook code
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const matches = CORRECT_USER_ID.match(uuidPattern)

console.log(`UUID Pattern: ${uuidPattern}`)
console.log(`Matches: ${matches ? 'YES ✅' : 'NO ❌'}`)

if (!matches) {
  console.log('\n❌ UUID format validation FAILED!')
  console.log('Expected: 8-4-4-4-12 hex characters')
  console.log('Actual breakdown:')
  const parts = CORRECT_USER_ID.split('-')
  parts.forEach((part, index) => {
    const expected = [8, 4, 4, 4, 12][index]
    const actual = part.length
    const isHex = /^[0-9a-f]+$/.test(part)
    const valid = actual === expected && isHex
    console.log(`  Part ${index + 1}: "${part}" (${actual} chars, hex: ${isHex ? 'YES' : 'NO'}) ${valid ? '✅' : '❌'}`)
    
    if (expected !== actual) {
      console.log(`    Expected ${expected} chars, got ${actual}`)
    }
    if (!isHex) {
      console.log(`    Contains non-hex characters`)
    }
  })
} else {
  console.log('✅ UUID format is valid!')
}

// Also test the email extraction logic
const [localPart, domain] = EMAIL.toLowerCase().split('@')
console.log('')
console.log('📧 Email Parsing:')
console.log(`Local Part: ${localPart}`)
console.log(`Domain: ${domain}`)

if (localPart.startsWith('u-')) {
  const extractedId = localPart.replace('u-', '')
  console.log(`Extracted ID: ${extractedId}`)
  console.log(`Matches Original: ${extractedId === CORRECT_USER_ID ? 'YES ✅' : 'NO ❌'}`)
  
  if (extractedId !== CORRECT_USER_ID) {
    console.log('❌ ID extraction mismatch!')
    console.log(`Expected: "${CORRECT_USER_ID}"`)
    console.log(`Got:      "${extractedId}"`)
  }
}