<script lang="ts">
  import { Box } from "@svelteuidev/core";
  import {
    IconBrandBilibili,
    IconMovie,
    IconMusic,
    IconSlice,
  } from "@tabler/icons-svelte";
  import { Tool } from "../tools";

  export let tool: Tool;
  export let size: number = 20;
</script>

{#if tool === Tool.EncodeTrim}
  <IconSlice {size} />
{:else if tool === Tool.Flv2Mp4}
  <IconMovie {size} />
{:else if tool === Tool.ExtractAudio}
  <IconMusic {size} />
{:else if tool === Tool.BiliHiRes}
  <IconBrandBilibili {size} />
{/if}
