import {
  ActionIcon, Avatar, Button, Center, Container,
  Grid,
  Group, Loader, Menu, Modal, Paper,
  Stack, Text, TextInput, ThemeIcon, Tooltip,
} from "@mantine/core"
import { useListState } from "@mantine/hooks"
import { showNotification } from "@mantine/notifications"
import {
  IconCheck, IconCircleX, IconClockPlay, IconDots,
  IconMovie, IconPlaylistX, IconSearch,
} from "@tabler/icons"
import { invoke } from "@tauri-apps/api"
import { listen, TauriEvent, Event as TauriEventType } from "@tauri-apps/api/event"
import { CSSProperties, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { baseName, extension } from "./SingleFileProcessor"
import { useForm } from "@mantine/form"

const enum trimStatus {
  Queued = '排队中',
  Processing = '处理中',
  Finished = '完成',
}

type FileListItemProps = {
  filepath: string
  style?: CSSProperties
  status: trimStatus
}
const FileListItem = ({ filepath, style, status }: FileListItemProps) => {
  return (
    <Paper
      p='xs'
      withBorder
      style={style}
      sx={theme => ({
        backgroundColor: (status === trimStatus.Finished) ? theme.colors.green[0] : 'unset',
      })}>
      <Group spacing='xs'>
        <Avatar color={(status === trimStatus.Finished) ? 'teal' : 'blue'}>
          <IconMovie />
        </Avatar>
        <Tooltip
          label={baseName(filepath)}
          withArrow
          multiline
          sx={theme => ({
            maxWidth: '80%',
          })}
        >
          <Text
            size='sm'
            sx={theme => ({
              userSelect: 'all',
              maxWidth: '60%',
            })}
            truncate
          >{baseName(filepath)}</Text>
        </Tooltip>
        <Group sx={theme => ({
          flex: 1,
          justifyContent: 'flex-end',
        })}>
          {status === trimStatus.Queued && (
            <Tooltip label={status} withArrow>
              <ThemeIcon size={20} radius='xs'>
                <IconClockPlay />
              </ThemeIcon>
            </Tooltip>
          )}
          {status === trimStatus.Processing && (
            <Loader size={20} />
          )}
          {status === trimStatus.Finished && (
            <Tooltip label={status} withArrow>
              <ThemeIcon size={20} radius='xl' color='teal'>
                <IconCheck />
              </ThemeIcon>
            </Tooltip>
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

export const FileEncodeTrimTool = () => {
  const [dropping, setDropping] = useState(false)

  type FileTimeRange = {
    fpath: string
    start: string
    end: string
    state: trimStatus
  }
  const form = useForm<{ files: FileTimeRange[] }>({
    initialValues: {
      files: [],
    },
    validate: {
      files: {
        start: v => /^\d{2}:\d{2}\.\d{2,3}$/.test(v) ? null : '填写起始时间',
        end: v => /^\d{2}:\d{2}\.\d{2,3}$/.test(v) ? null : '填写结束时间',
      }
    },
    validateInputOnBlur: true,
    validateInputOnChange: true,
  })
  const formRef = useRef(form);
  const handleFileDrop = (e: TauriEventType<string[]>) => {
    setDropping(false)

    const validFiles = (e.payload).filter(
      f => extension(f) !== ''
    ).filter(
      f => !formRef.current.values.files.some(ef => ef.fpath === f)
    )
    validFiles.map(vf => ({ fpath: vf, start: '', end: '' })).forEach(f => {
      formRef.current.insertListItem('files', f)
    })
  }
  const removeFormFile = (index: number) => {
    const fo = formRef.current;
    fo.removeListItem('files', index)
  }
  useEffect(() => {
    formRef.current = form
  }, [form])

  useEffect(() => {
    const unlisten = listen(TauriEvent.WINDOW_FILE_DROP, handleFileDrop)
    return () => {
      unlisten?.then(f => f())
    }
  }, [])

  useEffect(() => {
    const unlistenDropHover = listen(TauriEvent.WINDOW_FILE_DROP_HOVER, e => {
      setDropping(true)
    })
    const unlistenDropCancelled = listen(TauriEvent.WINDOW_FILE_DROP_CANCELLED, e => {
      setDropping(false)
    })
    return () => {
      unlistenDropHover?.then(f => f())
      unlistenDropCancelled?.then(f => f())
    }
  }, [])
  const [files, fileHandler] = useListState<FileTimeRange>([])
  useEffect(() => {
    // A file is being processed, wait for it to finish
    if (files.some(f => f.state === trimStatus.Processing)) {
      return
    }
    // All files are processed, nothing to do
    let nextFileIndex = -1
    files.some((f, i) => {
      if (f.state === trimStatus.Queued) {
        nextFileIndex = i
        return true
      }
    })
    // All files are processed, nothing to do
    if (nextFileIndex === -1) {
      return
    }
    // Process the next file
    const nextFile = files[nextFileIndex]
    fileHandler.setItemProp(nextFileIndex, 'state', trimStatus.Processing)
    invoke('encode_and_trim', {
      sourceFpath: nextFile.fpath,
      start: nextFile.start,
      end: nextFile.end,
    }).then((r: any) => {
      // nextFileIndex might be obsolete, need to find current index
      let fIndex = -1
      // handler.filter will actually change the list state in-place.
      // we only want to read the latest state with it, not to change it,
      // so the filter callback always return `true`.
      fileHandler.filter((f, i) => {
        if (f.fpath === nextFile.fpath) {
          fIndex = i
          return true
        }
        return true
      })
      if (fIndex === -1) {
        return
      }
      fileHandler.setItemProp(fIndex, 'state', trimStatus.Finished)
    })
  }, [files])

  const submitFileRanges = (values: typeof form.values) => {
    fileHandler.append(...values.files.map(f => ({ ...f, state: trimStatus.Queued })))
    form.reset()
  }

  const clearFinishedFiles = () => {
    const finishedIndexes = files.map(
      (f, i) => f.state === trimStatus.Finished ? i : -1
    ).filter(i => i !== -1)
    fileHandler.remove(...finishedIndexes)
  }

  return (
    <>
      {form.values.files.length > 0 && (
        <Modal
          opened={true}
          onClose={() => form.reset()}
          title='设定文件起始和结束时间'
          centered
          size='xl'
        >
          <form onSubmit={form.onSubmit(vs => submitFileRanges(vs))}>
            {form.values.files.map((ftr, index) => (
              <Paper
                key={ftr.fpath}
                p='xs'
                mb={10}
                withBorder
              >
                <Grid gutter='xs' align='center'>
                  <Grid.Col span={5}>
                    <Group spacing='xs'>
                      <ThemeIcon variant='light'>
                        <IconMovie />
                      </ThemeIcon>
                      <Tooltip
                        label={baseName(ftr.fpath)}
                        withArrow
                        multiline
                        sx={theme => ({
                          maxWidth: '80%',
                        })}
                      >
                        <Text
                          size='sm'
                          sx={theme => ({
                            userSelect: 'all',
                            maxWidth: 'calc(90% - 8px)'
                          })}
                          truncate
                        >{baseName(ftr.fpath)}</Text>
                      </Tooltip>
                    </Group>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Group grow>
                      <TextInput
                        placeholder='开始，例如 00:01.458'
                        label={null}
                        {...form.getInputProps(`files.${index}.start`)}
                        withAsterisk
                      />
                      <TextInput
                        placeholder='结束，例如 04:16.026'
                        label={null}
                        {...form.getInputProps(`files.${index}.end`)}
                        withAsterisk
                      />
                    </Group>
                  </Grid.Col>
                  <Grid.Col span={'auto'}>
                    <Group position='center'>
                      <Tooltip label='移除'>
                        <ActionIcon color='red'>
                          <IconCircleX size={16} onClick={() => removeFormFile(index)} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Grid.Col>
                </Grid>
              </Paper>
            ))}
            <Group position='center' mt={10}>
              <Button type='submit'>确定</Button>
            </Group>
          </form>
        </Modal>
      )}
      {dropping ? (
        <motion.div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            zIndex: 999,
            ...form.values.files.length === 0 ? {} : {
              position: 'absolute',
              top: 0,
              left: 0,
              width: 'calc(100% -  6px)',
              height: 'calc(100% - 6px)',
            }
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: .2 }}
        >
          <Container
            p={0}
            pos='absolute'
            top={0}
            left={0}
            w='100%'
            h='100%'
            style={{
              borderWidth: 3,
              borderStyle: 'dashed',
              borderRadius: 3,
            }}
            sx={theme => ({
              backgroundColor: theme.colors.gray[2],
              borderColor: theme.colors.gray[6],
            })}
          >
            <Center h='100%'>
              <Text
                size='xl'
                weight='bold'
                sx={theme => ({
                  color: theme.colors.dark[3],
                })}
              >松开鼠标以添加文件</Text>
            </Center>
          </Container>
        </motion.div>
      ) : (
        <Container>
          <Center>
            <Stack
              justify='flex-start'
              spacing='md'
              w='100%'
              opacity={dropping ? 0 : 1}>
              <Container fluid pos='relative' p={0} mx='unset'>
                <>
                  {files.length > 0 && (
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
                      {files.length === 0 && (
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
                      {files.map(f => (
                        <motion.div
                          key={f.fpath}
                          initial={{ opacity: 0, x: 200 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ duration: .2 }}
                        >
                          <FileListItem
                            filepath={f.fpath}
                            status={f.state}
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
      )}
    </>
  )
}