#!/bin/bash

# Test script for person-specific email routing on Vercel
# Replace TREE_ID with an actual tree ID from your database

VERCEL_URL="https://colinrodrigues.com"
TREE_ID="7104f163-8398-4659-b22c-6e70de764f7c"  # UPDATE THIS WITH REAL TREE ID

echo "🧪 Testing Person-Specific Email Routing on Vercel"
echo "=================================================="
echo "URL: $VERCEL_URL/api/webhooks/sendgrid" 
echo "Email: person-$TREE_ID@colinrodrigues.com"
echo ""

echo "📧 Sending test email..."
curl -X POST "$VERCEL_URL/api/webhooks/sendgrid" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "User-Agent: SendGrid" \
  -d "to=person-$TREE_ID@colinrodrigues.com" \
  -d "from=parent@example.com" \
  -d "subject=Test for Person Tree" \
  -d "text=Testing person-specific email routing on Vercel! This should route to the specific person's tree and include their name in the content. #family #test #milestone" \
  -d "attachments=0" \
  -v

echo ""
echo "✅ Test completed! Check the response above."
echo ""
echo "🔍 What to look for:"
echo "   - Status: 200 (success) or 404 (tree not found)"  
echo "   - Response should include 'routingType': 'person'"
echo "   - Should include 'targetTreeId' matching your tree ID"
echo ""
echo "❌ If you get 404 'Person tree not found':"
echo "   1. Update TREE_ID with a real tree ID from your database"
echo "   2. Ensure the migration script ran on production database"
echo "   3. Check that the tree has person_name and managed_by populated"