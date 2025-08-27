#!/bin/bash

# Script to apply the migration to Supabase
echo "Applying essential tables migration to Supabase..."

# Apply the migration using psql if you have the connection string
# Or use supabase cli if available
if command -v supabase &> /dev/null; then
    echo "Using Supabase CLI..."
    supabase db push
else
    echo "Please apply the migration manually via the Supabase Dashboard:"
    echo "1. Go to https://supabase.com/dashboard"
    echo "2. Select your project"
    echo "3. Go to SQL Editor"
    echo "4. Copy and paste the contents of: supabase/migrations/20250827_essential_tables.sql"
    echo "5. Run the query"
fi