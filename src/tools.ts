import { invoke } from '@tauri-apps/api'
import { sep } from '@tauri-apps/api/path'

export enum Tool {
  EncodeTrim = "精确修剪",
  Flv2Mp4 = "FLV转MP4",
  ExtractAudio = "提取音频",
  BiliHiRes = "封装B站无损音质",
}
export const ToolTitles = [
  Tool.EncodeTrim,
  Tool.Flv2Mp4,
  Tool.ExtractAudio,
  Tool.BiliHiRes,
]

export const baseName = (f: string) => {
  const fp = f.split(sep)
  return fp[fp.length - 1]
}
export const extension = (f: string) => {
  if (!f.includes('.')) { return '' }
  const fp = f.split('.')
  return fp[fp.length - 1].toLowerCase()
}

const acceptable_files = (extensions: string[], files: FileListItem[]) => {
  const vfiles = files.filter(f => extensions.includes(extension(f.filepath)))
  if (vfiles.length === 0) {
    throw new Error(`仅支持${extensions.join('/')}文件`)
  }
  return vfiles
}

export const invokeTool = async (tool: Tool, files: FileListItem[]) => {
  const accepts: string[] = []

  // FIXME
  switch (tool) {
    case Tool.Flv2Mp4:
      acceptable_files(['flv'], files).forEach(async f => {
        await invoke('flv2mp4', { file: f })
      })
      break
    case Tool.ExtractAudio:
      acceptable_files(['mp4'], files).forEach(async f => {
        await invoke('extract_audio', { file: f })
      })
      break
    case Tool.BiliHiRes:
      acceptable_files(['mp4'], files).forEach(async f => {
        await invoke('encode_bili_hires', { file: f })
      })
      break
    case Tool.EncodeTrim:
      acceptable_files(['llc'], files).forEach(async f => {
        await invoke('encode_and_trim', { file: f })
      })
      break
  }
}

export type FileListItem = {
  name: string // base name, without extension
  filepath: string // full path
  uuid: string // unique key
  tool: Tool // file operation
  progress: number // [0, 100], 100 means processed
  error: string
}
