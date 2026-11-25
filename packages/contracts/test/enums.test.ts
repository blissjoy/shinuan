/**
 * SHINUAN-S1-01 契約列舉常數完整性測試（Master PRD v2.1.29）。
 * 預期值逐字對應 PRD 原文，不得自行調整。
 */
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  ANIMATION_IDS,
  APPEARANCE_LAYER_NAMES,
  APPEARANCE_LAYER_TRAITS,
  BEHAVIOR_CATEGORIES,
  BEHAVIOR_PRIORITIES,
  BEHAVIOR_PRIORITY_BY_CATEGORY,
  BODY_TRAITS,
  BREED_IDS,
  BUILT_IN_ITEM_IDS,
  COAT_PATTERN_TRAITS,
  COLOR_PARAMS_DELTA_RANGE,
  CONTRACTS_PACKAGE_NAME,
  CURRENT_SCHEMA_VERSION,
  EARS_TRAITS,
  EYES_TRAITS,
  FEED_SOURCE_TYPES,
  FOOD_CATEGORIES,
  GAME_COMMAND_TYPES,
  GAME_EVENT_TYPES,
  GROWTH_STAGES,
  HEAD_TRAITS,
  ICON_IDS,
  MVP_QUIRK_IDS,
  NON_RARE_MUTATION_LAYER_NAMES,
  P0_B_ANIMATION_IDS,
  P0_C_ANIMATION_IDS,
  P1_ANIMATION_IDS,
  PRODUCT_DATA_TYPES,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  PUPIL_COLOR_TRAITS,
  QUIRK_MODIFIER_TYPES,
  RARE_MUTATION_LAYER_NAMES,
  RARE_MUTATION_TRAITS,
  RECOVERY_STATES,
  SAFE_DEFAULT_APPEARANCE_LAYERS,
  SOUND_IDS,
  TAIL_STATES,
  TAIL_TRAITS,
  type AnimationId,
  type BreedId,
  type GameCommand,
  type GameCommandType,
  type GameEvent,
  type GameEventType,
  type QuirkId,
  type RecoveryState,
  type TailState,
} from '../src/index';

const expectUnique = (values: readonly unknown[]): void => {
  expect(new Set(values).size).toBe(values.length);
};

describe('contracts entry', () => {
  it('保留原有 CONTRACTS_PACKAGE_NAME 匯出', () => {
    expect(CONTRACTS_PACKAGE_NAME).toBe('@shinuan/contracts');
  });
});

describe('BreedId（PRD §3.1、§8.A.2）', () => {
  it('恰為 6 大基礎品種且依序', () => {
    expect(BREED_IDS).toEqual([
      'domestic',
      'munchkin',
      'ragdoll',
      'british_shorthair',
      'exotic',
      'maine_coon',
    ]);
    expectUnique(BREED_IDS);
    expect(Object.isFrozen(BREED_IDS)).toBe(true);
    expectTypeOf<BreedId>().toEqualTypeOf<
      'domestic' | 'munchkin' | 'ragdoll' | 'british_shorthair' | 'exotic' | 'maine_coon'
    >();
  });
});

