use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

#[derive(Serialize)]
pub struct ImportResult {
    pub success: bool,
    pub skin_id: String,
    pub message: String,
}

fn get_skins_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if cfg!(debug_assertions) {
        let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
        let project_root = manifest_dir.parent().unwrap_or(manifest_dir);
        return Ok(project_root.join("public").join("skins"));
    }

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(data_dir.join("skins"))
}

fn validate_skin_dir(dir: &Path) -> Result<serde_json::Value, String> {
    let skin_json_path = dir.join("skin.json");
    if !skin_json_path.exists() {
        return Err("缺少 skin.json 文件".to_string());
    }

    let content =
        fs::read_to_string(&skin_json_path).map_err(|e| format!("无法读取 skin.json: {}", e))?;

    let manifest: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("skin.json 格式错误: {}", e))?;

    let required_fields = ["name", "author", "format", "size", "animations"];
    for field in &required_fields {
        if manifest.get(field).is_none() {
            return Err(format!("skin.json 缺少必需字段: {}", field));
        }
    }

    let animations = manifest
        .get("animations")
        .and_then(|v| v.as_object())
        .ok_or("animations 字段格式无效")?;

    if animations.is_empty() {
        return Err("至少需要定义一个动画状态".to_string());
    }

    for (state, anim) in animations {
        let file = anim
            .get("file")
            .and_then(|v| v.as_str())
            .ok_or(format!("动画 {} 缺少 file 字段", state))?;

        if file.contains("..") {
            return Err(format!("动画 {} 的文件路径不合法: {}", state, file));
        }

        let file_path = dir.join(file);
        let canonical = file_path
            .canonicalize()
            .map_err(|_| format!("动画 {} 引用的文件不存在: {}", state, file))?;
        let dir_canonical = dir
            .canonicalize()
            .map_err(|e| format!("路径解析失败: {}", e))?;
        if !canonical.starts_with(&dir_canonical) {
            return Err(format!("动画 {} 的文件路径越界: {}", state, file));
        }
    }

    let has_pet_avatar = dir.join("pet.gif").exists() || dir.join("pet.png").exists();
    if !has_pet_avatar {
        return Err("缺少 pet.png 或 pet.gif 角色头像文件".to_string());
    }

    Ok(manifest)
}

#[tauri::command]
pub async fn import_skin_from_dir(app: tauri::AppHandle, source_dir: String) -> ImportResult {
    let source = Path::new(&source_dir);
    if !source.is_dir() {
        return ImportResult {
            success: false,
            skin_id: String::new(),
            message: "指定的路径不是文件夹".to_string(),
        };
    }

    let manifest = match validate_skin_dir(source) {
        Ok(m) => m,
        Err(msg) => {
            return ImportResult {
                success: false,
                skin_id: String::new(),
                message: msg,
            }
        }
    };

    let skin_id = source
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_lowercase()
        .replace(' ', "-");

    let skins_dir = match get_skins_dir(&app) {
        Ok(d) => d,
        Err(msg) => {
            return ImportResult {
                success: false,
                skin_id: String::new(),
                message: msg,
            }
        }
    };

    let target_dir = skins_dir.join(&skin_id);
    if target_dir.exists() {
        return ImportResult {
            success: false,
            skin_id: skin_id.clone(),
            message: format!("角色 {} 已存在", skin_id),
        };
    }

    if let Err(e) = fs::create_dir_all(&target_dir) {
        return ImportResult {
            success: false,
            skin_id: String::new(),
            message: format!("创建目录失败: {}", e),
        };
    }

    if let Err(e) = copy_dir_contents(source, &target_dir) {
        let _ = fs::remove_dir_all(&target_dir);
        return ImportResult {
            success: false,
            skin_id: String::new(),
            message: format!("复制文件失败: {}", e),
        };
    }

    update_catalog(&skins_dir, &skin_id);

    let name = manifest
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or(&skin_id);

    ImportResult {
        success: true,
        skin_id: skin_id.clone(),
        message: format!("成功导入角色: {}", name),
    }
}

const BUILTIN_SKINS: &[&str] = &[
    "vita", "doux", "mort", "tard", "boy", "dinosaur", "line", "glube",
];

