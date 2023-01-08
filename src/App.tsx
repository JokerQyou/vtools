import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import { AppShell, Navbar, Header, Box, NavLink } from '@mantine/core';
import { IconMovie, IconMusic, IconSlice } from "@tabler/icons";
import { Flv2Mp4Tool } from "./components/ToolFlv2Mp4";

const enum Tool {
  Flv2mp4 = 'FLV转MP4',
  ExtractAudio = '提取音频',
  EncodeTrim = '精确修剪',
}
const NavBarItems = [
  { icon: <IconMovie size={16} />, title: Tool.Flv2mp4 },
  { icon: <IconMusic size={16} />, title: Tool.ExtractAudio },
  { icon: <IconSlice size={16} />, title: Tool.EncodeTrim },
]

export default () => {
  const [currentTool, setCurrentTool] = useState(Tool.Flv2mp4)
  return (
    <AppShell
      padding='sm'
      navbar={
        <Navbar width={{ base: 240 }} height={500} >
          <Navbar.Section grow mt='xs'>
            <Box>
              {NavBarItems.map(i => (
                <NavLink
                  key={i.title}
                  label={i.title}
                  icon={i.icon}
                  rightSection={null}
                  active={i.title === currentTool}
                  variant='filled'
                  onClick={() => setCurrentTool(i.title)} />
              ))}
            </Box>
          </Navbar.Section>
        </Navbar>
      }
      header={<Header height={50} p="xs">{/* Header content */}</Header>}
      styles={(theme) => ({
        main: {
          backgroundColor: theme.colorScheme === 'dark' ? (
            theme.colors.dark[8]
          ) : (
            theme.colors.gray[0]
          )
        },
      })}
    >
      {currentTool === Tool.Flv2mp4 && (
        <Flv2Mp4Tool />
      )}
      {currentTool === Tool.ExtractAudio && (
        <>Extract audio</>
      )}
      {currentTool === Tool.EncodeTrim && (
        <>Trim and re-encode</>
      )}
      {/* Your application here */}
    </AppShell>
  )
}
