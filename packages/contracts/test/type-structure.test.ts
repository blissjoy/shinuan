/**
 * SHINUAN-S1-01 關鍵型別結構檢查（Master PRD v2.1.29 §5.2、§8.A.1、§8.B.1、§8.E.1）。
 *
 * 型別層斷言（expectTypeOf、@ts-expect-error）由 `corepack pnpm typecheck`（tsc -p tests）實際驗證；
 * 執行期斷言由 vitest 驗證。
 */
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  SAFE_DEFAULT_APPEARANCE_LAYERS,
  type BehaviorDecision,
  type Clock,
  type DailyLimits,
  type GameCommand,
  type GameRepository,
  type GameState,
  type LegacyGameStateV1,
  type PetAppearance,
  type PetState,
  type PetViewModel,
  type RandomGenerator,
} from '../src/index';

const appearance: PetAppearance = {
  ...SAFE_DEFAULT_APPEARANCE_LAYERS,
  colorParams: { primaryHex: '#E89246', secondaryHex: null, lightnessDelta: 0, saturationDelta: 0 },
};

const pet: PetState = {
  id: 'pet-1',
  name: '小暖',
  microchipId: null,
  ageInDays: 0,
  growthStage: 'adult',
  genetics: {
    seed: 'seed-1',
    prngAlgorithmVersion: 'mulberry32-v1',
    geneticsVersion: '1.0.0',
    rulesVersion: 'v1',
    fatherBreed: 'domestic',
    motherBreed: 'ragdoll',
    fatherPetId: null,
    motherPetId: null,
    appearance,
  },
  basePersonality: { affection: 60, laziness: 50, tsundere: 50, curiosity: 80 },
  quirks: ['sun_bather'],
  memories: { totalPets: 0, totalPlays: 0, foodCategoryCounts: {}, dailyBuckets: {} },
  needs: { hunger: 80, hydration: 80, mood: 80 },
  health: 100,
  recoveryState: 'NORMAL',
  recoveryBoostAccumulatedHours: 0,
  lowMoodDuration: { below40Hours: 0, below20Hours: 0 },
  isCarePaused: false,
  coins: 200,
  inventory: {},
  lastSimulatedAt: 0,
};

const dailyLimits: DailyLimits = {
  localDate: '2026-11-25',
  lastClaimedLocalDate: null,
  lastClaimedTimestamp: null,
  lastActiveLocalDate: '2026-11-25',
  claimedRewardIds: [],
  exploredProductIds: [],
  shopOpenedToday: false,
  explorationCoinsEarned: 0,
  interactionCoinsEarned: 0,
  dailyHighHealthRewardClaimed: false,
};

describe('PetViewModel（PRD §5.2）', () => {
  it('behavior 不含 interruptible 與 cooldownMs', () => {
    type BehaviorKeys = keyof PetViewModel['behavior'];
    expectTypeOf<BehaviorKeys>().toEqualTypeOf<
      'animationId' | 'tailState' | 'iconIds' | 'soundId' | 'durationMs'
    >();
    expectTypeOf<'interruptible' extends BehaviorKeys ? true : false>().toEqualTypeOf<false>();
    expectTypeOf<'cooldownMs' extends BehaviorKeys ? true : false>().toEqualTypeOf<false>();

    const vm: PetViewModel = {
      petId: pet.id,
      name: pet.name,
      microchipId: pet.microchipId,
      appearance,
      needs: { ...pet.needs, health: pet.health },
      behavior: {
        animationId: 'sleep',
        tailState: 'curled_sleep',
        iconIds: ['sleep_zzz'],
        soundId: null,
        durationMs: 4000,
        // @ts-expect-error interruptible 僅供 Game Core 內部仲裁，不得出現在 PetViewModel
        interruptible: true,
      },
      display: {
        isSleeping: true,
        isHealthCritical: false,
        recoveryState: 'NORMAL',
        isCarePaused: false,
      },
      updatedAt: 0,
    };
    expect(Object.keys(vm).sort()).toEqual(
      ['appearance', 'behavior', 'display', 'microchipId', 'name', 'needs', 'petId', 'updatedAt'].sort(),
    );
  });

  it('頂層與 needs / display 欄位完整', () => {
    expectTypeOf<keyof PetViewModel>().toEqualTypeOf<
      'petId' | 'name' | 'microchipId' | 'appearance' | 'needs' | 'behavior' | 'display' | 'updatedAt'
    >();
    expectTypeOf<keyof PetViewModel['needs']>().toEqualTypeOf<
      'hunger' | 'hydration' | 'mood' | 'health'
    >();
    expectTypeOf<keyof PetViewModel['display']>().toEqualTypeOf<
      'isSleeping' | 'isHealthCritical' | 'recoveryState' | 'isCarePaused'
    >();
  });
});

describe('BehaviorDecision（PRD §0、§8.B.1）', () => {
  it('包含 interruptible 與 cooldownMs', () => {
    expectTypeOf<keyof BehaviorDecision>().toEqualTypeOf<
      | 'animationId'
      | 'tailState'
      | 'iconIds'
      | 'soundId'
      | 'durationMs'
      | 'interruptible'
      | 'cooldownMs'
    >();
  });
});

