const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = 'c:/Users/migue/Desktop/skinmarket';

// Files to scan
const filesToScan = [
  // Backend
  'src/backend/server.js',
  'src/backend/db.js',
  'src/backend/init_db.js',
  'src/backend/steamBot.js',
  'src/backend/controllers/paymentController.js',
  'src/backend/services/p2pMarketService.js',
  'src/backend/steam/botEngine.js',
  // Root level scripts
  'generate_prices_cache.js',
  'parse_steam_safe.js',
  'test_db.js',
  'test_fetch.js',
  'test_imports.js',
];

// Scan all JS/JSX files
function getAllFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        files.push(...getAllFiles(fullPath));
      }
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx') || entry.name.endsWith('.mjs') || entry.name.endsWith('.cjs')) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('package-lock')) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

const allFiles = getAllFiles(rootDir);
const importRegex = /(?:import\s+(?:[\w*{}\s,]+)\s+from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;

const npmPackages = new Set();

for (const file of allFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const pkg = match[1] || match[2];
      // Only capture npm packages (not relative/absolute paths)
      if (pkg && !pkg.startsWith('.') && !pkg.startsWith('/')) {
        // Get the package name (handle scoped packages @org/name)
        const parts = pkg.split('/');
        if (pkg.startsWith('@')) {
          npmPackages.add(parts[0] + '/' + parts[1]);
        } else {
          npmPackages.add(parts[0]);
        }
      }
    }
  } catch (e) {
    console.error(`Error reading ${file}: ${e.message}`);
  }
}

console.log('\n=== ALL NPM PACKAGES FOUND IN PROJECT ===');
const sorted = [...npmPackages].sort();
sorted.forEach(pkg => console.log(`  - ${pkg}`));

// Also scan test_imports.js specifically
console.log('\n=== Reading test_imports.js ===');
try {
  const testImports = fs.readFileSync(path.join(rootDir, 'test_imports.js'), 'utf8');
  console.log(testImports);
} catch (e) {
  console.log('test_imports.js not found or error reading it');
}

// Read package.json files
console.log('\n=== ROOT package.json ===');
try {
  const rootPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const rootDeps = {...rootPkg.dependencies, ...rootPkg.devDependencies};
  console.log('Dependencies:', Object.keys(rootDeps).join(', '));
} catch (e) {
  console.log('Error reading root package.json');
}

console.log('\n=== BACKEND package.json ===');
try {
  const backendPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/backend/package.json'), 'utf8'));
  console.log('dependencies:', Object.keys(backendPkg.dependencies || {}).join(', '));
  console.log('devDependencies:', Object.keys(backendPkg.devDependencies || {}).join(', '));
} catch (e) {
  console.log('Error reading backend package.json');
}

