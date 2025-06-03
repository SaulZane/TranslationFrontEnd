<script lang="ts">
  import { Button, Alert, Label, Dropdown, DropdownItem, Input, Card, Select, Search } from 'flowbite-svelte';
  import * as ExcelJS from 'exceljs';
  import { translationMaps, type TranslationKey } from '$lib/translations';
  import { columnMappings } from '$lib/prior';
  
  type SheetData = {
    name: string;
    headers: string[];
    selectedMaps: Record<number, TranslationKey | null>;
    data: any[][];
  };

  let excelFile: File | null = null;
  let sheets: SheetData[] = [];
  let isAutoMatched = false;

  let searchTexts: Record<string, string> = {};
  let errorMessage: string | null = null;
  
  function getFilteredTranslationKeys(searchText: string): string[] {
    if (!searchText) return Object.keys(translationMaps);
    const lowerSearchText = searchText.toLowerCase();
    return Object.keys(translationMaps).filter(key => 
      key.toLowerCase().includes(lowerSearchText)
    );
  }

  async function handleFileUpload(event: Event) {
    try {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      
      excelFile = file;
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      sheets = workbook.worksheets.map(worksheet => {
        const headers: string[] = [];
        const data: any[][] = [];
        
        // 获取表头
        worksheet.getRow(1).eachCell((cell, colNumber) => {
          headers[colNumber - 1] = cell.text;
        });
        
        // 获取数据
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // 跳过表头
          const rowData: any[] = [];
          row.eachCell((cell, colNumber) => {
            rowData[colNumber - 1] = cell.value;
          });
          data.push(rowData);
        });

        return {
          name: worksheet.name,
          headers,
          selectedMaps: {},
          data: [headers, ...data]
        };
      });
      
      errorMessage = null;
    } catch (error) {
      console.error('Error:', error);
      errorMessage = error instanceof Error ? error.message : '处理文件时发生错误';
      sheets = [];
    }
  }

  function toggleAutoMatch() {
    if (!isAutoMatched) {
      // 应用自动匹配
      sheets = sheets.map(sheet => {
        const newSelectedMaps = { ...sheet.selectedMaps };
        sheet.headers.forEach((header, index) => {
          if (header in columnMappings) {
            newSelectedMaps[index] = columnMappings[header];
          }
        });
        return { ...sheet, selectedMaps: newSelectedMaps };
      });
    } else {
      // 还原初始状态
      sheets = sheets.map(sheet => ({
        ...sheet,
        selectedMaps: {}
      }));
    }
    isAutoMatched = !isAutoMatched;
  }

  function handleTranslationSelect(sheetIndex: number, columnIndex: number, mapKey: TranslationKey) {
    sheets[sheetIndex].selectedMaps[columnIndex] = mapKey;
    sheets = [...sheets]; // 触发更新
  }

  // 检查是否有未完成选择的翻译字段
  function hasUnselectedTranslations(): boolean {
    return sheets.some(sheet => 
      Object.values(sheet.selectedMaps).some(mapKey => mapKey === null)
    );
  }

  async function handleTranslate() {
    if (!excelFile || hasUnselectedTranslations()) return;

    try {
      // 读取原始工作簿
      const arrayBuffer = await excelFile.arrayBuffer();
      const originalWorkbook = new ExcelJS.Workbook();
      await originalWorkbook.xlsx.load(arrayBuffer);
      
      // 创建新的工作簿
      const newWorkbook = new ExcelJS.Workbook();
      newWorkbook.creator = 'ExcelJS';
      newWorkbook.created = new Date();
      newWorkbook.modified = new Date();

      // 需要在翻译值之间添加顿号的键名列表
      const needCommaKeys = ['机动车：状态', '驾驶证：状态', '机动车：车身颜色'];

      sheets.forEach((sheetData, sheetIndex) => {
        const originalSheet = originalWorkbook.worksheets[sheetIndex];
        const newSheet = newWorkbook.addWorksheet(sheetData.name);
        
        // 复制列宽
        originalSheet.columns.forEach((col, index) => {
          if (col.width) {
            newSheet.getColumn(index + 1).width = col.width;
          }
        });

        // 查找业务类型和业务原因的列索引
        let vehicleTypeColIndex: number | null = null;
        let vehicleReasonColIndex: number | null = null;
        let driverTypeColIndex: number | null = null;
        let driverReasonColIndex: number | null = null;

        Object.entries(sheetData.selectedMaps).forEach(([colIndex, mapKey]) => {
          if (mapKey === '机动车：业务类型') vehicleTypeColIndex = Number(colIndex) + 1;
          if (mapKey === '机动车：业务原因') vehicleReasonColIndex = Number(colIndex) + 1;
          if (mapKey === '驾驶员：业务类型') driverTypeColIndex = Number(colIndex) + 1;
          if (mapKey === '驾驶员：业务原因') driverReasonColIndex = Number(colIndex) + 1;
        });

        // 处理每一行数据
        originalSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) { // 跳过表头行
            // 仍然需要复制表头行本身到新表
            const newRow = newSheet.getRow(rowNumber);
            row.eachCell((cell, colNumber) => {
              const newCell = newRow.getCell(colNumber);
              newCell.value = cell.value;
              if (cell.style) {
                newCell.style = cell.style;
              }
            });
            if (row.height) {
                newRow.height = row.height;
            }
            return; 
          }

          const newRow = newSheet.getRow(rowNumber);
          
          // 复制单元格格式和样式
          row.eachCell((cell, colNumber) => {
            const newCell = newRow.getCell(colNumber);
            
            // 复制样式
            if (cell.style) {
              newCell.style = cell.style;
            }

            const mapKey = sheetData.selectedMaps[colNumber - 1];
            let value = cell.value;

            if (mapKey && translationMaps[mapKey]) {
              // 处理日期类型
              if (value instanceof Date) {
                newCell.value = value;
                return;
              }

              // 处理业务原因的特殊翻译逻辑
              if ((mapKey === '机动车：业务原因' && vehicleTypeColIndex !== null) || 
                  (mapKey === '驾驶员：业务原因' && driverTypeColIndex !== null)) {
                const typeCell = row.getCell(mapKey === '机动车：业务原因' ? vehicleTypeColIndex! : driverTypeColIndex!);
                const typeValue = typeCell.text; // 获取业务类型的值，例如 'D'
                
                const reasonMap = translationMaps[mapKey]; // 获取 '机动车：业务原因' 或 '驾驶员：业务原因' 的整个映射
                
                // 检查是否存在对应的业务类型映射，并且当前单元格的值是字符串
                if (reasonMap && typeof reasonMap === 'object' && typeValue in reasonMap && typeof value === 'string' && value.length > 0) {
                  const reasonTranslationMap = (reasonMap as any)[typeValue]; // 获取特定业务类型下的原因映射，例如 {'F': '变更(发动机)', 'D': '变更(车身颜色)'}

                  if (reasonTranslationMap && typeof reasonTranslationMap === 'object') {
                    // 将原因代码字符串（例如 'DF'）拆分为单个字符数组 ['D', 'F']
                    const translatedParts = value.split('').map(reasonCharCode => {
                      // 查找每个字符代码的翻译，如果找不到则使用原字符
                      return (reasonTranslationMap as Record<string, string>)[reasonCharCode] || reasonCharCode;
                    });
                    // 使用顿号连接翻译后的部分
                    value = translatedParts.join('、');
                  } 
                  // 如果 reasonTranslationMap 不存在或不是对象，value 保持不变
                }
                 // 如果不满足上述条件（例如 typeValue 不在 reasonMap 中，或 value 不是字符串），value 保持不变

              } else if (mapKey === '机动车：相关资料' && typeof value === 'string') {
                const translationSubMap = translationMaps[mapKey];
                // Ensure translationSubMap is the specific map for '机动车: 相关资料'
                if (typeof translationSubMap === 'object' && 
                    !Array.isArray(translationSubMap) && 
                    translationMaps['机动车：相关资料'] === translationSubMap) {
                    const parts = value.split(',');
                    const translatedParts = parts.map(part => {
                        const trimmedPart = part.trim();
                        const keyToLookup = String(trimmedPart); // Ensure string key for lookup
                        return (translationSubMap as Record<string, string>)[keyToLookup] || keyToLookup;
                    });
                    value = translatedParts.join(',');
                }
                // If it's not the specific map or value is not a string, value remains unchanged.
              } else {
                // 处理其他普通翻译和需要加顿号的状态字段
                const translation = translationMaps[mapKey];
                
                // 处理需要添加顿号的状态字段（保持原有逻辑）
                if (needCommaKeys.includes(mapKey) && typeof value === 'string') {
                  const translatedParts = value.split('').map(char => 
                    (translation as Record<string, string>)[char] || char
                  );
                  value = translatedParts.join('、');
                } else if (typeof translation === 'object' && !Array.isArray(translation)) {
                   // 处理标准的键值对翻译
                  value = (translation as Record<string, string>)[value as string] || value;
                }
                 // 如果 translation 不是对象，value 保持不变
              }
            }
            
            newCell.value = value;
          });

          // 设置行高
          if (row.height) {
            newRow.height = row.height;
          }
        });

        // 复制合并单元格
        const merges = originalSheet.mergeCells;
        if (merges) {
          Object.keys(merges).forEach(mergeRange => {
            newSheet.mergeCells(mergeRange);
          });
        }
      });

      // 导出新的Excel文件
      const outputBuffer = await newWorkbook.xlsx.writeBuffer();
      const blob = new Blob([outputBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '翻译后的_' + excelFile.name;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error during translation:', error);
      errorMessage = error instanceof Error ? error.message : '转换过程中发生错误';
    }
  }

  let dropdownOpen: Record<string, boolean> = {};
