use std::path::PathBuf;
use std::process::Stdio;

use ffmpeg_cli::{FfmpegBuilder, File, Parameter};
use tauri::Window;

use crate::{
    ffmpeg::SetCommandExt,
    utils::{FileItem, PROGRESS},
};

#[tauri::command]
pub async fn encode_bili_hires(window: Window, mut file: FileItem) -> Result<String, ()> {
    let mut target_fpath = PathBuf::from(file.filepath.as_str());
    let target_fstem = target_fpath.file_stem().unwrap();
    target_fpath = target_fpath
        .with_file_name(format!("{}-bili_hires", target_fstem.to_str().unwrap()))
        .with_extension(target_fpath.extension().unwrap());

    let builder = FfmpegBuilder::new()
        .locate_command()
        .stderr(Stdio::piped())
        .option(Parameter::Single("nostdin"))
        .option(Parameter::KeyValue("v", "warning")) // avoid too much stdout content
        .option(Parameter::Single("y"))
        .input(File::new(&file.filepath.as_str()))
        .output(
            File::new(target_fpath.to_str().unwrap())
                .option(Parameter::KeyValue("vcodec", "copy"))
                .option(Parameter::KeyValue("acodec", "flac"))
                .option(Parameter::Single("strict"))
                .option(Parameter::Single("2"))
                .option(Parameter::KeyValue("sample_fmt", "s32"))
                .option(Parameter::KeyValue("ar", "48000")),
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
