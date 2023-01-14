use std::path::PathBuf;
use std::process::Stdio;

use ffmpeg_cli::{FfmpegBuilder, File, Parameter};
use futures::future::ready;
use futures::stream::StreamExt;

use crate::ffmpeg::SetCommandExt;

#[tauri::command]
pub async fn flv2mp4(source_fpath: &str) -> Result<String, ()> {
    let target_fpath = PathBuf::from(source_fpath)
        .with_extension("mp4");
    let builder = FfmpegBuilder::new()
        .locate_command()
        .stderr(Stdio::piped())
        .option(Parameter::Single("nostdin"))
        .option(Parameter::Single("y"))
        .input(File::new(source_fpath))
        .output(
            File::new(target_fpath.to_str().unwrap())
                .option(Parameter::KeyValue("vcodec", "copy"))
                .option(Parameter::KeyValue("acodec", "copy")),
        );

    let ffmpeg = builder.run().await.unwrap();
    dbg!(ffmpeg.process.wait_with_output().unwrap_or_default());

    Ok(String::from(target_fpath.to_str().unwrap()))
}