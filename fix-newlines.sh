#!/bin/bash

# Fix escaped newlines in all JavaScript files in the backend directory
echo "Fixing escaped newlines in backend JavaScript files..."

# Find all .js files in backend/src and process them
find backend/src -name "*.js" -type f | while read -r file; do
    echo "Processing: $file"
    # Replace literal \n with actual newlines
    sed -i 's/\\n/\n/g' "$file"
    # Remove any trailing quotes and braces that might be artifacts
    sed -i 's/"}$//g' "$file"
done

echo "Done fixing newlines!"