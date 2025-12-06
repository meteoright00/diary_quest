// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::sync::Mutex;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Database connection pool (simplified for single connection)
struct DbState {
    connections: Mutex<HashMap<String, Connection>>,
}

#[derive(Serialize, Deserialize)]
struct QueryResult {
    rows: Vec<HashMap<String, serde_json::Value>>,
    #[serde(rename = "rowsAffected")]
    rows_affected: usize,
    #[serde(rename = "lastInsertId")]
    last_insert_id: Option<i64>,
}

#[tauri::command]
fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    let app_data_dir = app
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| "Failed to get app data directory".to_string())?;

    // Create directory if it doesn't exist
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    app_data_dir
        .to_str()
        .ok_or_else(|| "Failed to convert path to string".to_string())
        .map(|s| s.to_string())
}

#[tauri::command]
fn read_world_settings(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read world settings file: {}", e))
}

#[tauri::command]
fn write_world_settings(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content)
        .map_err(|e| format!("Failed to write world settings file: {}", e))
}

#[tauri::command]
fn get_database_path(app: tauri::AppHandle) -> Result<String, String> {
    let app_data_dir = app
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| "Failed to get app data directory".to_string())?;

    // Create directory if it doesn't exist
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    let db_path = app_data_dir.join("diary_quest.db");

    db_path
        .to_str()
        .ok_or_else(|| "Failed to convert path to string".to_string())
        .map(|s| s.to_string())
}

#[tauri::command]
fn select_world_file() -> Result<Option<String>, String> {
    use tauri::api::dialog::blocking::FileDialogBuilder;

    let file_path = FileDialogBuilder::new()
        .add_filter("Markdown", &["md"])
        .set_title("世界観設定ファイルを選択")
        .pick_file();

    match file_path {
        Some(path) => {
            let path_str = path
                .to_str()
                .ok_or_else(|| "Failed to convert path to string".to_string())?
                .to_string();

            // Read file content
            let content = fs::read_to_string(&path_str)
                .map_err(|e| format!("Failed to read file: {}", e))?;

            Ok(Some(content))
        }
        None => Ok(None), // User cancelled
    }
}

#[tauri::command]
fn execute_sql(
    db_path: String,
    query: String,
    values: Vec<serde_json::Value>,
) -> Result<QueryResult, String> {
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    // Convert JSON values to rusqlite values
    let params: Vec<Box<dyn rusqlite::ToSql>> = values
        .iter()
        .map(|v| -> Box<dyn rusqlite::ToSql> {
            match v {
                serde_json::Value::String(s) => Box::new(s.clone()),
                serde_json::Value::Number(n) => {
                    if let Some(i) = n.as_i64() {
                        Box::new(i)
                    } else if let Some(f) = n.as_f64() {
                        Box::new(f)
                    } else {
                        Box::new(n.to_string())
                    }
                }
                serde_json::Value::Bool(b) => Box::new(*b),
                serde_json::Value::Null => Box::new(rusqlite::types::Null),
                _ => Box::new(v.to_string()),
            }
        })
        .collect();

    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&query)
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    // Check if this is a SELECT query
    if query.trim().to_uppercase().starts_with("SELECT") {
        let column_count = stmt.column_count();
        let column_names: Vec<String> = (0..column_count)
            .map(|i| stmt.column_name(i).unwrap_or("").to_string())
            .collect();

        let rows = stmt
            .query_map(params_refs.as_slice(), |row| {
                let mut map = HashMap::new();
                for (i, name) in column_names.iter().enumerate() {
                    // Get value as rusqlite::types::Value and convert to serde_json::Value
                    let value: rusqlite::types::Value = row.get(i).unwrap_or(rusqlite::types::Value::Null);
                    let json_value = match value {
                        rusqlite::types::Value::Null => serde_json::Value::Null,
                        rusqlite::types::Value::Integer(i) => serde_json::json!(i),
                        rusqlite::types::Value::Real(f) => serde_json::json!(f),
                        rusqlite::types::Value::Text(s) => serde_json::Value::String(s),
                        rusqlite::types::Value::Blob(_) => serde_json::Value::Null,
                    };
                    map.insert(name.clone(), json_value);
                }
                Ok(map)
            })
            .map_err(|e| format!("Query failed: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect rows: {}", e))?;

        Ok(QueryResult {
            rows,
            rows_affected: 0,
            last_insert_id: None,
        })
    } else {
        // Execute INSERT, UPDATE, DELETE, CREATE, etc.
        let rows_affected = stmt.execute(params_refs.as_slice())
            .map_err(|e| format!("Execute failed: {}", e))?;

        Ok(QueryResult {
            rows: vec![],
            rows_affected,
            last_insert_id: Some(conn.last_insert_rowid()),
        })
    }
}

use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayMenuItem, SystemTrayEvent, Manager};

fn main() {
    let quit = CustomMenuItem::new("quit".to_string(), "終了");
    let show = CustomMenuItem::new("show".to_string(), "開く");
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);
    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick {
                position: _,
                size: _,
                ..
            } => {
                let window = app.get_window("main").unwrap();
                if window.is_visible().unwrap() {
                    window.hide().unwrap();
                } else {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
            SystemTrayEvent::MenuItemClick { id, .. } => {
                match id.as_str() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        let window = app.get_window("main").unwrap();
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            get_app_data_dir,
            read_world_settings,
            write_world_settings,
            get_database_path,
            select_world_file,
            execute_sql,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
