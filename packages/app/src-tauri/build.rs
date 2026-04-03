use std::fs;
use std::io::Write;
use std::path::Path;

fn main() {
    let skins_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join("public")
        .join("skins");

    let mut ids: Vec<String> = Vec::new();
    if let Ok(entries) = fs::read_dir(&skins_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() && path.join("skin.json").exists() {
                if let Some(name) = entry.file_name().to_str() {
                    ids.push(name.to_string());
                }
            }
        }
    }
    ids.sort();

    let out_dir = std::env::var("OUT_DIR").unwrap();
    let dest = Path::new(&out_dir).join("builtin_skins.rs");
    let mut f = fs::File::create(dest).unwrap();
    write!(
        f,
        "const BUILTIN_SKIN_IDS: &[&str] = &[{}];",
        ids.iter()
            .map(|id| format!("\"{}\"", id))
            .collect::<Vec<_>>()
            .join(", ")
    )
    .unwrap();

    println!("cargo:rerun-if-changed=../public/skins");

    tauri_build::build()
}
