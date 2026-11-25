/**
 * @shinuan/contracts
 *
 * 跨模組共用型別與資料契約入口（Master PRD v2.1.29）。
 * 本套件零外部依賴，只含型別與 PRD 原文列舉／白名單常數，不含任何遊戲規則計算邏輯。
 */
export const CONTRACTS_PACKAGE_NAME = '@shinuan/contracts' as const;

export * from './genetics';
export * from './catalog';
export * from './pet';
export * from './behavior';
export * from './commands';
export * from './events';
export * from './save';
export * from './ports';
export * from './view-model';
export * from './config';
