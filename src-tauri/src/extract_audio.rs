use std::path::PathBuf;
use std::process::Stdio;

use ffmpeg_cli::{FfmpegBuilder, File, Parameter};

use crate::{
    ffmpeg::SetCommandExt,
    utils::{FileItem, PROGRESS},
};

#[tauri::command]
pub async fn extract_audio(window: tauri::Window, mut file: FileItem) -> Result<String, ()> {
    let target_fpath = PathBuf::from(file.filepath.as_str()).with_extension("m4a");
    let builder = FfmpegBuilder::new()
        .locate_command()
        .stderr(Stdio::piped())
        .option(Parameter::Single("nostdin"))
        .option(Parameter::KeyValue("v", "warning")) // avoid too much stdout content
        .option(Parameter::Single("y"))
        .input(File::new(file.filepath.as_str()))
        .output(
            File::new(target_fpath.to_str().unwrap())
                .option(Parameter::KeyValue("map", "0:a"))
                .option(Parameter::KeyValue("codec", "copy")),
        );

    let ffmpeg = builder.run().await.unwrap();
    let result = dbg!(ffmpeg.process.wait_with_output().unwrap());
    if result.status.success() {
        file.progress = 100;
    } else {
        file.error = String::from_utf8(result.stderr).unwrap();
    }

    window.emit(PROGRESS, &file);
    Ok(String::from(target_fpath.to_str().unwrap()))
}
