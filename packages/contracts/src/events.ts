/**
 * GameEvent 不可變事實事件契約（Master PRD v2.1.29 §0、§8.B.1、§8.C.1、§8.C.3）。
 *
 * 引擎輸出之事實事件判別聯集，皆含 `type` 與 `timestamp`；本檔不含事件產生邏輯。
 */

import type { BehaviorDecision } from './behavior';
import type { FoodCategory, ItemId } from './catalog';
import type { GameCommandType } from './commands';
import type { PetNeeds, RecoveryState } from './pet';

export const GAME_EVENT_TYPES = Object.freeze([
  'TimeSimulated',
  'ClockRollbackDetected',
  'NeedsUpdated',
  'RecoveryStateChanged',
  'CommandExecuted',
  'CommandRejected',
  'CoinsChanged',
  'ItemPurchased',
  'ItemConsumed',
  'CarePauseToggled',
  'DailyCheckInClaimed',
  'ProductInspected',
  'DayRolledOver',
  'BehaviorDecided',
] as const);
export type GameEventType = (typeof GAME_EVENT_TYPES)[number];

interface EventBase<T extends GameEventType> {
  readonly type: T;
  /** 事件發生之 Unix 時間戳 (ms)。 */
  readonly timestamp: number;
}

/** 時間差模擬已結算 [fromTimestamp, toTimestamp] 區段。 */
export interface TimeSimulatedEvent extends EventBase<'TimeSimulated'> {
  readonly fromTimestamp: number;
  readonly toTimestamp: number;
}

/** 偵測到時鐘回撥（now 早於既有權威時間戳）。 */
export interface ClockRollbackDetectedEvent extends EventBase<'ClockRollbackDetected'> {
  readonly lastKnownTimestamp: number;
  readonly observedTimestamp: number;
}

export interface NeedsUpdatedEvent extends EventBase<'NeedsUpdated'> {
  readonly needs: PetNeeds;
  readonly health: number;
}

export interface RecoveryStateChangedEvent extends EventBase<'RecoveryStateChanged'> {
  readonly from: RecoveryState;
  readonly to: RecoveryState;
}

export interface CommandExecutedEvent extends EventBase<'CommandExecuted'> {
  readonly commandType: GameCommandType;
}

export interface CommandRejectedEvent extends EventBase<'CommandRejected'> {
  readonly commandType: GameCommandType;
  /** 拒絕原因代碼（具體代碼清單由引擎任務定義）。 */
  readonly reason: string;
}

export interface CoinsChangedEvent extends EventBase<'CoinsChanged'> {
  /** 積分變動量（正為增加、負為扣減）。 */
  readonly delta: number;
  /** 變動後餘額。 */
  readonly balance: number;
  /** 變動來源代碼（具體代碼清單由引擎任務定義）。 */
  readonly reason: string;
}

export interface ItemPurchasedEvent extends EventBase<'ItemPurchased'> {
  readonly itemId: ItemId;
  readonly quantity: number;
  readonly totalPrice: number;
}

export interface ItemConsumedEvent extends EventBase<'ItemConsumed'> {
  readonly itemId: ItemId;
  readonly category: FoodCategory;
}

export interface CarePauseToggledEvent extends EventBase<'CarePauseToggled'> {
  readonly enabled: boolean;
}

export interface DailyCheckInClaimedEvent extends EventBase<'DailyCheckInClaimed'> {
  /** 本地日期 YYYY-MM-DD。 */
  readonly localDate: string;
}

export interface ProductInspectedEvent extends EventBase<'ProductInspected'> {
  readonly itemId: ItemId;
  readonly dwellMs: number;
}

export interface DayRolledOverEvent extends EventBase<'DayRolledOver'> {
  /** 本地日期 YYYY-MM-DD。 */
  readonly fromLocalDate: string;
  /** 本地日期 YYYY-MM-DD。 */
  readonly toLocalDate: string;
}

export interface BehaviorDecidedEvent extends EventBase<'BehaviorDecided'> {
  readonly decision: BehaviorDecision;
}

/** 引擎輸出之不可變事實事件判別聯集。 */
export type GameEvent =
  | TimeSimulatedEvent
  | ClockRollbackDetectedEvent
  | NeedsUpdatedEvent
  | RecoveryStateChangedEvent
  | CommandExecutedEvent
  | CommandRejectedEvent
  | CoinsChangedEvent
  | ItemPurchasedEvent
  | ItemConsumedEvent
  | CarePauseToggledEvent
  | DailyCheckInClaimedEvent
  | ProductInspectedEvent
  | DayRolledOverEvent
  | BehaviorDecidedEvent;
