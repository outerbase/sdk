#!/bin/bash

# Define the source and destination directories
src_dir="./src/generators"
dest_dir="./dist/generators"

# Create the destination directory if it does not exist
mkdir -p "$dest_dir"

# Copy the files from the source to the destination directory
cp "$src_dir/model-template.handlebars" "$dest_dir"
cp "$src_dir/index-template.handlebars" "$dest_dir"
cp "$src_dir/query-template.handlebars" "$dest_dir"

echo "Files copied successfully."
