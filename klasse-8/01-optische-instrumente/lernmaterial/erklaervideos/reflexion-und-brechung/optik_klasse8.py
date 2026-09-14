"""
Optik, Klasse 8: Reflexion, Spiegelbild und Brechung an einer Sammellinse.

Voraussetzung: Manim Community Edition.
Keine LaTeX-Installation und keine externen Bilddateien erforderlich.

Start in VS Code:
    python optik_klasse8.py --preview
    python optik_klasse8.py
    python optik_klasse8.py --pause 3

Endfassung: optik_klasse8.mp4 neben diesem Skript.
Vorschau und Zwischendateien: .build/manim/optik_klasse8/
Projektwurzel: nächster übergeordneter Ordner mit .git, sonst Skriptordner.

Fachliche Modelle:
- Ebener Spiegel; gestrichelte Linien sind virtuelle Verlängerungen.
- Luft -> Glas: n_Luft = 1.0, n_Glas = 1.5.
- Ideale dünne Sammellinse: f = 12 cm, g = 30 cm, G = 9 cm.
  Daraus folgen b = 20 cm und ein umgekehrtes Bild mit Höhe 6 cm.

Stand: 14.09.2026. Syntax und Geometrie geprüft; noch nicht mit Manim gerendert.
"""

from pathlib import Path
import argparse
import shutil
import tempfile

import numpy as np
from manim import *


BG = "#111827"
FG = "#F1F5F9"
MUTED = "#94A3B8"
OBJECT = "#FBBF24"
IMAGE = "#D8B4FE"
RAY1 = "#67E8F9"
RAY2 = "#86EFAC"
RAY3 = "#FDBA74"

config.background_color = BG
config.frame_width = 16
config.frame_height = 9


def p(x, y):
    return np.array([float(x), float(y), 0.0])


def label(text, x, y, size=28, color=FG, width=14.2, backing=False):
    """Text ohne LaTeX; bei Bedarf auf verfügbare Breite begrenzen."""
    obj = Text(text, font_size=size, color=color, line_spacing=0.9)
    if obj.width > width:
        obj.scale_to_fit_width(width)
    obj.move_to(p(x, y))
    if backing:
        obj.add_background_rectangle(color=BG, opacity=0.95, buff=0.06)
    return obj.set_z_index(10)


def ray(start, end, color=RAY1):
    """Durchgehender Lichtstrahl mit Richtungspfeil auf der Strecke."""
    start, end = np.array(start), np.array(end)
    direction = end - start
    direction = direction / np.linalg.norm(direction)
    normal = p(-direction[1], direction[0])
    tip = start + 0.60 * (end - start)
    arrowhead = Polygon(
        tip,
        tip - 0.18 * direction + 0.075 * normal,
        tip - 0.18 * direction - 0.075 * normal,
        stroke_width=0, fill_color=color, fill_opacity=1,
    )
    return VGroup(
        Line(start, end, color=color, stroke_width=4),
        arrowhead,
    ).set_z_index(3)


def object_arrow(base, tip, color):
    return Arrow(
        base, tip, buff=0, color=color,
        stroke_width=7, tip_length=0.23,
        max_tip_length_to_length_ratio=0.3,
    ).set_z_index(5)


def dimension(x1, x2, y, text, color=MUTED):
    """Waagerechte Abstandsmarkierung mit Beschriftung."""
    return VGroup(
        DoubleArrow(
            p(x1, y), p(x2, y), buff=0,
            color=color, stroke_width=2, tip_length=0.11,
        ),
        Line(p(x1, y - 0.10), p(x1, y + 0.10), color=color),
        Line(p(x2, y - 0.10), p(x2, y + 0.10), color=color),
        label(text, (x1 + x2) / 2, y - 0.30,
              size=25, color=color, width=abs(x2 - x1) + 0.2),
    )


