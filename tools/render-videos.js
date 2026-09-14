const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const windows = process.platform === "win32";
const python = process.env.MANIM_PYTHON || path.join(
  root, ".venv-manim", windows ? "Scripts/python.exe" : "bin/python"
);
if (!fs.existsSync(python)) {
  console.error("Manim-Umgebung fehlt. Einrichtung: tools/manim/README.md");
  process.exit(1);
}
function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root, stdio: "inherit", env: { ...process.env, PYTHONUTF8: "1" }
  });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}
const args = process.argv.slice(2);
run(python, [path.join(__dirname, "manim/render_videos.py"), ...args]);
if (!args.includes("--preview")) {
  run(process.execPath, [path.join(__dirname, "build-catalog.js")]);
  run(process.execPath, [path.join(__dirname, "prepare-site.js")]);
}
