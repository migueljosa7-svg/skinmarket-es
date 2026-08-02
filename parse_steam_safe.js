import fs from 'fs/promises';

async function main() {
  const resultStr = await fs.readFile('src/hooks/useFetchSkins.js', 'utf8');
  console.log("length:", resultStr.length);
}
main();
