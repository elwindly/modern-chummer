import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CharacterStoreService } from '../../../core/services/character-store.service';

@Component({
  selector: 'app-bp-summary-tab',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="bp-summary-heading">
      <h2 id="bp-summary-heading">BP Summary</h2>

      @if (store.bpBreakdown(); as bp) {
        <table class="summary-table">
          <caption class="sr-only">Build point breakdown</caption>
          <tbody>
            <tr>
              <th scope="row">Metatype</th>
              <td>{{ bp.metatype }}</td>
            </tr>
            <tr>
              <th scope="row">Positive qualities</th>
              <td>{{ bp.positiveQualities }}</td>
            </tr>
            <tr>
              <th scope="row">Negative qualities</th>
              <td>{{ bp.negativeQualities }}</td>
            </tr>
            <tr>
              <th scope="row">Primary attributes</th>
              <td>{{ bp.primaryAttributes }}</td>
            </tr>
            <tr>
              <th scope="row">Special attributes</th>
              <td>{{ bp.specialAttributes }}</td>
            </tr>
            <tr>
              <th scope="row">Contacts</th>
              <td>{{ bp.contacts }}</td>
            </tr>
            @if (bp.enemies) {
              <tr>
                <th scope="row">Enemies</th>
                <td>{{ bp.enemies }}</td>
              </tr>
            }
            <tr>
              <th scope="row">Active skills</th>
              <td>{{ bp.activeSkills }}</td>
            </tr>
            <tr>
              <th scope="row">Skill groups</th>
              <td>{{ bp.skillGroups }}</td>
            </tr>
            <tr>
              <th scope="row">Knowledge skills</th>
              <td>{{ bp.knowledgeSkills }}</td>
            </tr>
            <tr>
              <th scope="row">Martial arts</th>
              <td>{{ bp.martialArts }}</td>
            </tr>
            <tr>
              <th scope="row">Martial art maneuvers</th>
              <td>{{ bp.martialArtManeuvers }}</td>
            </tr>
            <tr>
              <th scope="row">Nuyen (BP)</th>
              <td>{{ bp.nuyenBp }}</td>
            </tr>
            <tr>
              <th scope="row">Remaining</th>
              <td [class.overspent]="bp.remaining < 0">{{ bp.remaining }}</td>
            </tr>
          </tbody>
        </table>
      }

      @if (store.nuyenBreakdown(); as nuyen) {
        <h3>Nuyen</h3>
        <table class="summary-table">
          <caption class="sr-only">Nuyen breakdown</caption>
          <tbody>
            <tr>
              <th scope="row">From BP</th>
              <td>{{ nuyen.fromBp | number }}</td>
            </tr>
            <tr>
              <th scope="row">From improvements</th>
              <td>{{ nuyen.fromImprovements | number }}</td>
            </tr>
            <tr>
              <th scope="row">Spent</th>
              <td>{{ nuyen.spent | number }}</td>
            </tr>
            @if (hasStreetGear()) {
              <tr>
                <th scope="row">Gear items</th>
                <td>{{ purchaseCount() }}</td>
              </tr>
            }
            <tr>
              <th scope="row">Remaining</th>
              <td>{{ nuyen.remaining | number }}</td>
            </tr>
          </tbody>
        </table>
      }

      @if (store.validation(); as validation) {
        <div class="validation status-panel" [class.valid]="validation.valid" role="status" aria-live="polite">
          @if (validation.valid) {
            Character passes current validation checks.
          } @else {
            <ul>
              @for (issue of validation.issues; track issue.code) {
                <li>{{ issue.message }}</li>
              }
            </ul>
          }
        </div>
      }
    </section>
  `,
  styles: `
    h2, h3 { margin: 0 0 0.75rem; }
    h3 { font-size: 1rem; margin-top: 1.25rem; }

    .summary-table {
      width: 100%;
      max-width: 24rem;
      border-collapse: collapse;

      th, td {
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid var(--color-border);
        text-align: left;
      }

      th { font-weight: 500; color: var(--color-text-muted); width: 50%; }
    }

    .overspent {
      color: var(--color-danger);
      font-weight: 600;
    }

    .validation {
      margin-top: 1rem;

      ul { margin: 0; padding-left: 1.25rem; }
    }

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
export class BpSummaryTab {
  readonly store = inject(CharacterStoreService);

  readonly purchaseCount = computed(() => {
    const character = this.store.character();
    if (!character) return 0;
    const countItems = (items: typeof character.gear): number =>
      items.reduce((sum, item) => sum + 1 + countItems(item.children), 0);
    return (
      countItems(character.gear) +
      countItems(character.weapons) +
      countItems(character.armors)
    );
  });

  hasStreetGear(): boolean {
    const character = this.store.character();
    if (!character) return false;
    return character.gear.length + character.weapons.length + character.armors.length > 0;
  }
}