describe('PetState（PRD §8.A.1）', () => {
  it('欄位完整', () => {
    expectTypeOf<keyof PetState>().toEqualTypeOf<
      | 'id'
      | 'name'
      | 'microchipId'
      | 'ageInDays'
      | 'growthStage'
      | 'genetics'
      | 'basePersonality'
      | 'quirks'
      | 'memories'
      | 'needs'
      | 'health'
      | 'recoveryState'
      | 'recoveryBoostAccumulatedHours'
      | 'lowMoodDuration'
      | 'isCarePaused'
      | 'coins'
      | 'inventory'
      | 'lastSimulatedAt'
    >();
    expect(pet.coins).toBe(200);
  });
});

describe('GameState v2 與 LegacyGameStateV1 區別（PRD §8.E.1）', () => {
  it('schemaVersion 字面型別不同且互不相容', () => {
    expectTypeOf<GameState['schemaVersion']>().toEqualTypeOf<2>();
    expectTypeOf<LegacyGameStateV1['schemaVersion']>().toEqualTypeOf<1>();
    expectTypeOf<LegacyGameStateV1>().not.toMatchTypeOf<GameState>();
    expectTypeOf<GameState>().not.toMatchTypeOf<LegacyGameStateV1>();
  });

  it('v2 存檔必須包含所有 v2 新增欄位', () => {
    const state: GameState = { schemaVersion: 2, gameCoreVersion: '0.0.0', pet, dailyLimits };
    expect(state.schemaVersion).toBe(2);

    const { microchipId: _omitted, ...petWithoutChip } = pet;
    // @ts-expect-error v2 PetState 缺少 microchipId 不合法
    const invalid: GameState = { schemaVersion: 2, gameCoreVersion: '0.0.0', pet: petWithoutChip, dailyLimits };
    expect(invalid.schemaVersion).toBe(2);
  });

  it('v1 存檔允許缺少 v2 新增欄位', () => {
    const {
      microchipId: _m,
      recoveryBoostAccumulatedHours: _r,
      lowMoodDuration: _l,
      isCarePaused: _c,
      genetics,
      ...petV1Rest
    } = pet;
    const { fatherPetId: _f, motherPetId: _mo, ...geneticsV1 } = genetics;
    const legacy: LegacyGameStateV1 = {
      schemaVersion: 1,
      gameCoreVersion: '0.0.0',
      pet: { ...petV1Rest, genetics: geneticsV1 },
      dailyLimits,
    };
    expect(legacy.schemaVersion).toBe(1);
    expect('microchipId' in legacy.pet).toBe(false);
    expect('fatherPetId' in legacy.pet.genetics).toBe(false);
  });
});

describe('GameCommand 判別聯集（PRD §8.B.1）', () => {
  it('各指令 payload 結構', () => {
    const commands: GameCommand[] = [
      { type: 'FeedPet', timestamp: 1, itemId: 'free_basic_kibble' },
      { type: 'DrinkWater', timestamp: 1 },
      { type: 'DrinkWater', timestamp: 1, itemId: 'free_fresh_water' },
      { type: 'PetCat', timestamp: 1 },
      { type: 'PlayWithPet', timestamp: 1 },
      { type: 'PokePet', timestamp: 1 },
      { type: 'TriggerLanding', timestamp: 1, dropHeightRatio: 0.3 },
      { type: 'ToggleCarePause', timestamp: 1, enabled: true },
      { type: 'ClaimDailyCheckIn', timestamp: 1 },
      { type: 'OpenShop', timestamp: 1 },
      { type: 'InspectProduct', timestamp: 1, itemId: 'shop_chicken_can', dwellMs: 3000 },
      { type: 'BuyItem', timestamp: 1, itemId: 'shop_chicken_can' },
      { type: 'BuyItem', timestamp: 1, itemId: 'shop_chicken_can', quantity: 2 },
    ];
    expect(new Set(commands.map((c) => c.type)).size).toBe(11);

    // @ts-expect-error FeedPet 必須提供 itemId
    const missingItem: GameCommand = { type: 'FeedPet', timestamp: 1 };
    expect(missingItem.type).toBe('FeedPet');
  });
});

describe('外部注入介面（PRD §0、§5.1）', () => {
  it('Clock / RandomGenerator / GameRepository 結構', async () => {
    const clock: Clock = { now: () => 1000, getTimezoneOffsetMinutes: () => -480 };
    const rng: RandomGenerator = { next: () => 0.5 };
    let stored: GameState | null = null;
    const repo: GameRepository = {
      load: async () => stored,
      save: async (state) => {
        stored = state;
      },
    };
    expect(clock.now()).toBe(1000);
    expect(clock.getTimezoneOffsetMinutes()).toBe(-480);
    expect(rng.next()).toBeGreaterThanOrEqual(0);
    expect(rng.next()).toBeLessThan(1);
    await repo.save({ schemaVersion: 2, gameCoreVersion: '0.0.0', pet, dailyLimits });
    expect((await repo.load())?.schemaVersion).toBe(2);
    expectTypeOf<GameRepository['load']>().returns.toEqualTypeOf<Promise<GameState | null>>();
  });
});
