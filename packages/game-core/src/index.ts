/**
 * @shinuan/game-core
 *
 * Phase A 空白骨架：純 TypeScript、平台無關的遊戲核心入口。
 * 子目錄：domain（領域模型）、engine（規則引擎）、ports（Clock / RandomGenerator 等注入介面）。
 * 本任務不實作任何遊戲規則邏輯。
 */
export * from './domain/index';
export * from './engine/index';
export * from './ports/index';

export const GAME_CORE_PACKAGE_NAME = '@shinuan/game-core' as const;
