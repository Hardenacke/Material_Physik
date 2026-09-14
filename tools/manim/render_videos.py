"""Render declared Manim videos and publish complete MP4s beside their sources."""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[2]


def local_file(folder: Path, name: str) -> Path:
    target = (folder / name).resolve()
    if target.parent != folder.resolve():
        raise ValueError(f"Datei muss direkt im Videoordner liegen: {name}")
    return target


def render(metadata_path: Path, preview: bool) -> None:
    import av
    import imageio_ffmpeg
    from manim import tempconfig

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    folder = metadata_path.parent
    source = local_file(folder, metadata["source"])
    destination = local_file(folder, metadata["output"])
    if source.suffix != ".py" or destination.suffix != ".mp4":
        raise ValueError("Quelltext muss .py und Ausgabe muss .mp4 sein.")
    cache = ROOT / ".build" / "manim" / folder.name
    cache.mkdir(parents=True, exist_ok=True)
    if preview:
        destination = cache / "vorschau.mp4"

    spec = importlib.util.spec_from_file_location("video_scene", source)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    scene_type = getattr(module, metadata["scene"])
    settings = metadata.get("render", {})
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

    # Each scene runs in a separate process and each render uses a fresh directory.
    with tempfile.TemporaryDirectory(prefix="lauf_", dir=cache) as work:
        with tempconfig({
            "renderer": "cairo", "media_dir": work,
            "output_file": source.stem, "format": "mp4",
            "pixel_width": 854 if preview else settings.get("pixel_width", 1920),
            "pixel_height": 480 if preview else settings.get("pixel_height", 1080),
            "frame_rate": 15 if preview else settings.get("frame_rate", 30),
            "frame_width": 16, "frame_height": 9,
            "write_to_movie": True, "save_last_frame": False,
            "preview": False, "disable_caching": True,
            "verbosity": "WARNING", "progress_bar": "none",
        }):
            scene = scene_type()
            scene.render()
            movie = Path(scene.renderer.file_writer.movie_file_path)

        ready = Path(work) / "fertig.mp4"
        # Put MP4 metadata first so Pages can start playback before full download.
        subprocess.run([
            ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(movie), "-map", "0:v:0", "-an", "-c:v", "copy",
            "-movflags", "+faststart", str(ready),
        ], check=True)
        with av.open(str(ready)) as container:
            stream = container.streams.video[0]
            if stream.codec_context.name != "h264" or stream.pix_fmt != "yuv420p":
                raise RuntimeError("Erwartet wird H.264 mit yuv420p für den Browser.")
            duration = float(stream.duration * stream.time_base)
            if duration <= 0 or next(container.decode(video=0), None) is None:
                raise RuntimeError("Kein lesbares Video erzeugt.")
            measured = {
                "duration_seconds": round(duration, 3),
                "pixel_width": stream.width, "pixel_height": stream.height,
                "frame_rate": float(stream.average_rate),
                "codec": "h264", "pixel_format": "yuv420p",
                "size_bytes": ready.stat().st_size,
            }

        # Atomic replacement; previous final remains available after render failure.
        with tempfile.NamedTemporaryFile(dir=destination.parent, suffix=".mp4",
                                         prefix=".pending_", delete=False) as pending:
            pending_path = Path(pending.name)
        try:
            import shutil
            shutil.copyfile(ready, pending_path)
            pending_path.replace(destination)
        finally:
            pending_path.unlink(missing_ok=True)

        if not preview:
            topic = folder.parents[2]
            poster = topic / "bilder" / "erklaervideos" / f"_{source.stem}.jpg"
            poster.parent.mkdir(parents=True, exist_ok=True)
            moment = min(float(metadata.get("poster_seconds", duration / 2)), duration - 0.1)
            subprocess.run([
                ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
                "-ss", str(max(0, moment)), "-i", str(destination),
                "-frames:v", "1", "-vf", "scale=960:-2", "-q:v", "3", str(poster),
            ], check=True)
            metadata["poster"] = Path(os.path.relpath(poster, folder)).as_posix()
            metadata["status"] = "gerendert"
            metadata["measured"] = measured
            metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
                                     encoding="utf-8")
        print(f"Fertig: {destination.relative_to(ROOT)} ({duration:.1f} s)", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preview", action="store_true", help="480p-Vorschau nur unter .build")
    parser.add_argument("--only", help="Videoordner, z. B. reflexion-und-brechung")
    parser.add_argument("--worker", type=Path, help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.worker:
        render(args.worker, args.preview)
        return
    manifests = sorted(ROOT.glob("*/*/lernmaterial/erklaervideos/*/video.json"))
    if args.only:
        manifests = [item for item in manifests if item.parent.name == args.only]
    if not manifests:
        parser.error("Keine passenden video.json-Dateien gefunden.")
    for manifest in manifests:
        print(f"Rendere {manifest.parent.relative_to(ROOT)} …", flush=True)
        command = [sys.executable, str(Path(__file__).resolve()), "--worker", str(manifest)]
        if args.preview:
            command.append("--preview")
        subprocess.run(command, cwd=ROOT, check=True)


if __name__ == "__main__":
    main()
