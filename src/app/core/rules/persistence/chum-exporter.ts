import { ATTRIBUTE_CODES } from '../models/attribute';
import { Character } from '../models/character';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function el(name: string, value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) {
    return `<${name}></${name}>`;
  }
  return `<${name}>${escapeXml(String(value))}</${name}>`;
}

function bool(value: boolean | undefined): string {
  return value ? 'True' : 'False';
}

function wrap(name: string, children: string): string {
  return `<${name}>${children}</${name}>`;
}

function exportAttributes(character: Character): string {
  const nodes = ATTRIBUTE_CODES.map((code) => {
    const attr = character.attributes[code];
    return wrap(
      'attribute',
      [
        el('name', code),
        el('metatypemin', attr.min),
        el('metatypemax', attr.max),
        el('metatypeaugmax', attr.augMax),
        el('value', attr.base),
        el('augmodifier', 0),
        el('totalvalue', attr.value ?? attr.base),
      ].join(''),
    );
  }).join('');
  return wrap('attributes', nodes);
}

function exportQualities(character: Character): string {
  const nodes = character.qualities
    .map((name) =>
      wrap(
        'quality',
        [
          el('name', name),
          el('extra', ''),
          el('bp', character.qualityAdjustments?.[name]?.bp ?? 0),
          el('contributetolimit', 'True'),
          el('print', 'True'),
          el('qualitytype', 'Positive'),
          el('qualitysource', character.qualityOrigins?.[name] ?? 'Selected'),
        ].join(''),
      ),
    )
    .join('');
  return wrap('qualities', nodes);
}

function exportSkills(character: Character): string {
  const skillNodes = [
    ...character.skills.map((skill) =>
      wrap(
        'skill',
        [
          el('name', skill.name),
          el('skillgroup', skill.skillGroup ?? ''),
          el('skillcategory', skill.skillCategory ?? ''),
          el('grouped', bool(skill.grouped)),
          el('default', bool(skill.defaultSkill)),
          el('rating', skill.rating),
          el('ratingmax', skill.ratingMax ?? 6),
          el('knowledge', 'False'),
          el('exotic', bool(skill.exotic)),
          el('spec', skill.specialization ?? ''),
        ].join(''),
      ),
    ),
    ...character.knowledgeSkills.map((skill) =>
      wrap(
        'skill',
        [
          el('name', skill.name),
          el('skillgroup', ''),
          el('skillcategory', skill.skillCategory ?? ''),
          el('grouped', 'False'),
          el('default', 'False'),
          el('rating', skill.rating),
          el('ratingmax', skill.ratingMax ?? 6),
          el('knowledge', 'True'),
          el('exotic', 'False'),
          el('spec', skill.specialization ?? ''),
        ].join(''),
      ),
    ),
  ].join('');

  const groupNodes = character.skillGroups
    .map((group) =>
      wrap(
        'skillgroup',
        [el('name', group.name), el('rating', group.rating), el('ratingmax', group.ratingMax ?? 6)].join(
          '',
        ),
      ),
    )
    .join('');

  return wrap('skills', skillNodes + groupNodes);
}

function exportContacts(character: Character): string {
  const nodes = character.contacts
    .map((contact) =>
      wrap(
        'contact',
        [
          el('name', contact.name),
          el('connection', contact.connection),
          el('loyalty', contact.loyalty),
          el('group', contact.group),
          el('free', bool(contact.free)),
          el('enemy', bool(contact.enemy)),
        ].join(''),
      ),
    )
    .join('');
  return wrap('contacts', nodes);
}

function exportStreetItems(
  tag: string,
  itemTag: string,
  items: Character['gear'],
): string {
  const nodes = items
    .map((item) =>
      wrap(
        itemTag,
        [
          el('guid', item.id),
          el('name', item.name),
          el('category', ''),
          el('rating', item.rating),
          el('avail', item.availability),
          el('cost', item.cost),
          wrap(
            'children',
            item.children
              .map((child) =>
                wrap(
                  itemTag,
                  [
                    el('guid', child.id),
                    el('name', child.name),
                    el('rating', child.rating),
                    el('avail', child.availability),
                    el('cost', child.cost),
                  ].join(''),
                ),
              )
              .join(''),
          ),
        ].join(''),
      ),
    )
    .join('');
  return wrap(tag, nodes);
}

