#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod flv2mp4;
mod extract_audio;
mod ffmpeg;

use tauri::Manager;

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
            flv2mp4::flv2mp4, extract_audio::extract_audio,
        ])
        .run(tauri::generate_context!())
        .expect("error while running vtools");
}