#[tauri::command]
pub async fn remove_skin(app: tauri::AppHandle, skin_id: String) -> ImportResult {
    if skin_id.contains("..") || skin_id.contains('/') || skin_id.contains('\\') {
        return ImportResult {
            success: false,
            skin_id: skin_id.clone(),
            message: "角色 ID 不合法".to_string(),
        };
    }

    if BUILTIN_SKINS.contains(&skin_id.as_str()) {
        return ImportResult {
            success: false,
            skin_id: skin_id.clone(),
            message: "内置角色不能移除".to_string(),
        };
    }

    let skins_dir = match get_skins_dir(&app) {
        Ok(d) => d,
        Err(msg) => {
            return ImportResult {
                success: false,
                skin_id: String::new(),
                message: msg,
            }
        }
    };

    let target_dir = skins_dir.join(&skin_id);
    if !target_dir.exists() {
        return ImportResult {
            success: false,
            skin_id: skin_id.clone(),
            message: format!("角色 {} 不存在", skin_id),
        };
    }

    if let Err(e) = fs::remove_dir_all(&target_dir) {
        return ImportResult {
            success: false,
            skin_id: skin_id.clone(),
            message: format!("移除失败: {}", e),
        };
    }

    remove_from_catalog(&skins_dir, &skin_id);

    ImportResult {
        success: true,
        skin_id: skin_id.clone(),
        message: format!("已移除角色: {}", skin_id),
    }
}

fn remove_from_catalog(skins_dir: &Path, skin_id: &str) {
    let catalog_path = skins_dir.join("catalog.json");
    if !catalog_path.exists() {
        return;
    }

    let mut ids: Vec<String> = fs::read_to_string(&catalog_path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();

    ids.retain(|id| id != skin_id);

    if let Ok(json) = serde_json::to_string(&ids) {
        if let Err(e) = fs::write(&catalog_path, json) {
            eprintln!("skin: failed to write catalog.json: {}", e);
        }
    }
}

fn copy_dir_contents(src: &Path, dst: &Path) -> Result<(), std::io::Error> {
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let path = entry.path();
        let dest_path = dst.join(entry.file_name());

        if path.is_dir() {
            fs::create_dir_all(&dest_path)?;
            copy_dir_contents(&path, &dest_path)?;
        } else {
            fs::copy(&path, &dest_path)?;
        }
    }
    Ok(())
}

