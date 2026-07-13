import { describe, expect, it } from 'vitest';
import { XMLParser } from 'fast-xml-parser';
import { importChumDocument } from './chum-importer';
import { ImprovementSource, ImprovementType } from '../models/improvement';

const SAMPLE_CHUM = `<?xml version="1.0" encoding="utf-16"?>
<character>
  <gameedition>SR4</gameedition>
  <settings>default.xml</settings>
  <metatype>Human</metatype>
  <metatypebp>0</metatypebp>
  <metavariant></metavariant>
  <metatypecategory>Metahuman</metatypecategory>
  <alias>Street Sam</alias>
  <name>John Doe</name>
  <bp>400</bp>
  <maxavail>12</maxavail>
  <nuyenbp>50</nuyenbp>
  <magician>false</magician>
  <adept>false</adept>
  <technomancer>false</technomancer>
  <critter>false</critter>
  <initiationoverride>false</initiationoverride>
  <magenabled>false</magenabled>
  <resenabled>false</resenabled>
  <tradition></tradition>
  <stream></stream>
  <attributes>
    <attribute>
      <name>BOD</name>
      <metatypemin>1</metatypemin>
      <metatypemax>6</metatypemax>
      <metatypeaugmax>9</metatypeaugmax>
      <value>5</value>
      <augmodifier>0</augmodifier>
      <totalvalue>5</totalvalue>
    </attribute>
    <attribute>
      <name>AGI</name>
      <metatypemin>1</metatypemin>
      <metatypemax>6</metatypemax>
      <metatypeaugmax>9</metatypeaugmax>
      <value>4</value>
      <augmodifier>0</augmodifier>
      <totalvalue>4</totalvalue>
    </attribute>
    <attribute>
      <name>REA</name>
      <metatypemin>1</metatypemin>
      <metatypemax>6</metatypemax>
      <metatypeaugmax>9</metatypeaugmax>
      <value>4</value>
      <augmodifier>0</augmodifier>
      <totalvalue>4</totalvalue>
    </attribute>
    <attribute>
      <name>STR</name>
      <metatypemin>1</metatypemin>
      <metatypemax>6</metatypemax>
      <metatypeaugmax>9</metatypeaugmax>
      <value>4</value>
      <augmodifier>0</augmodifier>
      <totalvalue>4</totalvalue>
    </attribute>
    <attribute>
      <name>CHA</name>
      <metatypemin>1</metatypemin>
      <metatypemax>6</metatypemax>
      <metatypeaugmax>9</metatypeaugmax>
      <value>3</value>
      <augmodifier>0</augmodifier>
      <totalvalue>3</totalvalue>
    </attribute>
    <attribute>
      <name>INT</name>
      <metatypemin>1</metatypemin>
      <metatypemax>6</metatypemax>
      <metatypeaugmax>9</metatypeaugmax>
      <value>4</value>
      <augmodifier>0</augmodifier>
      <totalvalue>4</totalvalue>
    </attribute>
    <attribute>
      <name>LOG</name>
      <metatypemin>1</metatypemin>
      <metatypemax>6</metatypemax>
      <metatypeaugmax>9</metatypeaugmax>
      <value>4</value>
      <augmodifier>0</augmodifier>
      <totalvalue>4</totalvalue>
    </attribute>
    <attribute>
      <name>WIL</name>
      <metatypemin>1</metatypemin>
      <metatypemax>6</metatypemax>
      <metatypeaugmax>9</metatypeaugmax>
      <value>4</value>
      <augmodifier>0</augmodifier>
      <totalvalue>4</totalvalue>
    </attribute>
    <attribute>
      <name>INI</name>
      <metatypemin>1</metatypemin>
      <metatypemax>6</metatypemax>
      <metatypeaugmax>9</metatypeaugmax>
      <value>8</value>
      <augmodifier>0</augmodifier>
      <totalvalue>8</totalvalue>
    </attribute>
    <attribute>
      <name>EDG</name>
      <metatypemin>2</metatypemin>
      <metatypemax>7</metatypemax>
      <metatypeaugmax>7</metatypeaugmax>
      <value>2</value>
      <augmodifier>0</augmodifier>
      <totalvalue>2</totalvalue>
    </attribute>
    <attribute>
      <name>MAG</name>
      <metatypemin>0</metatypemin>
      <metatypemax>0</metatypemax>
      <metatypeaugmax>0</metatypeaugmax>
      <value>0</value>
      <augmodifier>0</augmodifier>
      <totalvalue>0</totalvalue>
    </attribute>
    <attribute>
      <name>RES</name>
      <metatypemin>0</metatypemin>
      <metatypemax>0</metatypemax>
      <metatypeaugmax>0</metatypeaugmax>
      <value>0</value>
      <augmodifier>0</augmodifier>
      <totalvalue>0</totalvalue>
    </attribute>
    <attribute>
      <name>ESS</name>
      <metatypemin>1</metatypemin>
      <metatypemax>6</metatypemax>
      <metatypeaugmax>6</metatypeaugmax>
      <value>6</value>
      <augmodifier>0</augmodifier>
      <totalvalue>6</totalvalue>
    </attribute>
  </attributes>
  <qualities>
    <quality>
      <name>Tough as Nails (Rating 1)</name>
      <extra></extra>
      <bp>5</bp>
      <contributetolimit>True</contributetolimit>
      <print>True</print>
      <qualitytype>Positive</qualitytype>
      <qualitysource>Selected</qualitysource>
    </quality>
  </qualities>
  <improvements>
    <improvement>
      <unique></unique>
      <improvedname></improvedname>
      <min>0</min>
      <max>0</max>
      <aug>0</aug>
      <augmax>0</augmax>
      <val>1</val>
      <rating>1</rating>
      <exclude></exclude>
      <improvementttype>PhysicalCM</improvementttype>
      <improvementsource>Quality</improvementsource>
      <sourcename>Tough as Nails (Rating 1)</sourcename>
      <custom>False</custom>
    </improvement>
  </improvements>
</character>`;

