use std::path::PathBuf;
use std::process::Stdio;
use ffmpeg_cli::{FfmpegBuilder, File, Parameter};
use futures::future::ready;
use crate::ffmpeg::{find_ffmpeg_executable, SetCommandExt};

#[tauri::command]
pub async fn extract_audio(source_fpath: &str) -> Result<String, ()> {
    let target_fpath = PathBuf::from(source_fpath)
        .with_extension("m4a");
    let builder = FfmpegBuilder::new()
        .locate_command()
        .stderr(Stdio::piped())
        .option(Parameter::Single("nostdin"))
        .option(Parameter::Single("y"))
        .input(File::new(source_fpath))
        .output(
            File::new(target_fpath.to_str().unwrap())
                .option(Parameter::KeyValue("map", "0:a"))
                .option(Parameter::KeyValue("codec", "copy"))
        );

    let ffmpeg = builder.run().await.unwrap();
    let output = ffmpeg.process.wait_with_output().unwrap();
    dbg!(output);
    Ok(String::from(target_fpath.to_str().unwrap()))
}