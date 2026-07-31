const fs = require('fs');
const path = require('path');

const files = [
  'src/services/StorageService.js',
  'src/context/AuthContext.jsx',
  'src/pages/CaseView.jsx',
  'src/pages/Login.jsx',
  'src/components/NavBar.jsx',
  'src/pages/Cases.jsx',
  'src/services/ImageService.js'
];

const root = 'c:/Users/migue/Desktop/skinmarket';

for (const relPath of files) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP: ${relPath} not found`);
    continue;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Remove NaN corruption patterns
  content = content.replace(/NaN\s*[^;]*;/g, '');
  content = content.replace(/hasNaN/g, 'hasSession');
  content = content.replace(/NaN&&/g, '');
  content = content.replace(/\bNaN\b/g, '');
  
  // Fix broken template literals
  content = content.replace(/NaN\$\{/g, '${');
  content = content.replace(/\$\{NaN/g, '${');
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`FIXED: ${relPath}`);
}

console.log('All files cleaned.');
</absolute_path>
</create_file>
