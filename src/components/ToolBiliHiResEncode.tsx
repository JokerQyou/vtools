import { SingleFileProcessor } from "./SingleFileProcessor"

export const BilibiliHiResEncodeTool = () => {
  return <SingleFileProcessor
    title='封装B站无损音质'
    command='encode_bili_hires'
    accepts={['mp4']}
  />
}
