use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::Mutex;
use std::{fs, io::Write};
use tauri::{AppHandle, Manager};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;
const SIDECAR_PORT: &str = "8000";

static SIDECAR_CHILD: Mutex<Option<Child>> = Mutex::new(None);

pub fn start_sidecar(app: AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    {
        let mut guard = SIDECAR_CHILD
            .lock()
            .map_err(|_| "Failed to lock sidecar process state")?;

        if let Some(child) = guard.as_mut() {
            if child.try_wait()?.is_none() {
                return Ok(());
            }

            *guard = None;
        }
    }

    start_sidecar_internal(&app)
}

fn start_sidecar_internal(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let port = SIDECAR_PORT;
    let mut command = if cfg!(debug_assertions) {
        let project_root = resolve_project_root()?;
        println!("Starting sidecar in debug mode using npm.cmd dev server...");
        let mut cmd = Command::new("cmd");
        cmd.args(["/C", "npm.cmd", "run", "dev", "--prefix", "sidecar"]);
        cmd.current_dir(&project_root);
        cmd.env("NODE_ENV", "development");
        cmd.env("PORT", port);
        cmd
    } else {
        let sidecar_index = normalize_windows_path(resolve_sidecar_entry(app)?);
        let sidecar_working_dir = sidecar_index
            .parent()
            .map(PathBuf::from)
            .ok_or("Unable to determine sidecar working directory")?;
        let node_path = normalize_windows_path(resolve_node_runtime(app));

        println!("Starting sidecar with node: {}", node_path.display());
        println!("Sidecar index: {}", sidecar_index.display());
        println!("Sidecar working directory: {}", sidecar_working_dir.display());

        let mut cmd = Command::new(node_path);
        cmd.arg("--no-deprecation");
        cmd.arg(sidecar_index);
        cmd.current_dir(sidecar_working_dir);
        cmd.env("NODE_ENV", "production");
        cmd.env("PORT", port);
        apply_windows_sidecar_flags(&mut cmd);
        cmd
    };

    let mut child = command.spawn()?;
    write_bridge_file(app, port)?;

    if let Err(error) = wait_for_sidecar_ready(port) {
        let _ = child.kill();
        let _ = child.wait();
        return Err(error);
    }

    let mut guard = SIDECAR_CHILD
        .lock()
        .map_err(|_| "Failed to lock sidecar process state")?;
    *guard = Some(child);

    Ok(())
}

pub fn shutdown_sidecar() -> Result<(), Box<dyn std::error::Error>> {
    let _ = request_sidecar_shutdown(SIDECAR_PORT);
    stop_sidecar_process()
}

fn write_bridge_file(app: &AppHandle, port: &str) -> Result<(), Box<dyn std::error::Error>> {
    let app_local_data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|_| "Unable to resolve app local data directory")?;
    let bridge_dir = app_local_data_dir.join("bridge");
    let bridge_file = bridge_dir.join("sidecar.json");

    fs::create_dir_all(&bridge_dir)?;
    let payload = serde_json::json!({
        "origin": format!("http://127.0.0.1:{port}"),
        "port": port.parse::<u16>().unwrap_or(8000),
    });
    let mut file = fs::File::create(&bridge_file)?;
    file.write_all(payload.to_string().as_bytes())?;

    println!("Wrote sidecar bridge file: {}", bridge_file.display());
    Ok(())
}

fn request_sidecar_shutdown(port: &str) -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_millis(800))
        .build()?;

    let _ = client
        .post(format!("http://127.0.0.1:{port}/api/system/shutdown"))
        .send();

    std::thread::sleep(std::time::Duration::from_millis(250));
    Ok(())
}

fn stop_sidecar_process() -> Result<(), Box<dyn std::error::Error>> {
    let mut guard = SIDECAR_CHILD
        .lock()
        .map_err(|_| "Failed to lock sidecar process state")?;

    if let Some(child) = guard.as_mut() {
        if child.try_wait()?.is_none() {
            kill_sidecar_child(child)?;
        }
    }

    *guard = None;
    Ok(())
}

fn kill_sidecar_child(child: &mut Child) -> Result<(), Box<dyn std::error::Error>> {
    if child.try_wait()?.is_some() {
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("taskkill")
            .args(["/PID", &child.id().to_string(), "/T", "/F"])
            .status();
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = child.kill();
    }

    let _ = child.wait();
    Ok(())
}

fn wait_for_sidecar_ready(port: &str) -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_millis(800))
        .build()?;
    let health_url = format!("http://127.0.0.1:{port}/health");
    let startup_timeout = std::time::Duration::from_secs(15);
    let deadline = std::time::Instant::now() + startup_timeout;

    while std::time::Instant::now() < deadline {
        if let Ok(response) = client.get(&health_url).send() {
            if response.status().is_success() {
                println!("Sidecar became ready at {}", health_url);
                return Ok(());
            }
        }

        std::thread::sleep(std::time::Duration::from_millis(250));
    }

    Err(format!(
        "Sidecar did not respond on {} within {} seconds",
        health_url,
        startup_timeout.as_secs()
    )
    .into())
}

