import type { TranslationKey } from './translations';

// 默认列名映射配置
// key: Excel中的列名
// value: 对应的翻译键名（translations.ts中的键）
export const columnMappings: Record<string, TranslationKey> = {
    'ZT': '机动车：状态',
    'HPZL': '机动车：号牌种类',
    'YWLX': '机动车：业务类型',
    'YWYY': '机动车：业务原因',
    'YTSX': '机动车：用途属性',
    'CLLX': '机动车：车辆类型',
    'CLYT': '机动车：车辆用途',
    'CSYS': '机动车：车身颜色',
    'DYBJ': '机动车：抵押状态',
    'HDFS': '机动车：获得方式',
    'GLBM': '部门：公安、社会化部门',
    'YWBLBZ': '部门：公安、社会化部门',
    'YWBLBM': '部门：公安、社会化部门'
}; 