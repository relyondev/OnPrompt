#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const inputIndex = process.argv.indexOf('--input');
if (inputIndex === -1 || !process.argv[inputIndex + 1]) {
  console.error('Usage: npm run migration:dry-run -- --input path/to/export.json');
  process.exit(1);
}

const source = JSON.parse(await readFile(process.argv[inputIndex + 1], 'utf8'));
const documents = Array.isArray(source) ? source : source.documents;
if (!Array.isArray(documents)) throw new Error('Expected an array, or an object containing a documents array.');

const ids = new Set();
const issues = [];
for (const [index, document] of documents.entries()) {
  if (!document || typeof document !== 'object') { issues.push(`Row ${index + 1}: not an object.`); continue; }
  if (typeof document.id !== 'string' || !document.id.trim()) issues.push(`Row ${index + 1}: missing string id.`);
  else if (ids.has(document.id)) issues.push(`Row ${index + 1}: duplicate id ${document.id}.`);
  else ids.add(document.id);
  if (typeof document.userId !== 'string' || !document.userId.trim()) issues.push(`Row ${index + 1}: missing userId.`);
}

console.log(`Dry run inspected ${documents.length} documents; no Firebase service was contacted.`);
if (issues.length) { console.error(issues.join('\n')); process.exit(2); }
console.log('Dry run passed: IDs are unique and every document has a userId.');
