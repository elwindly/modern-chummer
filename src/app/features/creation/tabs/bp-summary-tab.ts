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
            @if (bp.spells) {
              <tr>
                <th scope="row">Spells</th>
                <td>{{ bp.spells }}</td>
              </tr>
            }
            @if (bp.complexForms) {
              <tr>
                <th scope="row">Complex forms</th>
                <td>{{ bp.complexForms }}</td>
              </tr>
            }
            @if (bp.initiation) {
              <tr>
                <th scope="row">Initiation (karma BP)</th>
                <td>{{ bp.initiation }}</td>
              </tr>
            }
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
            @if (wareCount()) {
              <tr>
                <th scope="row">Cyberware / bioware</th>
                <td>{{ wareCount() }} items</td>
              </tr>
            }
            @if (vehicleCount()) {
              <tr>
                <th scope="row">Vehicles</th>
                <td>{{ vehicleCount() }} ({{ vehicleModCount() }} mods)</td>
              </tr>
            }
            <tr>
              <th scope="row">Remaining</th>
              <td>{{ nuyen.remaining | number }}</td>
            </tr>
          </tbody>
        </table>
      }

      @if (showPowerPoints() && store.powerPointBreakdown(); as pp) {
        <h3>Power points</h3>
        <table class="summary-table">
          <caption class="sr-only">Adept power point breakdown</caption>
          <tbody>
            <tr>
              <th scope="row">Pool</th>
              <td>{{ pp.pool }}</td>
            </tr>
            <tr>
              <th scope="row">Used</th>
              <td>{{ pp.used }}</td>
            </tr>
            <tr>
              <th scope="row">Remaining</th>
              <td [class.overspent]="pp.remaining < 0">{{ pp.remaining }}</td>
            </tr>
          </tbody>
        </table>
      }

      @if (store.derivedStats(); as stats) {
        <h3>Other info</h3>
        <table class="summary-table">
          <caption class="sr-only">Derived character statistics</caption>
          <tbody>
            <tr>
              <th scope="row">Composure</th>
              <td>{{ stats.composure }}</td>
            </tr>
            <tr>
              <th scope="row">Judge intentions</th>
              <td>{{ stats.judgeIntentions }}</td>
            </tr>
            <tr>
              <th scope="row">Memory</th>
              <td>{{ stats.memory }}</td>
            </tr>
            <tr>
              <th scope="row">Lift / carry (kg)</th>
              <td>{{ stats.liftCarry }}</td>
            </tr>
            <tr>
              <th scope="row">Walking (m/combat turn)</th>
              <td>{{ stats.walking }}</td>
            </tr>
            <tr>
              <th scope="row">Running (m/combat turn)</th>
              <td>{{ stats.running }}</td>
            </tr>
            <tr>
              <th scope="row">Initiative bonus</th>
              <td>{{ stats.initiativeBonus }}</td>
            </tr>
            <tr>
              <th scope="row">Initiative passes</th>
              <td>{{ stats.initiativePasses }}</td>
            </tr>
            <tr>
              <th scope="row">Matrix initiative bonus</th>
              <td>{{ stats.matrixInitiativeBonus }}</td>
            </tr>
            <tr>
              <th scope="row">Physical CM</th>
              <td>{{ stats.physicalCm }}</td>
            </tr>
            <tr>
              <th scope="row">Stun CM</th>
              <td>{{ stats.stunCm }}</td>
            </tr>
            <tr>
              <th scope="row">CM threshold</th>
              <td>{{ stats.cmThreshold }}</td>
            </tr>
            <tr>
              <th scope="row">CM threshold offset</th>
              <td>{{ stats.cmThresholdOffset }}</td>
            </tr>
            <tr>
              <th scope="row">CM overflow</th>
              <td>{{ stats.cmOverflow }}</td>
            </tr>
            <tr>
              <th scope="row">Damage resistance</th>
              <td>{{ stats.damageResistance }}</td>
            </tr>
            <tr>
              <th scope="row">Unarmed DV</th>
              <td>{{ stats.unarmedDV }}</td>
            </tr>
            <tr>
              <th scope="row">Reach</th>
              <td>{{ stats.reach }}</td>
            </tr>
          </tbody>
        </table>
      }

      @if (store.character()?.created) {
        <p class="finalized status-panel" role="status">
          Character is finalized. Use <strong>Reopen for editing</strong> in the header to return to creation,
          or edit any field — that also clears finalized status.
        </p>
      } @else if (store.reopenedByEdit()) {
        <p class="reopened status-panel" role="status">
          Creation was reopened because the character was edited after finalize.
        </p>
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

    .finalized {
      margin-top: 1rem;
      padding: 0.75rem;
      border: 1px solid var(--color-accent);
      border-radius: var(--radius);
      background: var(--color-surface-raised);
    }

    .reopened {
      margin-top: 1rem;
      padding: 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface-raised);
      color: var(--color-text-muted);
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

  readonly wareCount = computed(() => {
    const character = this.store.character();
    if (!character) return 0;
    const countWare = (items: typeof character.cyberware): number =>
      items.reduce((sum, item) => sum + 1 + countWare(item.children), 0);
    return countWare(character.cyberware) + countWare(character.bioware);
  });

  readonly vehicleCount = computed(() => this.store.character()?.vehicles.length ?? 0);

  readonly vehicleModCount = computed(() => {
    const character = this.store.character();
    if (!character) return 0;
    return character.vehicles.reduce((sum, vehicle) => sum + vehicle.mods.length, 0);
  });

  readonly showPowerPoints = computed(
    () => this.store.character()?.flags.adeptEnabled === true,
  );

  hasStreetGear(): boolean {
    const character = this.store.character();
    if (!character) return false;
    return character.gear.length + character.weapons.length + character.armors.length > 0;
  }
}
