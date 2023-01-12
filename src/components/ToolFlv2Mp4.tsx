import { SingleFileProcessor } from "./SingleFileProcessor"

export const Flv2Mp4Tool = () => {
  return <SingleFileProcessor
    title='FLV转MP4'
    command='flv2mp4'
    accepts={['flv']}
  />
}
