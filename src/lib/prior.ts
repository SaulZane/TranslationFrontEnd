import type { TranslationKey } from './translations';

// 默认列名映射配置
// key: Excel中的列名
// value: 对应的翻译键名（translations.ts中的键）
export const columnMappings: Record<string, TranslationKey> = {
    'ZT': '机动车：状态',
    'HPZL': '机动车：号牌种类',
    'YWLX': '机动车：业务类型',
    'YWYY': '机动车：业务原因',
}; 