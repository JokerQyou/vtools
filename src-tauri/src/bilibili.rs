use std::path::PathBuf;
use std::process::Stdio;

use ffmpeg_cli::{FfmpegBuilder, File, Parameter};

use crate::ffmpeg::SetCommandExt;

#[tauri::command]
pub async fn encode_bili_hires(source_fpath: &str) -> Result<String, ()> {
    let mut target_fpath = PathBuf::from(source_fpath);
    let target_fstem = target_fpath.file_stem().unwrap();
    target_fpath = target_fpath
        .with_file_name(format!("{}-bili_hires", target_fstem.to_str().unwrap()))
        .with_extension(target_fpath.extension().unwrap());

    let builder = FfmpegBuilder::new()
        .locate_command()
        .stderr(Stdio::piped())
        .option(Parameter::Single("nostdin"))
        .option(Parameter::Single("y"))
        .input(File::new(source_fpath))
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
    dbg!(ffmpeg.process.wait_with_output().unwrap());

    Ok(String::from(target_fpath.to_str().unwrap()))
}