function exportWare(tag: string, itemTag: string, items: Character['cyberware']): string {
  const serialize = (item: Character['cyberware'][number]): string =>
    wrap(
      itemTag,
      [
        el('guid', item.id),
        el('name', item.name),
        el('grade', item.grade),
        el('rating', item.rating),
        el('avail', item.availability),
        el('cost', item.cost),
        el('ess', item.essence),
        el('capacity', item.capacity),
        wrap('children', item.children.map(serialize).join('')),
      ].join(''),
    );

  return wrap(tag, items.map(serialize).join(''));
}

function exportSpells(character: Character): string {
  const nodes = character.spells
    .map((spell) =>
      wrap(
        'spell',
        [
          el('guid', spell.id),
          el('name', spell.name),
          el('category', spell.category),
          el('limited', bool(spell.limited)),
          el('extended', bool(spell.extended)),
          el('extra', spell.extra ?? ''),
        ].join(''),
      ),
    )
    .join('');
  return wrap('spells', nodes);
}

function exportPowers(character: Character): string {
  const nodes = character.powers
    .map((power) =>
      wrap(
        'power',
        [
          el('guid', power.id),
          el('name', power.name),
          el('extra', power.extra ?? ''),
          el('pointsperlevel', power.pointsPerLevel),
          el('rating', power.rating),
          el('totalpoints', power.totalPoints),
        ].join(''),
      ),
    )
    .join('');
  return wrap('powers', nodes);
}

function exportPrograms(character: Character): string {
  const nodes = character.programs
    .map((program) =>
      wrap(
        'techprogram',
        [
          el('guid', program.id),
          el('name', program.name),
          el('category', program.category),
          el('rating', program.rating),
          el('maxrating', program.maxRating),
          el('capacity', program.capacity),
          el('extra', program.extra ?? ''),
        ].join(''),
      ),
    )
    .join('');
  return wrap('techprograms', nodes);
}

function exportMetamagics(character: Character): string {
  const nodes = character.metamagics
    .map((metamagic) =>
      wrap(
        'metamagic',
        [
          el('guid', metamagic.id),
          el('name', metamagic.name),
          el('paidwithkarma', bool(metamagic.paidWithKarma)),
          el('source', metamagic.source ?? ''),
          el('page', metamagic.page ?? ''),
        ].join(''),
      ),
    )
    .join('');
  return wrap('metamagics', nodes);
}

function exportInitiationGrades(character: Character): string {
  const nodes = character.initiationGrades
    .map((grade) =>
      wrap(
        'initiationgrade',
        [
          el('guid', grade.id),
          el('res', bool(grade.technomancer)),
          el('grade', grade.grade),
          el('group', bool(grade.group)),
          el('ordeal', bool(grade.ordeal)),
          el('notes', grade.notes ?? ''),
        ].join(''),
      ),
    )
    .join('');
  return wrap('initiationgrades', nodes);
}

function exportCritterPowers(character: Character): string {
  const nodes = character.critterPowers
    .map((power) =>
      wrap(
        'critterpower',
        [
          el('guid', power.id),
          el('name', power.name),
          el('rating', power.rating),
          el('points', power.points),
        ].join(''),
      ),
    )
    .join('');
  return wrap('critterpowers', nodes);
}

