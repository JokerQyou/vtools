<script lang="ts">
  import {
    ActionIcon,
    Box,
    Container,
    Group,
    Progress,
    Text,
    ThemeIcon,
    Tooltip,
  } from "@svelteuidev/core";
  import {
    IconX,
    IconCurrentLocation,
    IconClearAll,
  } from "@tabler/icons-svelte";
  import HoverButton from "./lib/HoverButton.svelte";
  import { invoke } from "@tauri-apps/api";
  import { listen, TauriEvent, type Event } from "@tauri-apps/api/event";
  import { onDestroy, onMount } from "svelte";
  import {
    baseName,
    invokeTool,
    Tool,
    ToolTitles,
    type FileListItem,
  } from "./tools";
  import VirtualList from "svelte-tiny-virtual-list";
  import { v4 as uuidv4 } from "uuid";
  import ToolIcon from "./lib/ToolIcon.svelte";
  import { fly } from "svelte/transition";

  const HOVER_CLASS = "hover";
  let fileList: FileListItem[] = [];
  let dropping = false;
  let dropPosFetcher: NodeJS.Timer | null = null;
  const clearDropPostFetcher = () => {
    dropPosFetcher && clearInterval(dropPosFetcher);
    dropPosFetcher = null;
  };
  let hoverEl: HTMLElement | null | undefined;
  const clearHoverClass = () => {
    const hs = document.querySelectorAll(`.${HOVER_CLASS}`);
    hs.forEach((h) => h.classList.remove(HOVER_CLASS));
    hoverEl = null;
  };

  const destructors: ((() => any) | Promise<() => any>)[] = [];

  onMount(async () => {
    destructors.push(
      await listen(TauriEvent.WINDOW_FILE_DROP_HOVER, (e) => {
        console.log("DROP_HOVER", e);
        dropPosFetcher = setInterval(async () => {
          const pos: [number, number] = await invoke("mouse_viewport_pos");
          // console.log("POS:", pos);
          let el: HTMLElement | null | undefined = document.elementFromPoint(
            ...pos
          ) as HTMLElement;
          do {
            if (!el) {
              break;
            }
            if (el.isSameNode(document.getRootNode())) {
              clearHoverClass();
              return;
            }
            if (el.isSameNode(hoverEl)) {
              return;
            }
            if (ToolTitles.includes(el.dataset.title as Tool)) {
              break;
            }
            el = el?.parentElement;
          } while (true);
          if (!el) {
            clearHoverClass();
            return;
          }
          if (!dropPosFetcher) {
            clearHoverClass();
            return;
          }
          if (!el.isSameNode(hoverEl)) {
            console.log(el, hoverEl);
            clearHoverClass();
            el.classList.add(HOVER_CLASS);
            hoverEl = el;
            console.log("OVER", hoverEl.dataset.title);
          }
        }, 17);
        dropping = true;
      })
    );
    destructors.push(
      await listen(TauriEvent.WINDOW_FILE_DROP_CANCELLED, (e) => {
        console.log("DROP_CANCEL", e);
        clearDropPostFetcher();
        clearHoverClass();
        dropping = false;
      })
    );
    destructors.push(
      await listen(TauriEvent.WINDOW_FILE_DROP, (e) => {
        clearDropPostFetcher();
        const toolTitle = hoverEl.dataset?.title;
        if (!toolTitle) {
          return;
        }
        console.log("DROP", e);
        clearHoverClass();
        dropping = false;

        const droppedFiles = (e.payload as string[]).map(
          (f) =>
            ({
              name: baseName(f),
              filepath: f,
              uuid: uuidv4(),
              tool: toolTitle as Tool,
              progress: 0,
              error: "",
            } as FileListItem)
        );
        fileList.push(...droppedFiles);
        fileList = fileList;

        invokeTool(toolTitle as Tool, droppedFiles);
      })
    );
    destructors.push(
      await listen("progress", (e: Event<FileListItem>) => {
        console.log(e);
        let updated = false;
        for (let i = 0; i < fileList.length; i++) {
          if (fileList[i].uuid === e.payload.uuid) {
            fileList[i].progress = e.payload.progress;
            updated = true;
            break;
          }
        }
        if (updated) {
          fileList = fileList;
        }
      })
    );
  });
  onDestroy(async () => {
    clearDropPostFetcher();
    clearHoverClass();
    dropping = false;
    for (const destructor of destructors) {
      destructor instanceof Promise ? await destructor : destructor();
    }
  });
