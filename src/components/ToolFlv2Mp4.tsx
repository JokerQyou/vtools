import {
  ActionIcon, Avatar, Box, Center, Container,
  Group, Loader, Paper, Stack, Text, ThemeIcon, Tooltip,
} from "@mantine/core"
import { useListState } from "@mantine/hooks"
import { showNotification } from "@mantine/notifications"
import { IconCheck, IconCircleCheck, IconMovie, IconSearch } from "@tabler/icons"
import { invoke } from "@tauri-apps/api"
import { listen } from "@tauri-apps/api/event"
import { CSSProperties, useEffect, useState } from "react"

const baseName = (f: string) => {
  const fp = f.split('/')
  return fp[fp.length - 1]
}
const extension = (f: string) => {
  const fp = f.split('.')
  return fp[fp.length - 1]
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
      const validFiles = deduppedFiles.filter(f => extension(f).toLowerCase() === 'flv')
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

  return (
    <Container>
      <Center>
        <Stack
          justify='flex-start'
          spacing='md'
          sx={theme => ({
            width: '100%',
          })}>
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
              width: '100%',
              height: 120,
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
          >
            <Center h='100%'>
              {dropping ? (
                '松开以放入文件'
              ) : (
                '文件拖入此处'
              )}
            </Center>
          </Box>
          <Stack justify='flex-start' spacing='xs'>
            {droppedFiles.length === 0 ? (
              <Center>
                <Text c='dimmed'>列表为空</Text>
              </Center>
            ) : (
              droppedFiles.map(f => (
                <FileListItem key={f} filepath={f} status={fileStates[f] || Status.Processing} />
              ))
            )}
          </Stack>
        </Stack>
      </Center>
    </Container>
  )
}