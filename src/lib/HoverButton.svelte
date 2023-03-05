<script lang="ts">
  import {
    Box,
    Center,
    Paper,
    Stack,
    ThemeIcon,
    Text,
    Container,
  } from "@svelteuidev/core";
  import type { Tool } from "src/tools";
  import ToolIcon from "./ToolIcon.svelte";

  export let tool: Tool;
</script>

<Box
  css={{
    userSelect: "none",
    cursor: "pointer",
    width: 150,
    // height: 150,
  }}
>
  <svelte:element this="div" data-title={tool} class="hover-button-container">
    <Paper padding={10}>
      <Stack align="stretch" style="height: 110px;">
        <Center>
          <ThemeIcon size="xl">
            <ToolIcon {tool} />
          </ThemeIcon>
        </Center>
        <Text color="gray" size="sm" align="center">{tool}</Text>
      </Stack>
    </Paper>
  </svelte:element>
</Box>

<style>
</style>
