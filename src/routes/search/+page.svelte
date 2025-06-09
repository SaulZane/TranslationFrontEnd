<script lang="ts">
  import { translationMaps } from '$lib/translations';
  import { ChevronUpOutline, ChevronDownOutline } from 'flowbite-svelte-icons'; // 导入图标
  import {  Input, Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell ,Footer, FooterCopyright, FooterLinkGroup, FooterLink } from 'flowbite-svelte';
  let searchKey: string = '';
  let searchResults: { type: string; key: string; value: string }[] = [];
  let sortColumn: 'type' | 'key' | 'value' | null = null; // 当前排序列
  let sortDirection: 'asc' | 'desc' | null = null; // 当前排序方向

  // Helper function to escape special regex characters
  function escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  // Updated helper function for SQL-like pattern matching (%, _), case-insensitive
  function matchesPattern(dataString: string, pattern: string): boolean {
    const upperPattern = pattern.toUpperCase(); // Use uppercase pattern for logic checks

    if (!upperPattern.includes('%') && !upperPattern.includes('_')) {
      // No wildcards: perform exact case-insensitive match
      return dataString.toUpperCase() === upperPattern;
    } else {
      // Has wildcards: convert LIKE pattern to regex
      try {
          let regexString = '^';
          for (let i = 0; i < upperPattern.length; i++) {
              const char = upperPattern[i];
              if (char === '%') {
                  regexString += '.*'; // Match zero or more characters
              } else if (char === '_') {
                  regexString += '.';  // Match any single character
              } else {
                  regexString += escapeRegex(char); // Escape literal characters
              }
          }
          regexString += '$';
          
          const regex = new RegExp(regexString, 'i'); // Case-insensitive
          return regex.test(dataString);
      } catch (e) {
          console.error("Error creating regex from pattern:", pattern, e);
          // Fallback to simple contains match if regex fails (less accurate)
          return dataString.toUpperCase().includes(upperPattern.replace(/[%_]/g, '')); 
      }
    }
  }

  function handleSearch() {
    // --- 重置排序状态 ---
    sortColumn = null;
    sortDirection = null;
    // --- 重置结束 ---

    searchResults = []; // 清空之前的搜索结果
    if (!searchKey.trim()) return;

    // Prepare the search pattern (keep original case for potential future use, matching is case-insensitive)
    const searchPattern = searchKey.trim(); 

    for (const typeKey in translationMaps) {
      const valueMap = translationMaps[typeKey as keyof typeof translationMaps];
      const typeMatches = matchesPattern(typeKey, searchPattern); // Use helper function

      if (typeof valueMap === 'object' && valueMap !== null) {
        for (const firstLevelKey in valueMap) {
          const firstLevelValue = (valueMap as any)[firstLevelKey];
          const key1Matches = matchesPattern(firstLevelKey, searchPattern); // Use helper function

          if (typeof firstLevelValue !== 'object' || firstLevelValue === null) {
            // --- 处理非对象的一级条目 ---
            const valueString = String(firstLevelValue);
            const value1Matches = matchesPattern(valueString, searchPattern); // Use helper function

            // 如果类型、键或值任一匹配，则添加结果
            if (typeMatches || key1Matches || value1Matches) {
                searchResults.push({ type: typeKey, key: firstLevelKey, value: valueString });
            }
          } else {
            // --- 处理对象类型的一级条目（有下级） ---
            
            // 如果类型或该一级键直接匹配，添加占位符
            if (typeMatches || key1Matches) {
                  searchResults.push({ type: typeKey, key: firstLevelKey, value: '***有多个数据，无法显示***' });
            }

            // --- 处理该对象内的二级条目 ---
            for (const secondLevelKey in firstLevelValue) {
              const secondLevelValue = (firstLevelValue as any)[secondLevelKey];
              const valueString = String(secondLevelValue); // 二级值通常是字符串
              const key2Matches = matchesPattern(secondLevelKey, searchPattern); // Use helper function
              const value2Matches = matchesPattern(valueString, searchPattern); // Use helper function

              // 如果类型匹配，或者二级键匹配，或者二级值匹配，则添加二级条目结果
              // (注意：如果父级对象已因类型/键匹配而添加，这里会重复添加子项，去重逻辑会处理)
              if (typeMatches || key2Matches || value2Matches) {
                  const resultType = `${typeKey} (${firstLevelKey})`; // 在类型中包含一级键以提供上下文
                  searchResults.push({ type: resultType, key: secondLevelKey, value: valueString });
              }
            }
          }
        }
      }
    }
    
    // 去重逻辑保持不变
    const uniqueResults = [];
    const seen = new Set();
    for (const result of searchResults) {
        const uniqueId = `${result.type}-${result.key}-${result.value}`;
        if (!seen.has(uniqueId)) {
            uniqueResults.push(result);
            seen.add(uniqueId);
        }
    }
    searchResults = uniqueResults;
  }

  // --- 新增：处理排序点击事件 ---
  function handleSort(column: 'type' | 'key' | 'value') {
    if (sortColumn === column) {
      // 点击同一列：切换排序方向 或 取消排序
      if (sortDirection === 'asc') {
        sortDirection = 'desc';
      } else if (sortDirection === 'desc') {
        sortColumn = null;
        sortDirection = null;
      }
    } else {
      // 点击新列：按升序排序
      sortColumn = column;
      sortDirection = 'asc';
    }
  }

  // --- 新增：计算排序后的结果 ---
  $: sortedResults = (() => {
    if (!sortColumn || !sortDirection) {
      return [...searchResults]; // 返回原始顺序副本
    }

    return [...searchResults].sort((a, b) => {
      // 使用非空断言操作符 (!)，因为在此代码路径中，外部的 if 条件已确保 sortColumn 不为 null
      const valA = a[sortColumn!];
      const valB = b[sortColumn!];

      // 基本字符串比较 (忽略大小写)
      const comparison = String(valA).localeCompare(String(valB), undefined, { sensitivity: 'base' });

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  })(); // 使用立即执行的函数表达式 (IIFE)

</script>

<main class="container mx-auto p-4 flex flex-col items-center">
  
  <h1 class="text-2xl font-bold mb-6">快速索引查询</h1>

  <div class="flex items-center space-x-2 mb-6 w-full max-w-md">
    <Input type="text" placeholder="输入类型、键或值进行查询（可使用%或_）" bind:value={searchKey} class="flex-grow w-full max-w-md" on:keydown={(e) => e.key === 'Enter' && handleSearch()}/>
    <Button on:click={handleSearch} class="px-4 min-w-[80px]">查询</Button>
  </div>

  {#if searchResults.length > 0}
    <div class="w-full max-w-4xl">
      <Table hoverable={true}>
        <TableHead>
          <!-- 修改表头单元格，添加点击事件和排序指示符 -->
          <TableHeadCell class="text-center cursor-pointer select-none" on:click={() => handleSort('type')}>
            类型（TYPE）
            {#if sortColumn === 'type'}
              {#if sortDirection === 'asc'} <ChevronUpOutline class="inline-block w-4 h-4"/> {:else} <ChevronDownOutline class="inline-block w-4 h-4"/> {/if}
            {/if}
          </TableHeadCell>
          <TableHeadCell class="text-center cursor-pointer select-none" on:click={() => handleSort('key')}>
            键（KEY）
            {#if sortColumn === 'key'}
              {#if sortDirection === 'asc'} <ChevronUpOutline class="inline-block w-4 h-4"/> {:else} <ChevronDownOutline class="inline-block w-4 h-4"/> {/if}
            {/if}
          </TableHeadCell>
          <TableHeadCell class="text-center cursor-pointer select-none" on:click={() => handleSort('value')}>
            值（VALUE）
            {#if sortColumn === 'value'}
              {#if sortDirection === 'asc'} <ChevronUpOutline class="inline-block w-4 h-4"/> {:else} <ChevronDownOutline class="inline-block w-4 h-4"/> {/if}
            {/if}
          </TableHeadCell>
        </TableHead>
        <TableBody class="divide-y">
          <!-- 修改循环，遍历 sortedResults -->
          {#each sortedResults as result (result.type + result.key + result.value)}
            <TableBodyRow>
              <TableBodyCell class="text-center">{result.type}</TableBodyCell>
              <TableBodyCell class="text-center">{result.key}</TableBodyCell>
              <TableBodyCell class="text-center">{result.value}</TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    </div>
  {:else if searchKey.trim() !== '' && searchResults.length === 0}
     <p class="text-gray-500 mt-4">未找到匹配的结果。</p>
  {/if}


</main> 


<Footer class="fixed bottom-0 left-0 right-0 z-20 w-full bg-white border-t border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-600">
  <div class="w-full mx-auto max-w-screen-xl p-4 md:flex md:items-center md:justify-between">
    <!-- 左侧版权信息 -->
    <div class="text-left">
      <small class="text-gray-500 dark:text-gray-400">
        &copy;2025 | 如遇故障请联系 3079 | 该网站原作者<b>保留所有权利</b>
        <br />
        <small>编码技术栈 前端：SvelteKit + flowbite-svelte  | 代码辅助：Cursor + AugmentCode </small>
      </small>
    </div>

    <!-- 右侧导航链接 -->
    <div class="mt-3 md:mt-0">
      <FooterLinkGroup class="flex flex-wrap items-center justify-center md:justify-end text-sm text-gray-500 dark:text-gray-400">
        <FooterLink href="/">主页</FooterLink>
        <FooterLink href="/search">索引</FooterLink>
      </FooterLinkGroup>
    </div>
  </div>
</Footer>