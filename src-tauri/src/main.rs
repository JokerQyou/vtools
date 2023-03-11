#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::Manager;

use tauri_plugin_log::LogTarget;

mod bilibili;
mod encode_and_trim;
mod extract_audio;
mod ffmpeg;
mod flv2mp4;
mod utils;

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .targets([LogTarget::LogDir, LogTarget::Stdout])
                .build(),
        )
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            flv2mp4::flv2mp4,
            extract_audio::extract_audio,
            encode_and_trim::encode_and_trim,
            bilibili::encode_bili_hires,
            utils::mouse_viewport_pos,
        ])
        .run(tauri::generate_context!())
        .expect("error while running vtools");
}
