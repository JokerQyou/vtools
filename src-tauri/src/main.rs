#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::Manager;

mod bilibili;
mod encode_and_trim;
mod extract_audio;
mod ffmpeg;
mod flv2mp4;

fn main() {
    tauri::Builder::default()
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running vtools");
}
