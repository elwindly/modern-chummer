import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, styles the confirm action as destructive. */
  danger?: boolean;
  /** Alert mode: single dismiss button, no cancel. */
  alertOnly?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (!data.alertOnly) {
        <button mat-button type="button" [mat-dialog-close]="false">
          {{ data.cancelLabel || 'Cancel' }}
        </button>
      }
      <button
        mat-flat-button
        type="button"
        class="confirm-action"
        [class.danger]="!!data.danger"
        [color]="data.danger ? 'warn' : 'primary'"
        [mat-dialog-close]="true"
      >
        {{ data.confirmLabel || (data.alertOnly ? 'OK' : 'Continue') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    mat-dialog-content p {
      margin: 0;
      max-width: 28rem;
      line-height: 1.5;
    }

    mat-dialog-actions {
      gap: 0.5rem;
      padding-bottom: 0.75rem;
    }

    .confirm-action {
      --mdc-filled-button-label-text-color: var(--color-on-accent);
      --mat-button-filled-label-text-color: var(--color-on-accent);
    }

    .confirm-action.danger {
      --mdc-filled-button-container-color: var(--color-danger);
      --mat-button-filled-container-color: var(--color-danger);
      --mdc-filled-button-label-text-color: #fff;
      --mat-button-filled-label-text-color: #fff;
    }
  `,
})
export class ConfirmDialogComponent {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}

/** Opens a Material confirm dialog; resolves true when the user confirms. */
export async function openConfirmDialog(
  dialog: MatDialog,
  data: ConfirmDialogData,
): Promise<boolean> {
  const ref = dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
    ConfirmDialogComponent,
    {
      data: { ...data, alertOnly: false },
      width: '24rem',
      autoFocus: 'dialog',
      restoreFocus: true,
      role: 'alertdialog',
    },
  );

  return (await firstValueFrom(ref.afterClosed())) === true;
}

/** Opens a Material alert dialog (single OK button). */
export async function openAlertDialog(
  dialog: MatDialog,
  data: Pick<ConfirmDialogData, 'title' | 'message' | 'confirmLabel'>,
): Promise<void> {
  const ref = dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
    ConfirmDialogComponent,
    {
      data: {
        title: data.title,
        message: data.message,
        confirmLabel: data.confirmLabel ?? 'OK',
        alertOnly: true,
      },
      width: '24rem',
      autoFocus: 'dialog',
      restoreFocus: true,
      role: 'alertdialog',
    },
  );

  await firstValueFrom(ref.afterClosed());
}