fn update_catalog(skins_dir: &Path, skin_id: &str) {
    let catalog_path = skins_dir.join("catalog.json");
    let mut ids: Vec<String> = if catalog_path.exists() {
        fs::read_to_string(&catalog_path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    } else {
        Vec::new()
    };

    if !ids.contains(&skin_id.to_string()) {
        ids.push(skin_id.to_string());
        if let Ok(json) = serde_json::to_string(&ids) {
            if let Err(e) = fs::write(&catalog_path, json) {
                eprintln!("skin: failed to write catalog.json: {}", e);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn write_valid_skin(dir: &Path) {
        fs::write(dir.join("idle.png"), b"fake png").unwrap();
        fs::write(dir.join("pet.png"), b"fake avatar").unwrap();
        fs::write(
            dir.join("skin.json"),
            r#"{
                "name": "Test Skin",
                "author": "Test Author",
                "format": "sprite",
                "size": { "width": 48, "height": 48 },
                "animations": {
                    "idle": { "file": "idle.png", "sprite": { "frameWidth": 48, "frameHeight": 48, "frameCount": 4, "columns": 4, "fps": 8 } }
                }
            }"#,
        )
        .unwrap();
    }

    #[test]
    fn validate_skin_dir_ok() {
        let tmp = TempDir::new().unwrap();
        write_valid_skin(tmp.path());
        let result = validate_skin_dir(tmp.path());
        assert!(result.is_ok());
        let manifest = result.unwrap();
        assert_eq!(manifest["name"], "Test Skin");
    }

    #[test]
    fn validate_skin_dir_missing_skin_json() {
        let tmp = TempDir::new().unwrap();
        let err = validate_skin_dir(tmp.path()).unwrap_err();
        assert!(err.contains("skin.json"));
    }

    #[test]
    fn validate_skin_dir_invalid_json() {
        let tmp = TempDir::new().unwrap();
        fs::write(tmp.path().join("skin.json"), "not json!!!").unwrap();
        let err = validate_skin_dir(tmp.path()).unwrap_err();
        assert!(err.contains("格式错误"));
    }

    #[test]
    fn validate_skin_dir_missing_required_field() {
        let tmp = TempDir::new().unwrap();
        fs::write(tmp.path().join("skin.json"), r#"{"name":"X"}"#).unwrap();
        let err = validate_skin_dir(tmp.path()).unwrap_err();
        assert!(err.contains("缺少必需字段"));
    }

    #[test]
    fn validate_skin_dir_empty_animations() {
        let tmp = TempDir::new().unwrap();
        fs::write(
            tmp.path().join("skin.json"),
            r#"{"name":"X","author":"A","format":"sprite","size":{"width":48,"height":48},"animations":{}}"#,
        )
        .unwrap();
        let err = validate_skin_dir(tmp.path()).unwrap_err();
        assert!(err.contains("至少需要定义一个动画状态"));
    }

    #[test]
    fn validate_skin_dir_missing_animation_file() {
        let tmp = TempDir::new().unwrap();
        fs::write(
            tmp.path().join("skin.json"),
            r#"{"name":"X","author":"A","format":"sprite","size":{"width":48,"height":48},"animations":{"idle":{"file":"missing.png"}}}"#,
        )
        .unwrap();
        let err = validate_skin_dir(tmp.path()).unwrap_err();
        assert!(err.contains("不存在"));
    }

    #[test]
    fn validate_skin_dir_missing_file_field() {
        let tmp = TempDir::new().unwrap();
        fs::write(
            tmp.path().join("skin.json"),
            r#"{"name":"X","author":"A","format":"sprite","size":{"width":48,"height":48},"animations":{"idle":{}}}"#,
        )
        .unwrap();
        let err = validate_skin_dir(tmp.path()).unwrap_err();
        assert!(err.contains("缺少 file 字段"));
    }

    #[test]
    fn copy_dir_contents_copies_files_and_subdirs() {
        let src = TempDir::new().unwrap();
        let dst = TempDir::new().unwrap();

        fs::write(src.path().join("a.txt"), "hello").unwrap();
        fs::create_dir(src.path().join("sub")).unwrap();
        fs::write(src.path().join("sub/b.txt"), "world").unwrap();

        copy_dir_contents(src.path(), dst.path()).unwrap();

        assert_eq!(
            fs::read_to_string(dst.path().join("a.txt")).unwrap(),
            "hello"
        );
        assert_eq!(
            fs::read_to_string(dst.path().join("sub/b.txt")).unwrap(),
            "world"
        );
    }

    #[test]
    fn update_catalog_creates_new() {
        let tmp = TempDir::new().unwrap();
        update_catalog(tmp.path(), "my-skin");
        let content = fs::read_to_string(tmp.path().join("catalog.json")).unwrap();
        let ids: Vec<String> = serde_json::from_str(&content).unwrap();
        assert_eq!(ids, vec!["my-skin"]);
    }

    #[test]
    fn update_catalog_appends() {
        let tmp = TempDir::new().unwrap();
        fs::write(tmp.path().join("catalog.json"), r#"["existing"]"#).unwrap();
        update_catalog(tmp.path(), "new-one");
        let content = fs::read_to_string(tmp.path().join("catalog.json")).unwrap();
        let ids: Vec<String> = serde_json::from_str(&content).unwrap();
        assert_eq!(ids, vec!["existing", "new-one"]);
    }

    #[test]
    fn update_catalog_no_duplicate() {
        let tmp = TempDir::new().unwrap();
        fs::write(tmp.path().join("catalog.json"), r#"["my-skin"]"#).unwrap();
        update_catalog(tmp.path(), "my-skin");
        let content = fs::read_to_string(tmp.path().join("catalog.json")).unwrap();
        let ids: Vec<String> = serde_json::from_str(&content).unwrap();
        assert_eq!(ids, vec!["my-skin"]);
    }

    #[test]
    fn remove_from_catalog_removes() {
        let tmp = TempDir::new().unwrap();
        fs::write(tmp.path().join("catalog.json"), r#"["a","b","c"]"#).unwrap();
        remove_from_catalog(tmp.path(), "b");
        let content = fs::read_to_string(tmp.path().join("catalog.json")).unwrap();
        let ids: Vec<String> = serde_json::from_str(&content).unwrap();
        assert_eq!(ids, vec!["a", "c"]);
    }

    #[test]
    fn remove_from_catalog_nonexistent_id() {
        let tmp = TempDir::new().unwrap();
        fs::write(tmp.path().join("catalog.json"), r#"["a","b"]"#).unwrap();
        remove_from_catalog(tmp.path(), "z");
        let content = fs::read_to_string(tmp.path().join("catalog.json")).unwrap();
        let ids: Vec<String> = serde_json::from_str(&content).unwrap();
        assert_eq!(ids, vec!["a", "b"]);
    }

    #[test]
    fn remove_from_catalog_no_file() {
        let tmp = TempDir::new().unwrap();
        remove_from_catalog(tmp.path(), "x");
        assert!(!tmp.path().join("catalog.json").exists());
    }

    #[test]
    fn builtin_skins_contains_expected() {
        assert!(BUILTIN_SKINS.contains(&"vita"));
        assert!(BUILTIN_SKINS.contains(&"doux"));
        assert!(BUILTIN_SKINS.contains(&"line"));
        assert!(!BUILTIN_SKINS.contains(&"custom-uploaded"));
    }
}
