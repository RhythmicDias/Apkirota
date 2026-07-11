use keyring::Entry;

/// Validate that a key_id looks like a UUID (basic hex-dash pattern).
fn is_valid_uuid(s: &str) -> bool {
    let s = s.trim();
    if s.len() != 36 { return false; }
    s.chars().enumerate().all(|(i, c)| {
        if i == 8 || i == 13 || i == 18 || i == 23 { c == '-' }
        else { c.is_ascii_hexdigit() }
    })
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn save_api_key(key_id: String, key_value: String) -> Result<(), String> {
    if !is_valid_uuid(&key_id) {
        return Err("Invalid key ID format.".to_string());
    }
    if key_value.len() > 256 {
        return Err("API key value exceeds maximum length.".to_string());
    }
    let entry = Entry::new("apkirota", &key_id).map_err(|e| format!("Keyring error: {}", e))?;
    entry.set_password(&key_value).map_err(|e| format!("Failed to save key: {}", e))?;
    Ok(())
}

#[tauri::command]
fn load_api_key(key_id: String) -> Result<String, String> {
    if !is_valid_uuid(&key_id) {
        return Err("Invalid key ID format.".to_string());
    }
    let entry = Entry::new("apkirota", &key_id).map_err(|e| format!("Keyring error: {}", e))?;
    match entry.get_password() {
        Ok(pass) => Ok(pass),
        Err(keyring::Error::NoEntry) => Ok("".to_string()),
        Err(_) => Err("Failed to load key from secure storage.".to_string()),
    }
}

#[tauri::command]
fn delete_api_key(key_id: String) -> Result<(), String> {
    if !is_valid_uuid(&key_id) {
        return Err("Invalid key ID format.".to_string());
    }
    let entry = Entry::new("apkirota", &key_id).map_err(|e| format!("Keyring error: {}", e))?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("Failed to delete key from secure storage.".to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri::menu::{Menu, MenuItem};
                use tauri::tray::TrayIconBuilder;
                use tauri::Manager;
                use tauri::Emitter;

                let settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
                let quit_i = MenuItem::with_id(app, "quit", "Exit", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&settings_i, &quit_i])?;

                TrayIconBuilder::new()
                    .menu(&menu)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "settings" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                            let _ = app.emit("open-settings", ());
                        }
                        _ => {}
                    })
                    .icon(app.default_window_icon().unwrap().clone())
                    .build(app)?;
            }
            Ok(())
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            save_api_key,
            load_api_key,
            delete_api_key
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