</script>

<Container m={30}>
  <Box
    css={{
      position: "fixed",
      top: 30,
      left: 0,
      paddingLeft: 40,
      paddingRight: 40,
      zIndex: 1,
      background: "#f6f6f6",
      paddingBottom: 10,
      width: "calc(100% - 80px)",
      boxShadow: "$sm",
    }}
  >
    <Group grow spacing="md" position="center" noWrap>
      <HoverButton tool={Tool.EncodeTrim} />
      <HoverButton tool={Tool.Flv2Mp4} />
      <HoverButton tool={Tool.ExtractAudio} />
      <HoverButton tool={Tool.BiliHiRes} />
    </Group>
    <Group noWrap spacing="xs" position="right" mt={10}>
      <Tooltip label="Clear finished files" withArrow>
        <ActionIcon
          size="md"
          radius="xs"
          variant="outline"
          disabled={fileList.filter((f) => f.progress === 100).length === 0}
          on:click={() => {
            fileList = fileList.filter((f) => f.progress < 100);
          }}
        >
          <IconClearAll size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  </Box>
  <Box
    css={{
      position: "relative",
      marginTop: 220,
      // scrollMarginTop: 300,
      // background: "$white",
    }}
  >
    <Container mt={30} px={0}>
      <VirtualList
        itemCount={fileList.length}
        height={200}
        itemSize={52}
        scrollOffset={0}
      >
        <svelte:element
          this="div"
          class="row"
          slot="item"
          let:index
          let:style
          {style}
          transition:fly={{ x: 50, duration: 200 }}
        >
          <Box px={10}>
            <Group noWrap spacing="xs">
              <Tooltip label={fileList[index].tool} withArrow>
                <ThemeIcon
                  size="lg"
                  color={fileList[index].error ? "red" : "blue"}
                >
                  <ToolIcon tool={fileList[index].tool} />
                </ThemeIcon>
              </Tooltip>
              <Box
                css={{
                  width: "60%",
                  userSelect: "all",
                }}
              >
                <Text>{fileList[index].name}</Text>
              </Box>
              <Box
                css={{
                  width: "30%",
                }}
              >
                <Group position="apart" noWrap spacing="xs">
                  <Box
                    css={{
                      minWidth: "60%",
                    }}
                  >
                    <Progress
                      tween
                      label={fileList[index].progress < 100
                        ? `${fileList[index].progress}%`
                        : undefined}
                      radius="xs"
                      size="lg"
                      animate={fileList[index].progress < 100}
                      value={fileList[index].progress}
                      color={fileList[index].progress < 100 ? "blue" : "teal"}
                    />
                  </Box>
                  <Tooltip label="Remove" withArrow position="top">
                    <ActionIcon size="md" radius="xs" variant="outline">
                      <IconX size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Revel" withArrow position="top">
                    <ActionIcon
                      size="md"
                      radius="xs"
                      variant="outline"
                      color="indigo"
                      on:click={() => {
                        invoke("reveal_file", {
                          filePath: fileList[index].filepath,
                        }).then(() => {});
                      }}
                    >
                      <IconCurrentLocation size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Box>
            </Group>
          </Box>
        </svelte:element>
      </VirtualList>
    </Container>
  </Box>
</Container>

<style>
  :global(.hover-button-container) {
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  }
  :global(.hover *) {
    background-color: inherit !important;
    color: inherit !important;
  }
  :global(.hover) {
    border-radius: var(--svelteui-radii-sm);
    background-color: var(--svelteui-colors-blue500);
    color: var(--svelteui-colors-gray100);
    transform: scale(1.2);
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
    transition: all 100ms cubic-bezier(0.785, 0.135, 0.15, 0.86);
  }
  :global(.row) {
    padding-top: 10px;
    box-sizing: border-box;
    border-bottom: thin solid var(--svelteui-colors-gray200);
  }
  :global(.row:hover) {
    background-color: var(--svelteui-colors-gray300);
  }
</style>
