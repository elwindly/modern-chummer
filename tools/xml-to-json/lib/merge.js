import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseChummerXml } from './parser.js';

function getItemName(item) {
  if (!item || typeof item !== 'object') return null;
  const name = item.name;
  if (typeof name === 'string') return name;
  if (Array.isArray(name) && name.length > 0) return name[0];
  return null;
}

function asArray(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function applyOverrides(baseDoc, overrideDoc) {
  for (const [collectionKey, collectionValue] of Object.entries(overrideDoc)) {
    if (collectionKey === 'version') continue;

    if (!baseDoc[collectionKey]) {
      baseDoc[collectionKey] = collectionValue;
      continue;
    }

    const baseItems = asArray(baseDoc[collectionKey]);
    const overrideItems = asArray(collectionValue);

    for (const overrideItem of overrideItems) {
      const overrideName = getItemName(overrideItem);
      if (!overrideName) continue;
      const index = baseItems.findIndex((item) => getItemName(item) === overrideName);
      if (index >= 0) baseItems[index] = overrideItem;
    }

    baseDoc[collectionKey] = baseItems;
  }

  return baseDoc;
}

export function applyCustomContent(baseDoc, customDoc) {
  for (const [collectionKey, collectionValue] of Object.entries(customDoc)) {
    if (collectionKey === 'version') continue;

    const baseItems = asArray(baseDoc[collectionKey]);
    const existingNames = new Set(baseItems.map(getItemName).filter(Boolean));
    const customItems = asArray(collectionValue).filter((item) => {
      const name = getItemName(item);
      return name && !existingNames.has(name);
    });

    baseDoc[collectionKey] = [...baseItems, ...customItems];
  }

  return baseDoc;
}

export async function findPatchFiles(dataDir, baseFileName, recursive = false) {
  const overrides = [];
  const customs = [];

  async function scan(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (recursive) await scan(fullPath);
        continue;
      }
      if (!entry.name.endsWith('.xml')) continue;
      if (entry.name.startsWith('override_') && entry.name.endsWith(`_${baseFileName}`)) {
        overrides.push(fullPath);
      } else if (entry.name.startsWith('custom_') && entry.name.endsWith(`_${baseFileName}`)) {
        customs.push(fullPath);
      }
    }
  }

  await scan(dataDir);
  overrides.sort();
  customs.sort();
  return { overrides, customs };
}

export async function loadMergedDocument(dataDir, baseFileName, options = {}) {
  const { recursiveCustom = false } = options;
  const basePath = path.join(dataDir, baseFileName);
  const baseXml = await readFile(basePath, 'utf8');
  let doc = parseChummerXml(baseXml);

  if (baseFileName === 'improvements.xml') return doc;

  const { overrides, customs } = await findPatchFiles(dataDir, baseFileName, recursiveCustom);

  for (const overridePath of overrides) {
    doc = applyOverrides(doc, parseChummerXml(await readFile(overridePath, 'utf8')));
  }

  for (const customPath of customs) {
    doc = applyCustomContent(doc, parseChummerXml(await readFile(customPath, 'utf8')));
  }

  return doc;
}
