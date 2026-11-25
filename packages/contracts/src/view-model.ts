/**
 * 跨平台統一呈現契約 PetViewModel（Master PRD v2.1.29 §0、§5.2）。
 *
 * 平台端一律唯讀消費本契約；`interruptible` 與 `cooldownMs` 僅供 Game Core 內部仲裁，
 * 不得出現在 PetViewModel。
 */

import type { AnimationId, IconId, SoundId, TailState } from './behavior';
import type { PetAppearance } from './genetics';
import type { RecoveryState } from './pet';

export interface PetViewModelNeeds {
  readonly hunger: number;
  readonly hydration: number;
  readonly mood: number;
  readonly health: number;
}

export interface PetViewModelBehavior {
  readonly animationId: AnimationId;
  readonly tailState: TailState;
  readonly iconIds: readonly IconId[];
  readonly soundId: SoundId | null;
  readonly durationMs: number;
}

export interface PetViewModelDisplay {
  /** = (behavior.animationId === "sleep") */
  readonly isSleeping: boolean;
  /** = (pet.health < 40) */
  readonly isHealthCritical: boolean;
  /** = pet.recoveryState */
  readonly recoveryState: RecoveryState;
  /** = pet.isCarePaused */
  readonly isCarePaused: boolean;
}

export interface PetViewModel {
  readonly petId: string;
  readonly name: string;
  readonly microchipId: string | null;
  readonly appearance: PetAppearance;
  readonly needs: PetViewModelNeeds;
  readonly behavior: PetViewModelBehavior;
  readonly display: PetViewModelDisplay;
  /** Unix timestamp (ms)。 */
  readonly updatedAt: number;
}
