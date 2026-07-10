use keyring::Entry;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn save_api_key(key_id: String, key_value: String) -> Result<(), String> {
    let entry = Entry::new("apkirota", &key_id).map_err(|e| e.to_string())?;
    entry.set_password(&key_value).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_api_key(key_id: String) -> Result<String, String> {
    let entry = Entry::new("apkirota", &key_id).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(pass) => Ok(pass),
        Err(keyring::Error::NoEntry) => Ok("".to_string()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn delete_api_key(key_id: String) -> Result<(), String> {
    let entry = Entry::new("apkirota", &key_id).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
