use enigo::{Enigo, MouseControllable};
use serde::{Deserialize, Serialize};
use tauri::Runtime;

#[tauri::command]
pub async fn mouse_viewport_pos<R: Runtime>(
    _app: tauri::AppHandle<R>,
    window: tauri::Window<R>,
) -> Result<(i32, i32), String> {
    let cursor_pos = dbg!(Enigo::new().mouse_location());
    let window_pos = dbg!(window.inner_position().unwrap());
    // dbg!(window.outer_position());
    // dbg!(window.outer_size());
    // dbg!(window.inner_size());
    let scale_factor = dbg!(window.scale_factor().unwrap());
    /**
     * It's very strange that location calculation does not work reliably on both platforms.
     * The linux way seems logical. But on macOS Enigo::mouse_location returns logical
     * coordinates, and window.inner_position() returns physical coordinates.
     * Also on macOS window.inner_position() does not take into account the window decoration
     * height (height of the draggable header of our window), so a manual hack
     * has to be applied.
     */
    #[cfg(target_os = "linux")]
    {
        Ok((
            ((f64::from(cursor_pos.0) - f64::from(window_pos.x)) / scale_factor) as i32,
            ((f64::from(cursor_pos.1) - f64::from(window_pos.y)) / scale_factor) as i32,
        ))
    }

    #[cfg(target_os = "macos")]
    {
        Ok((
            (f64::from(cursor_pos.0) - f64::from(window_pos.x) / scale_factor) as i32,
            (f64::from(cursor_pos.1) - 32.0 - f64::from(window_pos.y) / scale_factor) as i32,
        ))
    }
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