class OptikKlasse8(Scene):
    pause = 2.5

    def construct(self):
        self.reflexion()
        self.brechung()
        self.sammellinse()
        self.abschluss()

    def page(self, title, subtitle=""):
        """Neue Szene mit festem Titel und Erklärleiste."""
        if self.mobjects:
            self.play(
                *[FadeOut(m) for m in list(self.mobjects)],
                run_time=0.5,
            )
        self.clear()
        self.caption = None
        self.add(
            RoundedRectangle(
                width=15, height=0.9, corner_radius=0.12,
                stroke_color="#334155", stroke_width=1,
                fill_color="#1E293B", fill_opacity=1,
            ).move_to(p(0, -3.8)).set_z_index(20)
        )
        self.play(FadeIn(label(title, 0, 3.95, 40)), run_time=0.5)
        if subtitle:
            self.add(label(subtitle, 0, 3.3, 23, MUTED))

    def step(self, text, *animations, duration=1.0, hold=None):
        """Ein Konstruktionsschritt mit anschließender Denkpause."""
        note = label(text, 0, -3.8, 28).set_z_index(21)
        if note.height > 0.70:
            note.scale_to_fit_height(0.70)
        if self.caption is None:
            self.play(FadeIn(note), run_time=0.3)
        else:
            self.play(FadeOut(self.caption), FadeIn(note), run_time=0.3)
        self.caption = note
        if animations:
            self.play(*animations, run_time=duration, rate_func=linear)
        self.wait(self.pause if hold is None else hold)

    def reflexion(self):
        self.page("1 | Reflexion und Spiegelbild")
        base = p(-4, -1)
        tip = p(-4, 1.4)
        image_tip = p(4, 1.4)
        hit1, hit2 = p(0, -0.4), p(0, 1.9)

        mirror = VGroup(
            Line(p(0, -2.25), p(0, 2.65), color=FG, stroke_width=6),
            *[
                Line(p(0, y), p(0.20, y + 0.16),
                     color=MUTED, stroke_width=2)
                for y in np.arange(-2.15, 2.5, 0.28)
            ],
            label("ebener Spiegel", 0, 2.95, 28),
        )
        self.step("Wir zeichnen den Spiegel als gerade Linie.", Create(mirror))

        obj = object_arrow(base, tip, OBJECT)
        self.step(
            "Der Pfeil stellt einen Gegenstand vor dem Spiegel dar.",
            GrowArrow(obj),
            FadeIn(label("Gegenstand", -4, -1.4, color=OBJECT, width=3.4)),
        )

        def reflected_end(hit):
            incident = hit - tip
            incident /= np.linalg.norm(incident)
            normal = RIGHT
            reflected = incident - 2 * np.dot(incident, normal) * normal
            return hit + ((-4.6 - hit[0]) / reflected[0]) * reflected

        self.step(
            "Von der Gegenstandsspitze trifft ein Lichtstrahl auf den Spiegel.",
            Create(ray(tip, hit1)),
            FadeIn(Dot(hit1, radius=0.06, color=FG).set_z_index(6)),
        )

        normal = VGroup(
            DashedLine(p(-2.5, hit1[1]), p(0.9, hit1[1]),
                       color=MUTED, dash_length=0.12),
            label("Lot", -3.05, hit1[1], 27, MUTED, backing=True),
            VMobject(color=MUTED).set_points_as_corners([
                hit1 + p(0.28, 0),
                hit1 + p(0.28, 0.28),
                hit1 + p(0, 0.28),
            ]),
        )
        self.step(
            "Das Lot steht am Auftreffpunkt senkrecht auf dem Spiegel.",
            Create(normal),
        )
        self.step(
            "Der Lichtstrahl wird zurück in den Raum reflektiert.",
            Create(ray(hit1, reflected_end(hit1))),
        )

        angle = np.arctan2(tip[1] - hit1[1], hit1[0] - tip[0])
        alpha_pos = hit1 + 1.60 * p(-np.cos(angle / 2), np.sin(angle / 2))
        beta_pos = hit1 + 1.60 * p(-np.cos(angle / 2), -np.sin(angle / 2))
        angles = VGroup(
            Arc(radius=0.90, start_angle=PI - angle, angle=angle,
                arc_center=hit1, color=RAY1),
            Arc(radius=0.90, start_angle=PI, angle=angle,
                arc_center=hit1, color=RAY1),
            label("α", alpha_pos[0], alpha_pos[1], 31, RAY1),
            label("β", beta_pos[0], beta_pos[1], 31, RAY1),
        )
        self.step("Beide Winkel messen wir zwischen Strahl und Lot.",
                  Create(angles))

        law = VGroup(
            label("Reflexionsgesetz", 4.15, 2.0, 32, width=5.5),
            label("α = β", 4.15, 1.25, 54, RAY1),
            label("Einfallswinkel = Reflexionswinkel",
                  4.15, 0.50, 25, width=5.5),
            label("Strahlen und Lot liegen\nin einer Ebene.",
                  4.15, -0.40, 27, width=5.5),
        )
        self.step(
            "Das Reflexionsgesetz bestimmt die Richtung des reflektierten Strahls.",
            FadeIn(law), hold=3,
        )

        self.step(
            "Für das Bild betrachten wir einen zweiten Strahl derselben Spitze.",
            FadeOut(law), FadeOut(normal), FadeOut(angles),
            Create(ray(tip, hit2, RAY2)),
        )
        self.step(
            "Auch dieser Strahl wird nach dem Reflexionsgesetz reflektiert.",
            Create(ray(hit2, reflected_end(hit2), RAY2)),
        )

        extensions = VGroup(
            DashedLine(hit1, image_tip, color=RAY1, dash_length=0.14),
            DashedLine(hit2, image_tip, color=RAY2, dash_length=0.14),
        ).set_opacity(0.75)
        self.step(
            "Wir verlängern die reflektierten Strahlen rückwärts.\n"
            "Die gestrichelten Linien sind nur Konstruktionshilfen.",
            Create(extensions),
        )
        self.step(
            "Ihr Schnittpunkt ist die virtuelle Bildspitze hinter dem Spiegel.",
            FadeIn(Dot(image_tip, radius=0.07, color=IMAGE).set_z_index(6)),
            GrowArrow(object_arrow(p(4, -1), image_tip, IMAGE)),
            FadeIn(label("virtuelles Bild", 4, -1.4,
                         color=IMAGE, width=3.4)),
        )
        self.step(
            "Das Bild ist aufrecht, gleich groß und gleich weit vom Spiegel entfernt.",
            Create(dimension(-4, 0, -2.75, "Abstand g")),
            Create(dimension(0, 4, -2.75, "Abstand b")),
        )
        self.step(
            "Merke: g = b. Vom virtuellen Bild geht kein Licht aus.\n"
            "Es lässt sich dort nicht auf einem Schirm auffangen.",
            hold=3,
        )

    def brechung(self):
        self.page("2 | Lichtbrechung", "Zuerst: ein Lichtstrahl trifft von Luft auf Glas")
        hit = p(-1.2, 0.4)
        alpha = 45 * DEGREES
        # Snellius: n_Luft * sin(alpha) = n_Glas * sin(beta).
        beta = np.arcsin(np.sin(alpha) / 1.5)
        incident = p(np.sin(alpha), -np.cos(alpha))
        refracted = p(np.sin(beta), -np.cos(beta))
        start = hit - 3.3 * incident
        end = hit + 2.9 * refracted

        glass = Rectangle(
            width=8.2, height=2.8, stroke_width=0,
            fill_color="#2563EB", fill_opacity=0.18,
        ).move_to(p(-2.1, -1.0)).set_z_index(-2)
        interface = Line(p(-6.2, 0.4), p(2.0, 0.4), color=FG)
        self.step(
            "Der Aufbau besteht aus Lichtquelle und Glaskörper.",
            FadeIn(glass), Create(interface),
            FadeIn(label("Luft", -5, 1.6, 30)),
            FadeIn(label("Glas", -5, -1.1, 30)),
            FadeIn(Dot(start, radius=0.10, color=OBJECT)),
            FadeIn(label("Lichtquelle", start[0] - 1.5, start[1],
                         23, OBJECT, width=2.0)),
        )
        normal = VGroup(
            DashedLine(hit + 2.35 * DOWN, hit + 2.35 * UP,
                       color=MUTED, dash_length=0.12),
            label("Lot", hit[0] + 0.42, 2.7, 26, MUTED),
        )
        self.step("Wir zeichnen wieder das Lot an der Auftreffstelle.",
                  Create(normal))
        self.step("Der Lichtstrahl trifft schräg auf die Glasoberfläche.",
                  Create(ray(start, hit)))

        continuation = DashedLine(
            hit, hit + 2.9 * incident,
            color=MUTED, dash_length=0.14,
        ).set_opacity(0.6)
        self.step(
            "Gestrichelt: So würde der Strahl ohne Ablenkung weiterlaufen.",
            Create(continuation),
        )
        reflected = ray(hit, hit + 2.5 * p(np.sin(alpha), np.cos(alpha)))
        reflected.set_opacity(0.30)
        self.step(
            "Im Glas verläuft der gebrochene Strahl näher am Lot.\n"
            "Ein kleiner Lichtanteil wird zusätzlich reflektiert.",
            Create(ray(hit, end)), Create(reflected),
        )
        alpha_pos = hit + 1.18 * p(-np.sin(alpha / 2), np.cos(alpha / 2))
        beta_pos = hit + 1.25 * p(np.sin(beta / 2), -np.cos(beta / 2))
        angles = VGroup(
            Arc(radius=0.75, start_angle=PI / 2, angle=alpha,
                arc_center=hit, color=RAY1),
            Arc(radius=0.75, start_angle=-PI / 2, angle=beta,
                arc_center=hit, color=RAY1),
            label("α", alpha_pos[0], alpha_pos[1], 31, RAY1),
            label("β", beta_pos[0], beta_pos[1], 31, RAY1),
            label("α = 45°", 4.65, 1.8, 33, width=4.8),
            label(f"β ≈ {np.degrees(beta):.0f}°", 4.65, 1.15, 33, RAY1),
        )
        self.step("Auch bei der Brechung werden die Winkel zum Lot gemessen.",
                  Create(angles))
        self.step(
            "Merke: Beim schrägen Übergang von Luft in Glas\n"
            "wird Licht zum Lot hin gebrochen.",
            FadeIn(label("Luft → Glas\nzum Lot hin", 4.65, -0.05,
                         34, RAY1, width=4.8)),
            FadeIn(label("In Glas breitet sich\nLicht langsamer aus.",
                         4.65, -1.55, 27, width=4.8)),
            hold=3,
        )

    def sammellinse(self):
        self.page(
            "3 | Bildkonstruktion an der Sammellinse",
            "Vereinfachte Konstruktion mit einer dünnen Linse",
        )

        # Alle Koordinaten folgen derselben Linsengleichung.
        f_cm, g_cm, height_cm = 12.0, 30.0, 9.0
        b_cm = f_cm * g_cm / (g_cm - f_cm)
        scale = 0.16
        f, g, b, height = scale * np.array([f_cm, g_cm, b_cm, height_cm])
        axis_y = 0.2
        center = p(0, axis_y)
        tip = p(-g, axis_y + height)
        image_tip = p(b, axis_y - height * b / g)
        parallel_hit = p(0, tip[1])
        focal_hit = p(0, axis_y - height * f / (g - f))

        axis = Line(p(-6.5, axis_y), p(6.5, axis_y),
                    color=MUTED, stroke_width=2)
        lens = Ellipse(
            width=0.48, height=4.2,
            stroke_color=RAY1, stroke_width=3,
            fill_color=RAY1, fill_opacity=0.12,
        ).move_to(center)
        screen = Line(p(b, -1.8), p(b, 1.9),
                      color=MUTED, stroke_width=8)

        self.step(
            "Versuchsaufbau: beleuchteter Gegenstand, Sammellinse und Schirm.",
            Create(axis), Create(lens), Create(screen),
            FadeIn(label("Sammellinse", 0, 2.65, 29, RAY1, width=3.5)),
            FadeIn(label("Schirm", b, 2.30, 28)),
            FadeIn(label("optische Achse", 5.2, 0.60,
                         24, MUTED, width=2.7)),
        )
        self.step(
            "Wir zeichnen den Gegenstand als aufrechten Pfeil.",
            GrowArrow(object_arrow(p(-g, axis_y), tip, OBJECT)),
            FadeIn(label("Gegenstand", -g, 2.30,
                         28, OBJECT, width=3.5)),
            FadeIn(label(f"G = {height_cm:g} cm", -g, -0.30,
                         25, OBJECT, width=3)),
        )

        focus_points = VGroup(
            Dot(p(-f, axis_y), radius=0.065, color=RAY1),
            Dot(p(f, axis_y), radius=0.065, color=RAY1),
            label("F₁", -f, axis_y - 0.52, 26, RAY1),
            label("F₂", f, axis_y + 0.52, 26, RAY1),
        )
        self.step(
            "Beide Brennpunkte liegen im gleichen Abstand von der Linse.",
            FadeIn(focus_points),
            Create(dimension(0, f, -2.80, f"f = {f_cm:g} cm", RAY1)),
        )
        self.step(
            "Die Gegenstandsweite g ist der Abstand vom Gegenstand zur Linse.",
            Create(dimension(-g, 0, -2.05, f"g = {g_cm:g} cm")),
        )
        self.step(
            "1. Parallelstrahl: von der Pfeilspitze parallel zur optischen Achse.",
            Create(ray(tip, parallel_hit, RAY1)),
        )
        self.step(
            "Hinter der Sammellinse verläuft er durch den rechten Brennpunkt F₂.",
            Create(ray(parallel_hit, image_tip, RAY1)),
        )
        self.step(
            "2. Mittelpunktstrahl: Er trifft die Mitte der dünnen Linse.",
            Create(ray(tip, center, RAY2)),
        )
        self.step(
            "Im Modell der dünnen Linse verläuft dieser Strahl gerade weiter.",
            Create(ray(center, image_tip, RAY2)),
        )
        self.step(
            "3. Brennpunktstrahl: Er verläuft zuerst durch den linken Brennpunkt F₁.",
            Create(ray(tip, focal_hit, RAY3)),
        )
        self.step(
            "Hinter der Sammellinse verläuft er parallel zur optischen Achse.",
            Create(ray(focal_hit, image_tip, RAY3)),
        )
        self.step(
            "Die Strahlen treffen sich in der Bildspitze auf dem Schirm.",
            FadeIn(Dot(image_tip, radius=0.08, color=IMAGE).set_z_index(7)),
            GrowArrow(object_arrow(p(b, axis_y), image_tip, IMAGE)),
            FadeIn(label(
                f"Bild\nB = {height_cm * b_cm / g_cm:g} cm",
                5.1, -0.75, 29, IMAGE, width=3.0,
            )),
        )
        self.step(
            "Die Bildweite b ist der Abstand zwischen Linse und scharfem Bild.",
            Create(dimension(0, b, -2.05, f"b = {b_cm:g} cm")),
        )
        self.step(
            "Hier entsteht ein umgekehrtes, verkleinertes, reelles Bild.\n"
            "Wir können es auf einem Schirm auffangen.",
            hold=3,
        )

    def abschluss(self):
        self.page("Merke")
        self.step(
            "Reflexion und Brechung verändern den Weg des Lichts.",
            FadeIn(label("Spiegel: Einfallswinkel = Reflexionswinkel.",
                         0, 2.05, 34)),
            FadeIn(label("Beide Winkel werden zum Lot gemessen.",
                         0, 1.25, 30, MUTED)),
            hold=3,
        )
        self.step(
            "Die Sammellinse nutzt die Lichtbrechung zur Bildentstehung.",
            FadeIn(label("Brechung: Beim schrägen Übergang von Luft in Glas",
                         0, -0.2, 32, RAY1)),
            FadeIn(label("wird Licht zum Lot hin abgelenkt.",
                         0, -1.0, 34, RAY1)),
            hold=3,
        )


