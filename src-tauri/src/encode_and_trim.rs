use std::path::PathBuf;
use std::process::Stdio;
use std::thread::sleep;
use std::time::Duration;

use ffmpeg_cli::{FfmpegBuilder, File, Parameter};
use ffprobe::ConfigBuilder;

use crate::ffmpeg::SetCommandExt;

#[tauri::command]
pub async fn encode_and_trim(source_fpath: &str, start: &str, end: &str) -> Result<String, ()> {
    let probe = ConfigBuilder::new()
        .count_frames(false)
        .run(source_fpath)
        .unwrap();

    let audio = probe
        .streams
        .iter()
        .find(|s| s.codec_type.clone().unwrap() == "audio")
        .unwrap();
    let video = probe
        .streams
        .iter()
        .find(|s| s.codec_type.clone().unwrap() == "video")
        .unwrap();

    let mut target_fpath = PathBuf::from(source_fpath);
    let target_fstem = target_fpath.file_stem().unwrap();
    target_fpath = target_fpath
        .with_file_name(format!("{}-trimmed", target_fstem.to_str().unwrap()))
        .with_extension(target_fpath.extension().unwrap());
    let audio_codec = audio.codec_name.clone().unwrap();
    let audio_bitrate = audio.bit_rate.clone().unwrap();
    let video_codec = video.codec_name.clone().unwrap();
    let video_bitrate = video.bit_rate.clone().unwrap();
    let builder = FfmpegBuilder::new()
        .locate_command()
        .stderr(Stdio::piped())
        .option(Parameter::Single("nostdin"))
        .option(Parameter::Single("y"))
        .input(
            File::new(source_fpath)
                .option(Parameter::KeyValue("ss", start))
                .option(Parameter::KeyValue("to", end)),
        )
        .output(
            File::new(target_fpath.to_str().unwrap())
                .option(Parameter::KeyValue("vcodec", video_codec.as_str()))
                .option(Parameter::KeyValue("acodec", audio_codec.as_str()))
                .option(Parameter::KeyValue("b:a", audio_bitrate.as_str()))
                .option(Parameter::KeyValue("b:v", video_bitrate.as_str())),
        );

    let ffmpeg = builder.run().await.unwrap();
    dbg!(ffmpeg.process.wait_with_output().unwrap());

    Ok(String::from(target_fpath.to_str().unwrap()))
}
