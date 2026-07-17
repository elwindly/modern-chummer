import { Character } from '../../core/rules';

export type CreationTabId =
  | 'common'
  | 'skills'
  | 'martial-arts'
  | 'magician'
  | 'adept'
  | 'technomancer'
  | 'critter'
  | 'initiation'
  | 'cyberware'
  | 'street-gear'
  | 'vehicles'
  | 'info'
  | 'bp-summary';

export interface CreationTabDefinition {
  id: CreationTabId;
  label: string;
  always?: boolean;
  visible?: (character: Character) => boolean;
}

export const CREATION_TABS: CreationTabDefinition[] = [
  { id: 'common', label: 'Common', always: true },
  { id: 'skills', label: 'Skills', always: true },
  { id: 'martial-arts', label: 'Martial Arts', always: true },
  {
    id: 'magician',
    label: 'Magician',
    visible: (character) => character.flags.magicianEnabled,
  },
  {
    id: 'adept',
    label: 'Adept',
    visible: (character) => character.flags.adeptEnabled,
  },
  {
    id: 'technomancer',
    label: 'Technomancer',
    visible: (character) => character.flags.technomancerEnabled,
  },
  {
    id: 'critter',
    label: 'Critter',
    visible: (character) => character.flags.critterEnabled,
  },
  {
    id: 'initiation',
    label: 'Initiation',
    visible: (character) =>
      character.flags.initiationEnabled ||
      character.flags.magEnabled ||
      character.flags.resEnabled,
  },
  { id: 'cyberware', label: 'Cyberware', always: true },
  { id: 'street-gear', label: 'Street Gear', always: true },
  { id: 'vehicles', label: 'Vehicles', always: true },
  { id: 'info', label: 'Character Info', always: true },
  { id: 'bp-summary', label: 'BP Summary', always: true },
];

export function visibleCreationTabs(character: Character | null): CreationTabDefinition[] {
  if (!character) return CREATION_TABS.filter((tab) => tab.always);
  return CREATION_TABS.filter((tab) => tab.always || tab.visible?.(character));
}
