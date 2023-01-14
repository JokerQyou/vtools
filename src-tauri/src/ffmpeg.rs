use std::borrow::Borrow;
use std::fs;
use std::path::PathBuf;
use std::process::Stdio;
use std::io::ErrorKind;
use ffmpeg_cli::FfmpegBuilder;

#[cfg(target_os="macos")]
pub fn find_ffmpeg_executable()-> Result<&'static str, ErrorKind> {
    let bin_fpaths: Vec<&str> = Vec::from([
        "/opt/homebrew/bin/ffmpeg",
        "/opt/homebrew/sbin/ffmpeg",
        "/usr/local/bin/ffmpeg",
        "/usr/bin/ffmpeg",
        "/bin/ffmpeg",
        "/usr/sbin/ffmpeg",
        "/sbin/ffmpeg",
    ]);
    for bin_fpath in bin_fpaths {
        if fs::metadata(bin_fpath).is_ok() {
            return Ok(dbg!(bin_fpath))
        }
    }
    Err(ErrorKind::NotFound)
}

pub trait SetCommandExt<'a> {
    fn set_command(self, command: &'a str) -> Self;
}

impl<'a> SetCommandExt<'a> for FfmpegBuilder<'a>{
    fn set_command(mut self, command: &'a str) -> FfmpegBuilder<'a> {
        self.ffmpeg_command = command;
        self
    }
}