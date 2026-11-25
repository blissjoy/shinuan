/**
 * GameCommand 指令契約（Master PRD v2.1.29 §0、§8.B.1、§8.C.3）。
 *
 * Phase A 完整 11 種指令判別聯集；本檔不含任何指令執行或結算邏輯。
 */

import type { ItemId } from './catalog';

/** Phase A 完整 GameCommand 指令類型（PRD §8.B.1）。 */
export const GAME_COMMAND_TYPES = Object.freeze([
  'FeedPet',
  'DrinkWater',
  'PetCat',
  'PlayWithPet',
  'PokePet',
  'TriggerLanding',
  'ToggleCarePause',
  'ClaimDailyCheckIn',
  'OpenShop',
  'InspectProduct',
  'BuyItem',
] as const);
export type GameCommandType = (typeof GAME_COMMAND_TYPES)[number];

interface CommandBase<T extends GameCommandType> {
  readonly type: T;
  /** 指令發生之 Unix 時間戳 (ms)。 */
  readonly timestamp: number;
}

/** 餵食（乾糧／主食罐／零食）。 */
export interface FeedPetCommand extends CommandBase<'FeedPet'> {
  readonly itemId: ItemId;
}

/** 補水；省略 itemId 時預設使用 `free_fresh_water`（PRD §8.B.1）。 */
export interface DrinkWaterCommand extends CommandBase<'DrinkWater'> {
  readonly itemId?: ItemId;
}

export type PetCatCommand = CommandBase<'PetCat'>;

export type PlayWithPetCommand = CommandBase<'PlayWithPet'>;

export type PokePetCommand = CommandBase<'PokePet'>;

/** 高空掉落；dropHeightRatio 為垂直落下距離相對螢幕高度之比例。 */
export interface TriggerLandingCommand extends CommandBase<'TriggerLanding'> {
  readonly dropHeightRatio: number;
}

export interface ToggleCarePauseCommand extends CommandBase<'ToggleCarePause'> {
  readonly enabled: boolean;
}

export type ClaimDailyCheckInCommand = CommandBase<'ClaimDailyCheckIn'>;

export type OpenShopCommand = CommandBase<'OpenShop'>;

export interface InspectProductCommand extends CommandBase<'InspectProduct'> {
  readonly itemId: ItemId;
  /** 商品詳情頁停留時間 (ms)。 */
  readonly dwellMs: number;
}

export interface BuyItemCommand extends CommandBase<'BuyItem'> {
  readonly itemId: ItemId;
  readonly quantity?: number;
}

/** Phase A 完整 GameCommand 判別聯集（11 種）。 */
export type GameCommand =
  | FeedPetCommand
  | DrinkWaterCommand
  | PetCatCommand
  | PlayWithPetCommand
  | PokePetCommand
  | TriggerLandingCommand
  | ToggleCarePauseCommand
  | ClaimDailyCheckInCommand
  | OpenShopCommand
  | InspectProductCommand
  | BuyItemCommand;
