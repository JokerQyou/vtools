use std::borrow::Borrow;
use std::fs;
use std::path::PathBuf;
use std::process::Stdio;
use std::io::ErrorKind;
use ffmpeg_cli::FfmpegBuilder;

#[cfg(target_os="macos")]
pub fn find_ffmpeg_executable()-> Result<&'static str, ErrorKind> {
    let bin_fpaths: Vec<&str> = Vec::from();
    for bin_fpath in bin_fpaths {
        if fs::metadata(bin_fpath).is_ok() {
            return Ok(dbg!(bin_fpath))
        }
    }
    Err(ErrorKind::NotFound)
}

pub trait SetCommandExt<'a> {
    fn locate_command(self) -> Self;
}

impl<'a> SetCommandExt<'a> for FfmpegBuilder<'a>{
    fn locate_command(mut self) -> FfmpegBuilder<'a> {
        let mut bin_fpaths : Vec<&str>;
        #[cfg(target_os = "macos")]
        {
            bin_fpaths.extend([
                "/opt/homebrew/bin/ffmpeg",
                "/opt/homebrew/sbin/ffmpeg",
                "/usr/local/bin/ffmpeg",
                "/usr/bin/ffmpeg",
                "/bin/ffmpeg",
                "/usr/sbin/ffmpeg",
                "/sbin/ffmpeg",
            ])
        }
        #[cfg(target_os = "linux")]
        {
            bin_fpaths.extend([
                "/usr/local/bin/ffmpeg",
                "/usr/bin/ffmpeg",
                "/bin/ffmpeg",
                "/usr/sbin/ffmpeg",
                "/sbin/ffmpeg",
            ])
        }
        if bin_fpaths.len() > 0 {
            for bin_fpath in bin_fpaths {
                if fs::metadata(bin_fpath).is_ok() {
                    self.ffmpeg_command = dbg!(bin_fpath);
                    return self
                }
            }
        }

        self
    }
}