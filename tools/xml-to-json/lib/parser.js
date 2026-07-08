import { XMLParser } from 'fast-xml-parser';

const ATTR_PREFIX = '@_';

/** Item tags that appear as repeated siblings inside a collection. */
const COLLECTION_ITEM_TAGS = new Set([
  'book', 'weapon', 'accessory', 'mod', 'skill', 'quality', 'gear', 'usegear',
  'cyberware', 'bioware', 'armor', 'vehicle', 'spell', 'power', 'program',
  'metatype', 'metavariant', 'lifestyle', 'mentor', 'paragon', 'choice',
  'tradition', 'stream', 'echo', 'metamagic', 'martialart', 'maneuver',
  'advantage', 'pack', 'critter', 'vessel', 'range', 'improvement', 'spec',
  'spirit', 'grade', 'cost', 'string', 'file', 'category',
]);

/** Maps collection element name → child item tag to unwrap. */
const COLLECTION_WRAPPERS = {
  skillgroups: 'name',
  categories: 'category',
  skills: 'skill',
  weapons: 'weapon',
  qualities: 'quality',
  armors: 'armor',
  gears: 'gear',
  cyberwares: 'cyberware',
  biowares: 'bioware',
  books: 'book',
  metatypes: 'metatype',
  spells: 'spell',
  powers: 'power',
  programs: 'program',
  vehicles: 'vehicle',
  lifestyles: 'lifestyle',
  mentors: 'mentor',
  traditions: 'tradition',
  streams: 'stream',
  echoes: 'echo',
  metamagics: 'metamagic',
  martialarts: 'martialart',
  packs: 'pack',
  vessels: 'vessel',
  ranges: 'range',
  improvements: 'improvement',
  strings: 'string',
  metavariants: 'metavariant',
  specs: 'spec',
  spirits: 'spirit',
  choices: 'choice',
  grades: 'grade',
  costs: 'cost',
  maneuvers: 'maneuver',
  advantages: 'advantage',
  accessories: 'accessory',
  options: 'option',
  comforts: 'comfort',
  entertainments: 'entertainment',
  necessities: 'necessity',
  neighborhoods: 'neighborhood',
  securities: 'security',
  suites: 'suite',
  knowledgeskills: 'skill',
  safehousecosts: 'cost',
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ATTR_PREFIX,
  textNodeName: '#text',
  cdataPropName: '#cdata',
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
  isArray: (name, jpath) => {
    const tag = jpath.split('.').pop();
    if (tag === 'chummer' || tag === 'manifest' || tag === 'character') return false;
    if (tag === 'name') return jpath.includes('.skillgroups');
    return COLLECTION_ITEM_TAGS.has(tag);
  },
});

export function normalizeNode(node) {
  if (node === null || node === undefined) return null;
  if (typeof node === 'string') return node === '' ? null : node;

  if (Array.isArray(node)) {
    const normalized = node.map(normalizeNode).filter((v) => v !== null);
    return normalized.length === 0 ? null : normalized;
  }

  if (typeof node !== 'object') return node;

  const keys = Object.keys(node);

  if (keys.length === 1 && keys[0] === '#text') {
    return node['#text'] === '' ? null : node['#text'];
  }

  if (keys.length === 2 && keys.includes('#text')) {
    const result = { value: node['#text'] };
    for (const key of keys) {
      if (key.startsWith(ATTR_PREFIX)) {
        result[key.slice(ATTR_PREFIX.length)] = node[key];
      }
    }
    return result;
  }

  const result = {};

  for (const key of keys) {
    if (key === '#text') continue;
    if (key === '#cdata') {
      result.value = node[key];
      continue;
    }
    if (key.startsWith(ATTR_PREFIX)) {
      result[key.slice(ATTR_PREFIX.length)] = node[key];
      continue;
    }
    const normalized = normalizeNode(node[key]);
    if (normalized !== null) result[key] = normalized;
  }

  if (keys.includes('#text')) result.value = node['#text'];
  return Object.keys(result).length === 0 ? null : result;
}

function unwrapCollections(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return doc;

  for (const [collectionKey, itemTag] of Object.entries(COLLECTION_WRAPPERS)) {
    const value = doc[collectionKey];
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;

    if (itemTag in value) {
      doc[collectionKey] = value[itemTag];
    }
  }

  return doc;
}

function unwrapNestedItems(node) {
  if (Array.isArray(node)) {
    node.forEach(unwrapNestedItems);
    return;
  }
  if (!node || typeof node !== 'object') return;

  unwrapCollections(node);

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      value.forEach(unwrapNestedItems);
    } else if (value && typeof value === 'object') {
      unwrapNestedItems(value);
    }
  }
}

export function normalizeChummerDocument(doc) {
  let root = normalizeNode(doc);

  if (Array.isArray(root)) {
    root = root.length === 1 ? root[0] : Object.assign({}, ...root);
  }

  if (!root || typeof root !== 'object') return root;

  unwrapNestedItems(root);

  if (root.version !== undefined) {
    const version = Number(root.version);
    if (!Number.isNaN(version)) root.version = version;
  }

  return root;
}

export function parseChummerXml(xmlContent) {
  const parsed = parser.parse(xmlContent);
  const chummer = parsed.chummer ?? parsed.character ?? parsed.manifest;
  if (!chummer) {
    throw new Error('Root element must be <chummer>, <character>, or <manifest>');
  }
  return normalizeChummerDocument(chummer);
}
