import {
  ActionIcon, Avatar, Box, Center, Container,
  Group, Loader, Menu, Paper, Stack, Text, ThemeIcon, Tooltip,
} from "@mantine/core"
import { useListState } from "@mantine/hooks"
import { showNotification } from "@mantine/notifications"
import { IconCheck, IconDots, IconMovie, IconPlaylistX, IconSearch } from "@tabler/icons"
import { invoke } from "@tauri-apps/api"
import { sep } from "@tauri-apps/api/path"
import { listen } from "@tauri-apps/api/event"
import { CSSProperties, useEffect, useState } from "react"

const baseName = (f: string) => {
  const fp = f.split(sep)
  return fp[fp.length - 1]
}
const extension = (f: string) => {
  if (!f.includes('.')) { return '' }
  const fp = f.split('.')
  return fp[fp.length - 1].toLowerCase()
}

type FileListItemProps = {
  filepath: string
  style?: CSSProperties
  status: Status
}
const FileListItem = ({ filepath, style, status }: FileListItemProps) => {
  return (
    <Paper p='xs' withBorder style={style}>
      <Group spacing='xs'>
        <Avatar color='blue'>
          <IconMovie />
        </Avatar>
        <Text size='sm' sx={theme => ({
          userSelect: 'all',
        })}>{baseName(filepath)}</Text>
        {/* <Code>{baseName(f)}</Code> */}
        <Group sx={theme => ({
          flex: 1,
          justifyContent: 'flex-end',
        })}>
          {status === Status.Processing && (
            <Loader size={20} />
          )}
          {status === Status.Finished && (
            <ThemeIcon size={20} radius='xl' color='teal'>
              <IconCheck />
            </ThemeIcon>
          )}
          <Tooltip label='在文件管理器中查看'>
            <ActionIcon>
              <IconSearch size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Paper>
  )
}
const enum Status {
  Processing = '处理中',
  Finished = '完成',
}

export const Flv2Mp4Tool = () => {
  const [dropping, setDropping] = useState(false);
  const [droppedFiles, dropper] = useListState<string>([])
  const [fileStates, setFileStates] = useState<{ [key: string]: Status }>({})

  useEffect(() => {
    const unlisten = listen('tauri://file-drop', e => {
      // console.log('Window dropped files:', e)
      setDropping(false)
      const deduppedFiles = (e.payload as string[]).filter(
        f => !droppedFiles.includes(f)
      )
      const validFiles = deduppedFiles.filter(f => extension(f) === 'flv')
      if (validFiles.length < deduppedFiles.length) {
        showNotification({
          title: 'FLV转MP4',
          message: '仅支持拖放FLV文件',
          radius: 'xs',
          color: 'yellow',
        })
      }
      if (validFiles.length > 0) {
        dropper.append(...validFiles)
        validFiles.forEach(f => {
          setFileStates({ ...fileStates, [f]: Status.Processing })
          invoke('flv2mp4', { sourceFpath: f }).then((r: any) => {
            console.log(r)
            setFileStates({ ...fileStates, [f]: Status.Finished })
          })
        })
      }
    })
    return () => {
      unlisten?.then(f => f())
    }
  })

  useEffect(() => {
    const unlistenDropHover = listen('tauri://file-drop-hover', e => {
      setDropping(true)
    })
    const unlistenDropCancelled = listen('tauri://file-drop-cancelled', e => {
      setDropping(false)
    })
    return () => {
      unlistenDropHover?.then(f => f())
      unlistenDropCancelled?.then(f => f())
    }
  })
  const clearFinishedFiles = () => {
    droppedFiles.filter(f => fileStates[f] === Status.Finished).forEach(f => {
      setFileStates(states => {
        const newStates = { ...fileStates }
        delete newStates[f]
        return newStates
      })
      dropper.remove(droppedFiles.indexOf(f))
    })
  }

  return (
    <Container>
      <Center>
        <Stack
          justify='flex-start'
          spacing='md'
          w='100%'>
          <Box
            sx={theme => ({
              borderStyle: 'dashed',
              borderWidth: 3,
              borderColor: theme.colorScheme === 'dark' ? (
                theme.colors.gray[3]
              ) : (
                theme.colors.dark[3]
              ),
              cursor: 'default',
              borderRadius: 3,
              userSelect: 'none',
              backgroundColor: dropping ? (
                theme.colorScheme === 'dark' ? (
                  theme.colors.dark[3]
                ) : (
                  theme.colors.gray[3]
                )
              ) : 'unset',
            })}
            w='100%'
            h={120}
          >
            <Center h='100%'>
              {dropping ? (
                '松开以放入文件'
              ) : (
                '文件拖入此处'
              )}
            </Center>
          </Box>
          <Container fluid pos='relative' p={0} mx='unset'>
            {droppedFiles.length === 0 ? (
              <Center>
                <Text c='dimmed'>列表为空</Text>
              </Center>
            ) : (
              <>
                <Menu shadow='md' position='bottom-end' offset={0}>
                  <Menu.Target>
                    <ActionIcon
                      size='md'
                      radius='sm'
                      color='blue'
                      pos='absolute'
                      right={0}
                      top={0}
                    >
                      <IconDots size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown sx={theme => ({
                    userSelect: 'none',
                  })}>
                    <Menu.Item
                      icon={<IconPlaylistX size={14} />}
                      onClick={clearFinishedFiles}
                    >清除已完成的项</Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                <Stack justify='flex-start' spacing='xs' mt={40}>
                  {droppedFiles.map(f => (
                    <FileListItem
                      key={f}
                      filepath={f}
                      status={fileStates[f] || Status.Processing}
                    />
                  ))}
                </Stack>
              </>
            )}
          </Container>
        </Stack>
      </Center>
    </Container>
  )
}