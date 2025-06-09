<script>
    import { onMount, onDestroy } from "svelte";

    export let intervalTime = 5000; // 时间间隔 (毫秒)

    // 初始设置一个默认颜色
    let colors = Array(5).fill('#FFFFFF');
    let interval=5000;

    // 生成随机颜色
    const randomColor = () => {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    // 随机更新所有颜色块
    const updateColors = () => {
        colors = colors.map(() => randomColor());
    };

    onMount(() => {
        // 初始化时生成随机颜色
        updateColors();
         setInterval(updateColors, intervalTime);
    });

    onDestroy(() => {
        if (interval) {
            clearInterval(interval);
        }
    });
</script>
  
<style>
    .gradient-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        display: flex;
        width: 100vw;
        height: 5px;
        margin: 0;
        padding: 0;
        z-index: 1000;
    }

    .color-block {
        flex: 1;
        transition: background-color 3s ease;
        margin: 0;
        padding: 0;
    }
</style>
  
<div class="gradient-bar">
    {#each colors as color}
        <div class="color-block" style="background-color: {color};"></div>
    {/each}
</div>
  