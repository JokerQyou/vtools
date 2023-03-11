use enigo::Enigo;
use serde::{Deserialize, Serialize};
use tauri::Runtime;

#[tauri::command]
pub async fn mouse_viewport_pos<R: Runtime>(
    app: tauri::AppHandle<R>,
    window: tauri::Window<R>,
) -> Result<(i32, i32), String> {
    let cursor_pos = Enigo::mouse_location();
    let window_pos = window.inner_position().unwrap();
    let scale_factor = window.scale_factor().unwrap();
    // Ok((window_pos.x, window_pos.y))
    // Ok(cursor_pos)
    Ok((
        (f64::from(cursor_pos.0) - f64::from(window_pos.x) / scale_factor) as i32,
        (f64::from(cursor_pos.1) - f64::from(window_pos.y) / scale_factor) as i32,
    ))
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FileItem {
    pub name: String,
    pub filepath: String,
    pub uuid: String,
    pub tool: String,
    pub progress: i8,
    pub error: String,
}

pub type ToolEvent = &'static str;
pub const PROGRESS: ToolEvent = "progress";
