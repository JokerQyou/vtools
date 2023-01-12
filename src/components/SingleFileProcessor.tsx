
import {
  ActionIcon, Avatar, Center, Container,
  Group, Loader, Menu, Paper, Stack, Text, ThemeIcon, Tooltip,
} from "@mantine/core"
import { useListState, useSetState } from "@mantine/hooks"
import { showNotification } from "@mantine/notifications"
import { IconCheck, IconDots, IconMovie, IconPlaylistX, IconSearch } from "@tabler/icons"
import { invoke } from "@tauri-apps/api"
import { sep } from "@tauri-apps/api/path"
import { listen } from "@tauri-apps/api/event"
import { CSSProperties, useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

export const enum Status {
  Processing = '处理中',
  Finished = '完成',
}

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

type uiProps = {
  title: string
  command: string
  accepts?: string[]
}
export const SingleFileProcessor = ({ title, command, accepts }: uiProps) => {
  const [dropping, setDropping] = useState(false);
  const [droppedFiles, dropper] = useListState<string>([])
  const [fileStates, setFileStates] = useSetState<{ [key: string]: Status }>({});

  useEffect(() => {
    const unlisten = listen('tauri://file-drop', e => {
      // console.log('Window dropped files:', e)
      setDropping(false)
      const deduppedFiles = (e.payload as string[]).filter(
        f => !droppedFiles.includes(f)
      )
      let validFiles: string[]
      if (accepts) {
        validFiles = deduppedFiles.filter(f => (accepts || []).includes(extension(f)))
        if (validFiles.length < deduppedFiles.length) {
          showNotification({
            title,
            message: `仅支持拖放${accepts.map(a => a.toUpperCase()).join('/')}文件`,
            radius: 'xs',
            color: 'yellow',
          })
        }
      } else {
        validFiles = deduppedFiles
      }
      if (validFiles.length > 0) {
        dropper.append(...validFiles)
        validFiles.forEach(f => {
          setFileStates(current => ({ ...current, [f]: Status.Processing }))
          invoke(command, { sourceFpath: f }).then((r: any) => {
            setFileStates(current => ({ ...current, [f]: Status.Finished }))
          })
        })
      }
    })
    return () => {
      unlisten?.then(f => f())
    }
  }, [])

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
  }, [])

  const clearFinishedFiles = () => {
    const finishedFiles = droppedFiles.filter(f => fileStates[f] === Status.Finished)
    dropper.remove(...finishedFiles.map(f => droppedFiles.indexOf(f)))
    setFileStates(current => (
      Object.fromEntries(
        Object.entries(current).filter(([f, s]) => !finishedFiles.includes(f))
      )
    ))
  }

  return (
    <Container>
      <Center>
        <Stack
          justify='flex-start'
          spacing='md'
          w='100%'>
          <Container fluid pos='relative' p={0} mx='unset'>
            <>
              {droppedFiles.length > 0 && (
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
              )}
              <Stack justify='flex-start' spacing='xs' mt={40}>
                <AnimatePresence>
                  {droppedFiles.length === 0 && (
                    <motion.div
                      key='empty-placeholder'
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: .2, ease: 'easeInOut' }}
                    >
                      <Center>
                        <Text c='dimmed'>列表为空</Text>
                      </Center>
                    </motion.div>
                  )}
                  {droppedFiles.map(f => (
                    <motion.div
                      key={f}
                      initial={{ opacity: 0, x: 200 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ duration: .2 }}
                    >
                      <FileListItem
                        filepath={f}
                        status={fileStates[f] || Status.Processing}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </Stack>
            </>
          </Container>
        </Stack>
      </Center>
    </Container>
  )
}