function exportVehicles(character: Character): string {
  const nodes = character.vehicles
    .map((vehicle) =>
      wrap(
        'vehicle',
        [
          el('guid', vehicle.id),
          el('name', vehicle.name),
          el('category', vehicle.category),
          el('handling', vehicle.handling),
          el('accel', vehicle.accel),
          el('speed', vehicle.speed),
          el('pilot', vehicle.pilot),
          el('body', vehicle.body),
          el('armor', vehicle.armor),
          el('sensor', vehicle.sensor),
          el('devicerating', vehicle.deviceRating),
          el('avail', vehicle.availability),
          el('cost', vehicle.cost),
          el('vehiclename', vehicle.vehicleName ?? ''),
          wrap(
            'mods',
            vehicle.mods
              .map((mod) =>
                wrap(
                  'mod',
                  [
                    el('guid', mod.id),
                    el('name', mod.name),
                    el('rating', mod.rating),
                    el('avail', mod.availability),
                    el('cost', mod.cost),
                  ].join(''),
                ),
              )
              .join(''),
          ),
        ].join(''),
      ),
    )
    .join('');
  return wrap('vehicles', nodes);
}

function exportMartialArts(character: Character): string {
  const arts = character.martialArts
    .map((art) =>
      wrap('martialart', [el('name', art.name), el('rating', art.rating)].join('')),
    )
    .join('');
  const maneuvers = character.martialArtManeuvers
    .map((maneuver) =>
      wrap(
        'martialartmaneuver',
        [el('guid', maneuver.id), el('name', maneuver.name)].join(''),
      ),
    )
    .join('');
  return (
    wrap('martialarts', arts) + wrap('martialartmaneuvers', maneuvers)
  );
}

function exportImprovements(character: Character): string {
  const nodes = character.improvements
    .map((improvement) =>
      wrap(
        'improvement',
        [
          el('unique', improvement.uniqueName),
          el('improvedname', improvement.improvedName),
          el('min', improvement.minimum),
          el('max', improvement.maximum),
          el('aug', improvement.augmented),
          el('augmax', improvement.augmentedMaximum),
          el('val', improvement.value),
          el('rating', improvement.rating),
          el('exclude', improvement.exclude),
          el('improvementttype', improvement.type),
          el('improvementsource', improvement.source),
          el('sourcename', improvement.sourceName),
          el('custom', bool(improvement.custom)),
        ].join(''),
      ),
    )
    .join('');
  return wrap('improvements', nodes);
}

/**
 * Serialize a character into legacy-compatible .chum XML.
 */
export function exportChumDocument(character: Character): string {
  const body = [
    el('gameedition', 'SR4'),
    el('settings', 'default.xml'),
    el('metatype', character.metatype),
    el('metatypebp', character.metatypeBp),
    el('metavariant', character.metavariant ?? ''),
    el('metatypecategory', character.metatypeCategory ?? ''),
    el('alias', character.name),
    el('name', character.name),
    el('bp', character.buildPoints),
    el('maxavail', character.maximumAvailability),
    el('nuyenbp', character.nuyenBpSpent),
    el('created', bool(character.created)),
    el('ignorerules', bool(character.ignoreRules)),
    el('magician', bool(character.flags.magicianEnabled)),
    el('adept', bool(character.flags.adeptEnabled)),
    el('technomancer', bool(character.flags.technomancerEnabled)),
    el('critter', bool(character.flags.critterEnabled)),
    el('initiationoverride', bool(character.flags.initiationEnabled)),
    el('magenabled', bool(character.flags.magEnabled)),
    el('resenabled', bool(character.flags.resEnabled)),
    el('tradition', character.magicTradition ?? ''),
    el('stream', character.technomancerStream ?? ''),
    el('knowpts', character.knowledgeSkillPoints ?? 0),
    exportAttributes(character),
    exportQualities(character),
    exportImprovements(character),
    exportSkills(character),
    exportContacts(character),
    exportSpells(character),
    exportPowers(character),
    exportPrograms(character),
    exportMartialArts(character),
    exportStreetItems('gears', 'gear', character.gear),
    exportStreetItems('weapons', 'weapon', character.weapons),
    exportStreetItems('armors', 'armor', character.armors),
    exportWare('cyberwares', 'cyberware', character.cyberware),
    exportWare('biowares', 'bioware', character.bioware),
    exportVehicles(character),
    exportMetamagics(character),
    exportCritterPowers(character),
    exportInitiationGrades(character),
  ].join('');

  return `<?xml version="1.0" encoding="utf-8"?>\n<character>${body}</character>`;
}
