use tauri_plugin_dialog::DialogExt;

#[tauri::command]
fn choose_background(app: tauri::AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .add_filter("Images", &["jpg", "jpeg", "png", "webp"])
        .blocking_pick_file()
        .map(|file_path| file_path.to_string())
}

#[tauri::command]
fn resize_window(window: tauri::WebviewWindow, width: f64, height: f64) {
    let _ = window.set_resizable(true);
    let _ = window.set_size(tauri::LogicalSize::new(width, height));
    let _ = window.set_resizable(false);
    let _ = window.center();
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            choose_background,
            resize_window,
            quit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
