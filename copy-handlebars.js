const fs = require('fs');
const path = require('path');

// Define the source and destination directories
const srcDir = path.join(__dirname, 'src', 'generators');
const destDir = path.join(__dirname, 'dist', 'generators');

// Create the destination directory if it does not exist
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// Copy the files from the source to the destination directory
const filesToCopy = ['model-template.handlebars', 'index-template.handlebars'];

filesToCopy.forEach(file => {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    
    fs.copyFileSync(srcFile, destFile);
});

console.log('Files copied successfully.');
