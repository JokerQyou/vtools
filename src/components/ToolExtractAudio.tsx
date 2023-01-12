import { SingleFileProcessor } from "./SingleFileProcessor"

export const ExtractAudioTool = () => {
  return <SingleFileProcessor
    title='提取音频'
    command='extract_audio'
    accepts={['mp4']}
  />
}