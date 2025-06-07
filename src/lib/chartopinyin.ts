import pinyin from 'pinyin';
import { translationMaps } from './translations';

/**
 * 将汉字转换为拼音首字母
 * @param text 输入的汉字文本
 * @returns 拼音首字母字符串（大写）
 */
function getFirstLetters(text: string): string {
  try {
    // 使用pinyin库将汉字转换为拼音数组
    const pinyinArray = pinyin(text, {
      style: pinyin.STYLE_FIRST_LETTER, // 只获取首字母
      heteronym: false // 不返回多音字的所有读音
    });

    // 将二维数组扁平化并转换为大写字母
    const result = pinyinArray.map(item => item[0]).join('').toUpperCase();

    return result;
  } catch (error) {
    console.error('拼音转换错误:', error);
    return '';
  }
}

/**
 * 创建翻译键名到拼音首字母的映射
 */
function createPinyinMapping(): Record<string, string> {
  const pinyinMapping: Record<string, string> = {};
  
  // 获取translations.ts中的所有一级key
  const translationKeys = Object.keys(translationMaps);
  
  translationKeys.forEach(key => {
    // 为每个翻译键创建拼音首字母映射
    const firstLetters = getFirstLetters(key);
    if (firstLetters) {
      pinyinMapping[key] = firstLetters;
    }
  });
  
  return pinyinMapping;
}

/**
 * 根据拼音首字母搜索翻译键名
 * @param searchText 搜索文本（可以是汉字或拼音首字母）
 * @returns 匹配的翻译键名数组
 */
export function searchByPinyin(searchText: string): string[] {
  if (!searchText) return Object.keys(translationMaps);

  const upperSearchText = searchText.toUpperCase();
  const pinyinMapping = createPinyinMapping();
  const translationKeys = Object.keys(translationMaps);

  return translationKeys.filter(key => {
    // 1. 检查汉字直接匹配（原有功能）
    const chineseMatch = key.toLowerCase().includes(searchText.toLowerCase());

    // 2. 检查拼音首字母匹配（新功能）
    const pinyinFirstLetters = pinyinMapping[key];
    const pinyinMatch = pinyinFirstLetters && pinyinFirstLetters.includes(upperSearchText);

    return chineseMatch || pinyinMatch;
  });
}