function parseFixture(xml: string): Record<string, unknown> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
    isArray: (_name, jpath) => jpath.endsWith('.attribute') || jpath.endsWith('.quality') || jpath.endsWith('.improvement'),
  });
  const parsed = parser.parse(xml) as { character: Record<string, unknown> };
  return parsed.character;
}

describe('chum-importer', () => {
  it('imports core character fields from legacy .chum XML', () => {
    const { character, warnings } = importChumDocument(parseFixture(SAMPLE_CHUM));

    expect(character.name).toBe('Street Sam');
    expect(character.metatype).toBe('Human');
    expect(character.buildPoints).toBe(400);
    expect(character.nuyenBpSpent).toBe(50);
    expect(character.attributes.BOD.base).toBe(5);
    expect(character.qualities).toEqual(['Tough as Nails (Rating 1)']);
    expect(character.improvements).toHaveLength(1);
    expect(character.improvements[0].type).toBe(ImprovementType.PhysicalCM);
    expect(character.improvements[0].source).toBe(ImprovementSource.Quality);
    expect(warnings).toEqual([]);
  });

  it('warns about unsupported sections and imports skills', () => {
    const root = {
      ...parseFixture(SAMPLE_CHUM),
      skills: {
        skill: {
          name: 'Pistols',
          rating: '2',
          ratingmax: '6',
          knowledge: 'False',
          grouped: 'False',
          default: 'Yes',
        },
      },
      created: 'True',
    };

    const { character, warnings } = importChumDocument(root);
    expect(character.skills).toHaveLength(1);
    expect(character.skills[0].name).toBe('Pistols');
    expect(character.skills[0].rating).toBe(2);
    expect(warnings.some((warning) => warning.includes('skills'))).toBe(false);
    expect(warnings.some((warning) => warning.includes('Created'))).toBe(true);
  });
});
