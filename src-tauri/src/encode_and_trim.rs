use futures::future::ready;
use futures::StreamExt;
use json5;
use std::process::Stdio;
use std::{fs, path::PathBuf};

use ffmpeg_cli::{FfmpegBuilder, File, Parameter, Status};
use ffprobe::ConfigBuilder;
use serde::Deserialize;
use tauri::Window;

use crate::{
    ffmpeg::SetCommandExt,
    utils::{FileItem, PROGRESS},
};

#[derive(Debug, Deserialize)]
struct LosslessCutSegment {
    name: String,
    start: f64,

    #[serde(default)]
    end: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct LosslessCutProject {
    version: i8,
    mediaFileName: String,
    cutSegments: Vec<LosslessCutSegment>,
}

#[tauri::command]
// pub async fn encode_and_trim(source_fpath: &str, start: &str, end: &str) -> Result<String, ()> {
pub async fn encode_and_trim(window: Window, mut file: FileItem) -> Result<String, ()> {
    // Read .llc file (LosslessCut project) with JSON5
    let llc_content = fs::read_to_string(file.filepath.as_str()).unwrap();
    let llc_proj = json5::from_str::<LosslessCutProject>(&llc_content).unwrap();

    let source = PathBuf::from(file.filepath.as_str()).with_file_name(llc_proj.mediaFileName);
    let source_fpath = source.to_str().unwrap();

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
    let audio_codec = audio.codec_name.clone().unwrap();
    let audio_bitrate = audio.bit_rate.clone().unwrap();
    let video_codec = video.codec_name.clone().unwrap();
    let video_bitrate = video.bit_rate.clone().unwrap();
    dbg!(video.duration.clone());
    dbg!(video.duration_ts);
    dbg!(video.time_base.clone());
    dbg!(video.start_time.clone());
    dbg!(video.clone());
    let total_segments_duration = {
        let mut total_duration = 0.0;
        llc_proj.cutSegments.iter().for_each(|s| {
            let segment_end = match s.end {
                Some(et) => et,
                None => {
                    // 如果 segment 没有 end，说明是最后一段，直接使用整个视频的 duration 作为 end
                    video
                        .duration
                        .clone()
                        .unwrap()
                        .parse::<f64>()
                        .unwrap_or(0.0)
                }
            };
            total_duration += segment_end - s.start;
        });
        total_duration
    };
    let mut processed_duration = 0.0;

    for (index, segment) in llc_proj.cutSegments.iter().enumerate() {
        let mut target_fpath = PathBuf::from(source_fpath);
        let target_fstem = target_fpath.file_stem().unwrap().to_str().unwrap();
        target_fpath = target_fpath
            .with_file_name(if segment.name.is_empty() {
                format!("{}-segment-{}", target_fstem, index + 1)
            } else {
                format!("{}-{}", index + 1, segment.name)
            })
            .with_extension(target_fpath.extension().unwrap());

        let start_str = segment.start.to_string();
        let end = segment.end.unwrap_or({
            video
                .duration
                .clone()
                .unwrap()
                .parse::<f64>()
                .unwrap_or(0.0)
        });
        let segment_duration = end - segment.start;
        let end_str = end.to_string();

        let builder = FfmpegBuilder::new()
            .locate_command()
            .stderr(Stdio::piped())
            .option(Parameter::Single("nostdin"))
            .option(Parameter::Single("y"))
            .input(
                File::new(source_fpath)
                    .option(Parameter::KeyValue("ss", &start_str))
                    .option(Parameter::KeyValue("to", &end_str)),
            )
            .output(
                File::new(target_fpath.to_str().unwrap())
                    .option(Parameter::KeyValue("vcodec", video_codec.as_str()))
                    .option(Parameter::KeyValue("acodec", audio_codec.as_str()))
                    .option(Parameter::KeyValue("b:a", audio_bitrate.as_str()))
                    .option(Parameter::KeyValue("b:v", video_bitrate.as_str())),
            );

        let ffmpeg = builder.run().await.unwrap();
        ffmpeg
            .progress
            .for_each(|x| {
                ready(match x {
                    Ok(progress) => {
                        let file_progress = match progress.status {
                            Status::Continue => {
                                let current = progress.out_time.unwrap().as_secs_f64();
                                (((processed_duration + current) / total_segments_duration) * 100.0)
                                    .floor() as i8
                            }
                            Status::End => 100,
                        };
                        file.progress = file_progress;
                        window.emit(PROGRESS, &file).unwrap_or(())
                    }
                    Err(e) => {
                        file.error = e.to_string();
                        window.emit(PROGRESS, &file).unwrap_or(())
                    }
                })
            })
            .await;
        let result = ffmpeg.process.wait_with_output().unwrap();
        print!("{}", String::from_utf8(result.stdout).unwrap());
        print!("{}", String::from_utf8(result.stderr).unwrap());

        if result.status.success() {
            processed_duration += segment_duration;
        }
    }
    Ok(String::from(file.filepath.as_str()))
}