def main():
    parser = argparse.ArgumentParser(description="Optik-Erklärvideo rendern")
    parser.add_argument("--preview", action="store_true",
                        help="Schnelle Vorschau mit 854 x 480 Pixeln")
    parser.add_argument("--pause", type=float, default=2.5,
                        help="Pause zwischen Konstruktionsschritten in Sekunden")
    args = parser.parse_args()
    if not np.isfinite(args.pause) or args.pause <= 0:
        parser.error("--pause muss eine positive Zahl sein.")

    script = Path(__file__).resolve()
    root = next(
        (folder for folder in script.parents if (folder / ".git").exists()),
        script.parent,
    )
    cache = root / ".build" / "manim" / "optik_klasse8"
    cache.mkdir(parents=True, exist_ok=True)
    destination = cache / "vorschau.mp4" if args.preview else script.with_suffix(".mp4")
    OptikKlasse8.pause = args.pause

    # Eigener Ordner pro Lauf: Kein altes Video wird als neues Ergebnis übernommen.
    with tempfile.TemporaryDirectory(prefix="lauf_", dir=cache) as work:
        with tempconfig({
            "renderer": "cairo",
            "media_dir": work,
            "output_file": "optik_klasse8",
            "format": "mp4",
            "pixel_width": 854 if args.preview else 1920,
            "pixel_height": 480 if args.preview else 1080,
            "frame_rate": 15 if args.preview else 30,
            "frame_width": 16,
            "frame_height": 9,
            "write_to_movie": True,
            "save_last_frame": False,
            "preview": False,
            "disable_caching": True,
        }):
            scene = OptikKlasse8()
            scene.render()
            movie = Path(scene.renderer.file_writer.movie_file_path)
            if not movie.is_file() or movie.stat().st_size == 0:
                raise RuntimeError("Es wurde keine vollständige MP4 erzeugt.")

            # Bestehende Endfassung erst nach erfolgreichem Rendern ersetzen.
            with tempfile.NamedTemporaryFile(
                dir=destination.parent, prefix=".optik_", suffix=".mp4", delete=False
            ) as pending:
                temporary_output = Path(pending.name)
            try:
                shutil.copyfile(movie, temporary_output)
                temporary_output.replace(destination)
            finally:
                temporary_output.unlink(missing_ok=True)

    print(f"Fertiges Video: {destination}")


if __name__ == "__main__":
    main()