fn resolve_project_root() -> Result<PathBuf, Box<dyn std::error::Error>> {
    Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .canonicalize()?)
}

fn resolve_sidecar_entry(app: &AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("_up_").join("sidecar").join("dist").join("index.cjs"));
        candidates.push(resource_dir.join("_up_").join("sidecar").join("dist").join("sidecar").join("src").join("index.js"));
        candidates.push(resource_dir.join("_up_").join("sidecar").join("dist").join("index.js"));
        candidates.push(resource_dir.join("sidecar").join("dist").join("index.cjs"));
        candidates.push(resource_dir.join("sidecar").join("dist").join("sidecar").join("src").join("index.js"));
        candidates.push(resource_dir.join("sidecar").join("dist").join("index.js"));
        candidates.push(resource_dir.join("dist").join("index.cjs"));
        candidates.push(resource_dir.join("dist").join("sidecar").join("src").join("index.js"));
        candidates.push(resource_dir.join("dist").join("index.js"));
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("_up_").join("sidecar").join("dist").join("index.cjs"));
            candidates.push(
                exe_dir
                    .join("_up_")
                    .join("sidecar")
                    .join("dist")
                    .join("sidecar")
                    .join("src")
                    .join("index.js"),
            );
            candidates.push(exe_dir.join("_up_").join("sidecar").join("dist").join("index.js"));
            candidates.push(exe_dir.join("sidecar").join("dist").join("index.cjs"));
            candidates.push(
                exe_dir
                    .join("sidecar")
                    .join("dist")
                    .join("sidecar")
                    .join("src")
                    .join("index.js"),
            );
            candidates.push(exe_dir.join("sidecar").join("dist").join("index.js"));
            candidates.push(
                exe_dir
                    .join("..")
                    .join("..")
                    .join("..")
                    .join("_up_")
                    .join("sidecar")
                    .join("dist")
                    .join("index.cjs"),
            );
            candidates.push(
                exe_dir
                    .join("..")
                    .join("..")
                    .join("..")
                    .join("_up_")
                    .join("sidecar")
                    .join("dist")
                    .join("sidecar")
                    .join("src")
                    .join("index.js"),
            );
            candidates.push(
                exe_dir
                    .join("..")
                    .join("..")
                    .join("..")
                    .join("_up_")
                    .join("sidecar")
                    .join("dist")
                    .join("index.js"),
            );
            candidates.push(
                exe_dir
                    .join("..")
                    .join("..")
                    .join("..")
                    .join("sidecar")
                    .join("dist")
                    .join("index.cjs"),
            );
            candidates.push(
                exe_dir
                    .join("..")
                    .join("..")
                    .join("..")
                    .join("sidecar")
                    .join("dist")
                    .join("sidecar")
                    .join("src")
                    .join("index.js"),
            );
            candidates.push(
                exe_dir
                    .join("..")
                    .join("..")
                    .join("..")
                    .join("sidecar")
                    .join("dist")
                    .join("index.js"),
            );
        }
    }

    if let Some(found) = candidates.iter().find(|path| path.exists()) {
        return Ok(found.clone());
    }

    let attempted = candidates
        .iter()
        .map(|path| path.display().to_string())
        .collect::<Vec<_>>()
        .join(", ");
    Err(format!("Unable to locate sidecar entry for production launch. Checked: {attempted}").into())
}

fn resolve_node_runtime(app: &AppHandle) -> PathBuf {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("node.exe"));
        candidates.push(resource_dir.join("node"));
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("node.exe"));
            candidates.push(exe_dir.join("node"));
        }
    }

    candidates.push(PathBuf::from("node"));

    candidates
        .into_iter()
        .find(|path| path == Path::new("node") || path.exists())
        .unwrap_or_else(|| PathBuf::from("node"))
}

fn normalize_windows_path(path: PathBuf) -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let display = path.to_string_lossy();
        if let Some(stripped) = display.strip_prefix(r"\\?\") {
            return PathBuf::from(stripped);
        }
    }

    path
}

fn apply_windows_sidecar_flags(command: &mut Command) {
    #[cfg(target_os = "windows")]
    {
        command.creation_flags(CREATE_NO_WINDOW);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sidecar_paths() {
        let test_dir = PathBuf::from(".").join("sidecar").join("dist");
        assert!(test_dir.ends_with("sidecar/dist"));
    }

    #[test]
    fn test_normalize_windows_path() {
        let raw = PathBuf::from(r"\\?\C:\launcher\sidecar\dist\index.js");
        let normalized = normalize_windows_path(raw);
        assert_eq!(normalized, PathBuf::from(r"C:\launcher\sidecar\dist\index.js"));
    }
}