describe('七大外觀圖層枚舉（PRD §8.A.3 第 1 點）', () => {
  it('圖層名稱依 PRD §8.A.4 固定抽選順序', () => {
    expect(APPEARANCE_LAYER_NAMES).toEqual([
      'head',
      'ears',
      'eyes',
      'pupilColor',
      'coatPattern',
      'tail',
      'body',
    ]);
  });

  it('各圖層枚舉值完整', () => {
    expect(HEAD_TRAITS).toEqual(['standard_round', 'chubby_round', 'flat_face', 'square_muzzle']);
    expect(EARS_TRAITS).toEqual(['pointed_medium', 'small_round', 'tufted_large', 'folded_tip']);
    expect(EYES_TRAITS).toEqual(['almond', 'big_round', 'droopy_cute']);
    expect(PUPIL_COLOR_TRAITS).toEqual([
      'amber',
      'emerald',
      'sapphire',
      'copper',
      'heterochromia_blue_gold',
    ]);
    expect(COAT_PATTERN_TRAITS).toEqual([
      'solid',
      'tabby_mackerel',
      'bicolor_tuxedo',
      'colorpoint',
      'calico',
      'tortoiseshell',
      'starry_rare',
    ]);
    expect(TAIL_TRAITS).toEqual(['long_straight', 'fluffy_plume', 'short_bobtail', 'kinked_kirin']);
    expect(BODY_TRAITS).toEqual(['normal', 'chubby', 'short_legs', 'large_fluffy', 'giant_fluffy']);
  });

  it('APPEARANCE_LAYER_TRAITS 對應七層且各層無重複', () => {
    expect(Object.keys(APPEARANCE_LAYER_TRAITS).sort()).toEqual([...APPEARANCE_LAYER_NAMES].sort());
    for (const layer of APPEARANCE_LAYER_NAMES) {
      expectUnique(APPEARANCE_LAYER_TRAITS[layer]);
      expect(Object.isFrozen(APPEARANCE_LAYER_TRAITS[layer])).toBe(true);
    }
  });

  it('稀有突變：恰 4 層（折耳、異色瞳、星空斑紋、麒麟尾）', () => {
    expect(RARE_MUTATION_LAYER_NAMES).toEqual(['ears', 'pupilColor', 'coatPattern', 'tail']);
    expect(NON_RARE_MUTATION_LAYER_NAMES).toEqual(['head', 'eyes', 'body']);
    expect(RARE_MUTATION_TRAITS).toEqual({
      ears: 'folded_tip',
      pupilColor: 'heterochromia_blue_gold',
      coatPattern: 'starry_rare',
      tail: 'kinked_kirin',
    });
    for (const layer of RARE_MUTATION_LAYER_NAMES) {
      const allowed: readonly string[] = APPEARANCE_LAYER_TRAITS[layer];
      expect(allowed).toContain(RARE_MUTATION_TRAITS[layer]);
    }
    const all = new Set<string>([...RARE_MUTATION_LAYER_NAMES, ...NON_RARE_MUTATION_LAYER_NAMES]);
    expect([...all].sort()).toEqual([...APPEARANCE_LAYER_NAMES].sort());
  });

  it('SAFE_DEFAULT_APPEARANCE_LAYERS 對應 PRD §8.A.3 規則 4 且不可變', () => {
    expect(SAFE_DEFAULT_APPEARANCE_LAYERS).toEqual({
      head: 'standard_round',
      ears: 'pointed_medium',
      eyes: 'almond',
      pupilColor: 'amber',
      coatPattern: 'solid',
      tail: 'long_straight',
      body: 'normal',
    });
    expect(Object.isFrozen(SAFE_DEFAULT_APPEARANCE_LAYERS)).toBe(true);
    for (const layer of APPEARANCE_LAYER_NAMES) {
      const allowed: readonly string[] = APPEARANCE_LAYER_TRAITS[layer];
      expect(allowed).toContain(SAFE_DEFAULT_APPEARANCE_LAYERS[layer]);
    }
  });

  it('colorParams 微調範圍為 [-0.08, +0.08]（PRD §8.A.1）', () => {
    expect(COLOR_PARAMS_DELTA_RANGE).toEqual({ min: -0.08, max: 0.08 });
  });
});

describe('AnimationId（PRD §8.B.3 唯一 15 支）', () => {
  it('分級清單完整', () => {
    expect(P0_B_ANIMATION_IDS).toEqual(['idle', 'walk', 'sit', 'sleep', 'eat', 'pet']);
    expect(P0_C_ANIMATION_IDS).toEqual(['cat_loaf', 'play']);
    expect(P1_ANIMATION_IDS).toEqual([
      'drag',
      'drop',
      'landing',
      'turn_back_angry',
      'sniff_and_turn_away',
      'crouch_alert',
      'side_sleep',
    ]);
  });

  it('合計 15 支、不重複、等於三級聯集', () => {
    expect(ANIMATION_IDS).toHaveLength(15);
    expectUnique(ANIMATION_IDS);
    expect(ANIMATION_IDS).toEqual([...P0_B_ANIMATION_IDS, ...P0_C_ANIMATION_IDS, ...P1_ANIMATION_IDS]);
    expectTypeOf<AnimationId>().toEqualTypeOf<(typeof ANIMATION_IDS)[number]>();
  });
});

describe('TailState / IconId / SoundId', () => {
  it('TailState 恰 8 種', () => {
    expect(TAIL_STATES).toEqual([
      'neutral',
      'question_mark',
      'question_mark_tremble',
      'slow_sway',
      'fast_whip',
      'tucked_drooped',
      'curled_sleep',
      'puffed_alert',
    ]);
    expectUnique(TAIL_STATES);
    expectTypeOf<TailState>().toEqualTypeOf<(typeof TAIL_STATES)[number]>();
  });

  it('IconId 恰 8 種', () => {
    expect(ICON_IDS).toEqual([
      'fish',
      'water',
      'heart',
      'angry',
      'hospital',
      'sleep_zzz',
      'ball',
      'sweat',
    ]);
    expectUnique(ICON_IDS);
  });

  it('SoundId 恰 7 種', () => {
    expect(SOUND_IDS).toEqual([
      'meow_happy',
      'purr',
      'hiss',
      'eat_crunch',
      'drink_lap',
      'alert_meow',
      'play_chirp',
    ]);
    expectUnique(SOUND_IDS);
  });
});

