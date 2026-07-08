#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMergedDocument } from './lib/merge.js';
import { parseChummerXml } from './lib/parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CHUMMER_ROOT = path.resolve(PROJECT_ROOT, '..', 'ChummerGenSR4');

const DATA_FILES = [
  'armor.xml', 'bioware.xml', 'books.xml', 'critterpowers.xml', 'critters.xml',
  'cyberware.xml', 'echoes.xml', 'gear.xml', 'improvements.xml', 'lifestyles.xml',
  'martialarts.xml', 'mentors.xml', 'metamagic.xml', 'metatypes.xml', 'packs.xml',
  'paragons.xml', 'powers.xml', 'programs.xml', 'qualities.xml', 'ranges.xml',
  'skills.xml', 'spells.xml', 'streams.xml', 'traditions.xml', 'vehicles.xml',
  'vessels.xml', 'weapons.xml',
];

const LANG_DATA_FILES = ['de_data.xml', 'fr_data.xml', 'jp_data.xml'];
const LANG_UI_FILES = ['en-us.xml', 'de.xml', 'fr.xml', 'jp.xml'];

function printHelp() {
  console.log(`
Chummer SR4 XML → JSON converter

Usage: node tools/xml-to-json/convert.js [options]

Options:
  --data-dir <path>     Source XML (default: ../ChummerGenSR4/bin/data)
  --lang-dir <path>     Source lang (default: ../ChummerGenSR4/bin/lang)
  --out-dir <path>      Output root (default: public → public/data, public/lang)
  --merge-custom        Apply override_* and custom_* patches
  --recursive-custom    Scan custom content subfolders
  --include-lang        Convert translation files
  --files <list>        Comma-separated file subset
`);
}

function parseArgs(argv) {
  const options = {
    dataDir: path.join(CHUMMER_ROOT, 'bin', 'data'),
    langDir: path.join(CHUMMER_ROOT, 'bin', 'lang'),
    outDir: path.join(PROJECT_ROOT, 'public'),
    mergeCustom: false,
    recursiveCustom: false,
    includeLang: false,
    files: DATA_FILES,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      case '--data-dir':
        options.dataDir = path.resolve(argv[++i]);
        break;
      case '--lang-dir':
        options.langDir = path.resolve(argv[++i]);
        break;
      case '--out-dir':
        options.outDir = path.resolve(argv[++i]);
        break;
      case '--merge-custom':
        options.mergeCustom = true;
        break;
      case '--recursive-custom':
        options.recursiveCustom = true;
        options.mergeCustom = true;
        break;
      case '--include-lang':
        options.includeLang = true;
        break;
      case '--files':
        options.files = argv[++i].split(',').map((f) => f.trim());
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  return options;
}

async function writeJson(outPath, data) {
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function convertDataFile(dataDir, fileName, outDir, options) {
  const jsonName = fileName.replace(/\.xml$/, '.json');
  const doc = options.mergeCustom
    ? await loadMergedDocument(dataDir, fileName, { recursiveCustom: options.recursiveCustom })
    : parseChummerXml(await readFile(path.join(dataDir, fileName), 'utf8'));

  const outPath = path.join(outDir, 'data', jsonName);
  await writeJson(outPath, doc);
  return { fileName, outPath, itemCount: countTopLevelItems(doc) };
}

function countTopLevelItems(doc) {
  const skip = new Set(['version', 'categories', 'skillgroups', 'name']);
  let count = 0;
  for (const [key, value] of Object.entries(doc)) {
    if (skip.has(key)) continue;
    if (Array.isArray(value)) count += value.length;
  }
  return count;
}

async function convertLangDataFile(langDir, fileName, outDir) {
  const doc = parseChummerXml(await readFile(path.join(langDir, fileName), 'utf8'));
  const outPath = path.join(outDir, 'lang', fileName.replace(/\.xml$/, '.json'));
  await writeJson(outPath, doc);
  return { fileName, outPath };
}

async function convertLangUiFile(langDir, fileName, outDir) {
  const doc = parseChummerXml(await readFile(path.join(langDir, fileName), 'utf8'));
  const strings = Array.isArray(doc.strings) ? doc.strings : [];
  const map = {};
  for (const entry of strings) {
    if (entry?.key && entry?.text) map[entry.key] = entry.text;
  }
  const langCode = fileName.replace(/\.xml$/, '');
  const outPath = path.join(outDir, 'lang', `${langCode}.ui.json`);
  await writeJson(outPath, { language: langCode, strings: map });
  return { fileName, outPath, stringCount: Object.keys(map).length };
}

async function writeManifest(outDir, results) {
  await writeJson(path.join(outDir, 'manifest.json'), {
    generatedAt: new Date().toISOString(),
    source: path.join(CHUMMER_ROOT, 'bin', 'data'),
    files: results.map((r) => ({
      source: r.fileName,
      output: path.relative(outDir, r.outPath).replace(/\\/g, '/'),
      items: r.itemCount ?? undefined,
    })),
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const results = [];

  console.log(`Converting ${options.files.length} data file(s)...`);
  console.log(`  Source: ${options.dataDir}`);
  console.log(`  Output: ${options.outDir}`);

  for (const fileName of options.files) {
    try {
      const result = await convertDataFile(options.dataDir, fileName, options.outDir, options);
      results.push(result);
      console.log(`  ok ${fileName} (${result.itemCount} items)`);
    } catch (error) {
      console.error(`  FAIL ${fileName}: ${error.message}`);
      process.exitCode = 1;
    }
  }

  if (options.includeLang) {
    for (const fileName of LANG_DATA_FILES) {
      try {
        results.push(await convertLangDataFile(options.langDir, fileName, options.outDir));
        console.log(`  ok ${fileName}`);
      } catch (error) {
        console.error(`  FAIL ${fileName}: ${error.message}`);
      }
    }
    for (const fileName of LANG_UI_FILES) {
      try {
        const result = await convertLangUiFile(options.langDir, fileName, options.outDir);
        results.push(result);
        console.log(`  ok ${fileName} (${result.stringCount} strings)`);
      } catch (error) {
        console.error(`  FAIL ${fileName}: ${error.message}`);
      }
    }
  }

  await writeManifest(options.outDir, results);
  console.log(`Done → ${path.join(options.outDir, 'manifest.json')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