</script>

<main class="container mx-auto p-4 max-w-[1400px]">
  <div class="flex items-center justify-center gap-4 mb-8">
    <div class="w-[600px]">
      <div class="flex items-center justify-center">
        <input
          type="file"
          id="excel-upload"
          accept=".xlsx,.xls"
          on:change={handleFileUpload}
          style="display: none;"
        />
        <div class="flex items-center gap-3">
          <Button
            color="blue"
            size="md"
            on:click={() => document.getElementById('excel-upload')?.click()}
          >
            选择文件
          </Button>
          {#if excelFile}
            <span class="text-gray-600">{excelFile.name}</span>
          {/if}
          <a href="/search" class="text-blue-600 hover:underline self-center ml-2">快速索引</a>
        </div>
      </div>
    </div>
    {#if sheets.length > 0}
      <Button
        color={isAutoMatched ? "red" : "green"}
        size="xl"
        on:click={toggleAutoMatch}
      >
        {isAutoMatched ? "还原初始" : "自动匹配"}
      </Button>
      <Button
        color="green"
        size="xl"
        disabled={hasUnselectedTranslations()}
        on:click={handleTranslate}
      >
        开始转换
      </Button>
    {/if}
  </div>

  {#if errorMessage}
    <Alert color="red" class="mb-4">
      <span class="font-medium">错误：</span> {errorMessage}
    </Alert>
  {/if}

  {#if sheets.length > 0}
    <div class="space-y-6">
      {#each sheets as sheet, sheetIndex}
        <Alert class="w-full" color="default">
          <div class="p-4">
            <h3 class="text-xl font-bold mb-6 text-center">{sheet.name}</h3>
            
            <div class="space-y-4">
              <div class="flex flex-wrap gap-8 justify-center">
                {#each sheet.headers as header, columnIndex}
                  <div class="border rounded min-w-[200px] max-w-[200px] bg-gray-50 relative mb-6">
                    <div class="p-3">
                      <div class="space-y-2">
                        <span class="block text-sm font-medium text-gray-700 text-center truncate" title={header}>{header}</span>
                        <Button
                          color={sheet.selectedMaps[columnIndex] !== undefined ? "red" : "primary"}
                          size="xs"
                          class="w-full"
                          on:click={() => {
                            if (sheet.selectedMaps[columnIndex] !== undefined) {
                              delete sheet.selectedMaps[columnIndex];
                              sheets = [...sheets];
                            } else {
                              sheet.selectedMaps[columnIndex] = null;
                              sheets = [...sheets];
                            }
                          }}
                        >
                          {sheet.selectedMaps[columnIndex] !== undefined ? "撤销" : "翻译"}
                        </Button>
                      </div>
                    </div>
                    
                    {#if sheet.selectedMaps[columnIndex] !== undefined}
                      <div class="absolute left-0 right-0 top-full z-10 pt-2">
                        <div class="bg-white border rounded shadow-lg">
                          {#if sheet.selectedMaps[columnIndex]}
                            <Button
                              class="w-full text-left truncate p-2"
                              color="light"
                              size="xs"
                              on:click={() => {
                                sheet.selectedMaps[columnIndex] = null;
                                sheets = [...sheets];
                              }}
                            >
                              {sheet.selectedMaps[columnIndex]}
                            </Button>
                          {:else}
                            <div class="p-2">
                              <Search
                                size="sm"
                                placeholder="搜索对应项..."
                                bind:value={searchTexts[`${sheetIndex}-${columnIndex}`]}
                              />
                            </div>
                            <div class="max-h-[200px] overflow-y-auto">
                              {#each getFilteredTranslationKeys(searchTexts[`${sheetIndex}-${columnIndex}`] || '') as mapKey}
                                <button
                                  class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                  on:click={() => {
                                    handleTranslationSelect(sheetIndex, columnIndex, mapKey as TranslationKey);
                                    searchTexts[`${sheetIndex}-${columnIndex}`] = '';
                                  }}
                                >
                                  {mapKey}
                                </button>
                              {/each}
                            </div>
                          {/if}
                        </div>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </Alert>
      {/each}
    </div>
  {/if}
</main>