describe('行為優先級（PRD §8.B.1）', () => {
  it('優先級與類別一一對應', () => {
    expect(BEHAVIOR_PRIORITIES).toEqual([100, 90, 80, 60, 40, 10]);
    expect(BEHAVIOR_CATEGORIES).toEqual([
      'CRITICAL_NEEDS',
      'NEGATIVE_REACTION',
      'SLEEP_MODE',
      'MODERATE_NEEDS',
      'PLAYER_INTERACTION',
      'IDLE_AND_PATROL',
    ]);
    expect(BEHAVIOR_PRIORITY_BY_CATEGORY).toEqual({
      CRITICAL_NEEDS: 100,
      NEGATIVE_REACTION: 90,
      SLEEP_MODE: 80,
      MODERATE_NEEDS: 60,
      PLAYER_INTERACTION: 40,
      IDLE_AND_PATROL: 10,
    });
  });
});

describe('寵物狀態列舉（PRD §3.1、§3.2、§8.A.1、§8.B.2）', () => {
  it('GrowthStage', () => {
    expect(GROWTH_STAGES).toEqual(['kitten', 'young', 'adult', 'senior']);
  });

  it('MVP QuirkId 白名單恰 4 款', () => {
    expect(MVP_QUIRK_IDS).toEqual(['cursor_hunter', 'sun_bather', 'treat_lover', 'shy_observer']);
    expectUnique(MVP_QUIRK_IDS);
    expectTypeOf<QuirkId>().toEqualTypeOf<
      'cursor_hunter' | 'sun_bather' | 'treat_lover' | 'shy_observer'
    >();
    expect(QUIRK_MODIFIER_TYPES).toEqual([
      'additiveProbabilityModifier',
      'multiplicativeWeightModifier',
    ]);
  });

  it('RecoveryState 恰 4 種', () => {
    expect(RECOVERY_STATES).toEqual(['NORMAL', 'CRITICAL', 'RECOVERY_BOOST', 'NATURAL_RECOVERY']);
    expectTypeOf<RecoveryState>().toEqualTypeOf<
      'NORMAL' | 'CRITICAL' | 'RECOVERY_BOOST' | 'NATURAL_RECOVERY'
    >();
  });

  it('存檔 schemaVersion 為 2', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(2);
  });
});

describe('GameCommand（PRD §8.B.1 完整 11 種）', () => {
  it('指令類型清單完整', () => {
    expect(GAME_COMMAND_TYPES).toEqual([
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
    ]);
    expect(GAME_COMMAND_TYPES).toHaveLength(11);
    expectUnique(GAME_COMMAND_TYPES);
  });

  it('判別聯集之 type 恰等於常數清單', () => {
    expectTypeOf<GameCommand['type']>().toEqualTypeOf<GameCommandType>();
    expectTypeOf<GameCommand['timestamp']>().toEqualTypeOf<number>();
  });
});

describe('GameEvent', () => {
  it('事件類型涵蓋派工包列出之 14 種', () => {
    expect(GAME_EVENT_TYPES).toEqual([
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
    ]);
    expectUnique(GAME_EVENT_TYPES);
    expectTypeOf<GameEvent['type']>().toEqualTypeOf<GameEventType>();
    expectTypeOf<GameEvent['timestamp']>().toEqualTypeOf<number>();
  });
});

describe('商品目錄列舉（PRD §8.C.2）', () => {
  it('預設 8 款商品 ID', () => {
    expect(BUILT_IN_ITEM_IDS).toEqual([
      'free_basic_kibble',
      'free_fresh_water',
      'shop_chicken_can',
      'shop_salmon_mousse',
      'brand_nu4pet_kitten',
      'brand_ziwi_venison',
      'brand_rc_hairball',
      'shop_freeze_dried',
    ]);
    expectUnique(BUILT_IN_ITEM_IDS);
  });

  it('三區塊列舉', () => {
    expect(FOOD_CATEGORIES).toEqual(['water', 'kibble', 'wet_food', 'treat']);
    expect(PRODUCT_TYPES).toEqual(['regular', 'sponsored', 'free']);
    expect(PRODUCT_DATA_TYPES).toEqual(['real', 'mock']);
    expect(FEED_SOURCE_TYPES).toEqual(['manual', 'partner_api', 'partner_csv']);
    expect(PRODUCT_STATUSES).toEqual(['active', 'pending_review', 'discontinued']);
  });
});
