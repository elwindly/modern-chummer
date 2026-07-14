import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { CharacterStoreService } from '../../../core/services/character-store.service';
import { ContentFilterService } from '../../../core/services/content-filter.service';
import { ChummerItem } from '../../../core/models/chummer-data.types';
import { contentSourceScopeLabel } from '../../../core/models/content-source-scope';
import {
  getEffectiveSkillRating,
  getSkillRatingMaximum,
  type CharacterSkill,
  type CharacterSkillGroup,
} from '../../../core/rules';
import { categoryLabel, matchesSearch, matchesSourceScope, sortByName } from '../../../core/utils/item-helpers';
import { SourceFilterControl } from '../../../shared/source-filter-control';

interface SkillEditorModel extends CharacterSkill {
  specialization: string;
}

function toSkillEditorModels(skills: CharacterSkill[]): SkillEditorModel[] {
  return skills.map((skill) => ({
    ...skill,
    specialization: skill.specialization ?? '',
  }));
}

function skillEditorsEqual(a: SkillEditorModel[], b: SkillEditorModel[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((skill, index) => {
    const other = b[index];
    return (
      skill.name === other.name &&
      skill.rating === other.rating &&
      skill.specialization === other.specialization
    );
  });
}

function toCharacterSkills(models: SkillEditorModel[]): CharacterSkill[] {
  return models.map(({ specialization, ...skill }) => ({
    ...skill,
    specialization: specialization.trim() || undefined,
  }));
}

function skillGroupsEqual(a: CharacterSkillGroup[], b: CharacterSkillGroup[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((group, index) => {
    const other = b[index];
    return group.name === other.name && group.rating === other.rating;
  });
}

@Component({
  selector: 'app-skills-tab',
  imports: [FormField, SourceFilterControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.character(); as character) {
      <section aria-labelledby="skills-heading">
        <h2 id="skills-heading">Skills</h2>

        <div class="subsection" aria-labelledby="active-skills-heading">
          <div class="section-header">
            <h3 id="active-skills-heading">Active skills</h3>
          </div>

          <div class="filter-toolbar">
            <label>
              <span class="sr-only">Search active skills</span>
              <input
                type="search"
                placeholder="Search skills…"
                [formField]="activeSearchForm.query"
              />
            </label>
            <app-source-filter-control />
            <span class="muted">{{ contentSourceScopeLabel(filter.scope()) }}</span>
          </div>

          <table class="catalog-table">
            <caption class="sr-only">Active skill catalog</caption>
            <thead>
              <tr>
                <th scope="col">Skill</th>
                <th scope="col">Group</th>
                <th scope="col">Category</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              @for (item of filteredActiveCatalog(); track item.name) {
                <tr>
                  <td>{{ item.name }}</td>
                  <td>{{ item['skillgroup'] || '—' }}</td>
                  <td>{{ categoryLabel(item) }}</td>
                  <td>
                    @if (hasActiveSkill(item.name)) {
                      <span class="muted">Added</span>
                    } @else {
                      <button type="button" (click)="store.addActiveSkillFromCatalog(item.name)">
                        Add
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>

          @if (character.skills.length) {
            <h4>Character active skills</h4>
            <ul class="skill-editor-list">
              @for (skill of character.skills; track skill.name; let i = $index) {
                <li>
                  <div class="skill-row">
                    <span class="skill-name">{{ skill.name }}</span>
                    <label>
                      <span class="sr-only">Rating for {{ skill.name }}</span>
                      <input
                        type="number"
                        [formField]="activeSkillsForm[i].rating"
                      />
                    </label>
                    @if (effectiveRating(skill.name); as effective) {
                      @if (effective !== skill.rating) {
                        <span class="effective-rating" title="Effective rating with quality bonuses">
                          eff. {{ effective }}
                        </span>
                      }
                    }
                    @if (skill.grouped) {
                      <span class="badge">Grouped</span>
                    }
                    <label class="spec-field">
                      <span class="sr-only">Specialization for {{ skill.name }}</span>
                      <input
                        type="text"
                        placeholder="Specialization"
                        [formField]="activeSkillsForm[i].specialization"
                      />
                    </label>
                    <button type="button" (click)="store.removeActiveSkill(skill.name)">Remove</button>
                  </div>
                </li>
              }
            </ul>
          }
        </div>

        <div class="subsection" aria-labelledby="skill-groups-heading">
          <div class="section-header">
            <h3 id="skill-groups-heading">Skill groups</h3>
          </div>

          <label class="add-row">
            <span class="sr-only">Add skill group</span>
            <select #groupSelect>
              <option value="">Add skill group…</option>
              @for (group of availableSkillGroups(); track group) {
                <option [value]="group">{{ group }}</option>
              }
            </select>
            <button
              type="button"
              (click)="addSkillGroup(groupSelect.value); groupSelect.value = ''"
              [disabled]="!groupSelect.value"
            >
              Add group
            </button>
          </label>

          @if (character.skillGroups.length) {
            <ul class="skill-editor-list">
              @for (group of character.skillGroups; track group.name; let i = $index) {
                <li>
                  <div class="skill-row">
                    <span class="skill-name">{{ group.name }}</span>
                    <label>
                      <span class="sr-only">Rating for {{ group.name }}</span>
                      <input
                        type="number"
                        [formField]="skillGroupsForm[i].rating"
                      />
                    </label>
                    @if (group.broken) {
                      <span class="badge warn">Broken</span>
                    }
                    <button type="button" (click)="store.removeSkillGroup(group.name)">Remove</button>
                  </div>
                </li>
              }
            </ul>
          } @else {
            <p class="muted">No skill groups yet.</p>
          }
        </div>

        <div class="subsection" aria-labelledby="knowledge-skills-heading">
          <div class="section-header">
            <h3 id="knowledge-skills-heading">Knowledge &amp; language skills</h3>
            <p class="muted">
              Free points: {{ store.freeKnowledgeSkillPoints() }}
            </p>
          </div>

          <div class="filter-toolbar">
            <label>
              <span class="sr-only">Search knowledge skills</span>
              <input
                type="search"
                placeholder="Search knowledge skills…"
                [formField]="knowledgeSearchForm.query"
              />
            </label>
          </div>

          <table class="catalog-table">
            <caption class="sr-only">Knowledge skill catalog</caption>
            <thead>
              <tr>
                <th scope="col">Skill</th>
                <th scope="col">Category</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              @for (item of filteredKnowledgeCatalog(); track item.name) {
                <tr>
                  <td>{{ item.name }}</td>
                  <td>{{ categoryLabel(item) }}</td>
                  <td>
                    @if (hasKnowledgeSkill(item.name)) {
                      <span class="muted">Added</span>
                    } @else {
                      <button type="button" (click)="store.addKnowledgeSkillFromCatalog(item.name)">
                        Add
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>

          @if (character.knowledgeSkills.length) {
            <h4>Character knowledge skills</h4>
            <ul class="skill-editor-list">
              @for (skill of character.knowledgeSkills; track skill.name; let i = $index) {
                <li>
                  <div class="skill-row">
                    <span class="skill-name">{{ skill.name }}</span>
                    <label>
                      <span class="sr-only">Rating for {{ skill.name }}</span>
                      <input
                        type="number"
                        [formField]="knowledgeSkillsForm[i].rating"
                      />
                    </label>
                    <label class="spec-field">
                      <span class="sr-only">Specialization for {{ skill.name }}</span>
                      <input
                        type="text"
                        placeholder="Specialization"
                        [formField]="knowledgeSkillsForm[i].specialization"
                      />
                    </label>
                    <button type="button" (click)="store.removeKnowledgeSkill(skill.name)">
                      Remove
                    </button>
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      </section>
    }
  `,
  styles: `
    h2, h3, h4 { margin: 0 0 0.75rem; }
    h4 { font-size: 0.95rem; margin-top: 1rem; }

    .subsection {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--color-border);

      &:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
      }
    }

    .section-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .filter-toolbar {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .catalog-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1rem;
      font-size: 0.9rem;

      th, td {
        padding: 0.4rem 0.5rem;
        border-bottom: 1px solid var(--color-border);
        text-align: left;
      }

      th { color: var(--color-text-muted); font-weight: 500; }
    }

    .skill-editor-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .skill-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .skill-name {
      min-width: 8rem;
      font-weight: 500;
    }

    .spec-field {
      flex: 1;
      min-width: 10rem;
    }

    .effective-rating {
      font-size: 0.85rem;
      color: var(--color-accent);
    }

    .badge {
      font-size: 0.75rem;
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius);
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border);

      &.warn { color: var(--color-danger); }
    }

    .add-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .muted { color: var(--color-text-muted); }

    input, select, button {
      padding: 0.4rem 0.5rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text);
    }

    button { cursor: pointer; }
    button:hover { border-color: var(--color-accent); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `,
})
export class SkillsTab implements OnInit {
  readonly store = inject(CharacterStoreService);
  readonly filter = inject(ContentFilterService);
  readonly contentSourceScopeLabel = contentSourceScopeLabel;
  readonly categoryLabel = categoryLabel;

  readonly activeSearchModel = signal({ query: '' });
  readonly activeSearchForm = form(this.activeSearchModel);

  readonly knowledgeSearchModel = signal({ query: '' });
  readonly knowledgeSearchForm = form(this.knowledgeSearchModel);

  readonly activeSkillsModel = linkedSignal(() =>
    toSkillEditorModels(this.store.character()?.skills ?? []),
  );
  readonly activeSkillsForm = form(this.activeSkillsModel);

  readonly skillGroupsModel = linkedSignal(() =>
    (this.store.character()?.skillGroups ?? []).map((group) => ({ ...group })),
  );
  readonly skillGroupsForm = form(this.skillGroupsModel);

  readonly knowledgeSkillsModel = linkedSignal(() =>
    toSkillEditorModels(this.store.character()?.knowledgeSkills ?? []),
  );
  readonly knowledgeSkillsForm = form(this.knowledgeSkillsModel);

  readonly activeCatalog = signal<ChummerItem[]>([]);
  readonly knowledgeCatalog = signal<ChummerItem[]>([]);

  readonly filteredActiveCatalog = computed(() => {
    const query = this.activeSearchModel().query;
    const scope = this.filter.scope();
    return sortByName(
      this.activeCatalog().filter(
        (item) => matchesSourceScope(item, scope) && matchesSearch(item, query),
      ),
    );
  });

  readonly filteredKnowledgeCatalog = computed(() => {
    const query = this.knowledgeSearchModel().query;
    return sortByName(
      this.knowledgeCatalog().filter((item) => matchesSearch(item, query)),
    );
  });

  readonly availableSkillGroups = computed(() => {
    const character = this.store.character();
    if (!character) return [];
    const owned = new Set(character.skillGroups.map((group) => group.name));
    return this.store.skillGroupNames().filter((name) => !owned.has(name));
  });

  constructor() {
    effect(() => {
      const next = this.activeSkillsModel();
      const current = toSkillEditorModels(this.store.character()?.skills ?? []);
      if (skillEditorsEqual(current, next)) return;
      untracked(() => this.store.syncActiveSkills(toCharacterSkills(next)));
    });

    effect(() => {
      const next = this.skillGroupsModel();
      const current = this.store.character()?.skillGroups ?? [];
      if (skillGroupsEqual(current, next)) return;
      untracked(() => this.store.syncSkillGroups(next));
    });

    effect(() => {
      const next = this.knowledgeSkillsModel();
      const current = toSkillEditorModels(this.store.character()?.knowledgeSkills ?? []);
      if (skillEditorsEqual(current, next)) return;
      untracked(() => this.store.syncKnowledgeSkills(toCharacterSkills(next)));
    });
  }

  ngOnInit(): void {
    this.activeCatalog.set(
      this.store.skillCatalog().map((skill) => ({
        name: skill.name,
        skillgroup: skill.skillGroup,
        category: skill.skillCategory,
        default: skill.default,
        source: 'SR4',
      })),
    );
    this.knowledgeCatalog.set(
      this.store.knowledgeCatalog().map((skill) => ({
        name: skill.name,
        category: skill.skillCategory,
        source: 'SR4',
      })),
    );
  }

  hasActiveSkill(name: string): boolean {
    return this.store.character()?.skills.some((skill) => skill.name === name) ?? false;
  }

  hasKnowledgeSkill(name: string): boolean {
    return (
      this.store.character()?.knowledgeSkills.some((skill) => skill.name === name) ?? false
    );
  }

  addSkillGroup(groupName: string): void {
    if (!groupName) return;
    this.store.addSkillGroup(groupName);
  }

  skillMax(skillName: string): number {
    const character = this.store.character();
    if (!character) return 6;
    const skill = character.skills.find((entry) => entry.name === skillName);
    if (!skill) return 6;
    return getSkillRatingMaximum(character, skill);
  }

  effectiveRating(skillName: string): number {
    const character = this.store.character();
    if (!character) return 0;
    const skill = character.skills.find((entry) => entry.name === skillName);
    if (!skill) return 0;
    return getEffectiveSkillRating(character, skill);
  }
}
