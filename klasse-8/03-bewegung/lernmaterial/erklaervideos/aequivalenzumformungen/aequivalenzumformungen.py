"""Gleichungen lösen: Rechenhilfe für Physik, ohne LaTeX.

Rendern: npm run build:videos -- --only aequivalenzumformungen
"""
from manim import *
import numpy as np

config.frame_width = 16
config.frame_height = 9
config.background_color = "#0F172A"


class Aequivalenzumformungen(Scene):
    def construct(self):
        titel = Text("Eine Gleichung lösen", font_size=40).to_edge(UP, buff=0.35)
        self.play(FadeIn(titel))
        schritte = [
            ("2x+3", "11", "Ausgangsgleichung", 2.0),
            ("2x+3-3", "11-3", "Beide Seiten: −3", 1.1),
            ("2x", "8", "Vereinfachen", 0.2),
            ("2x : 2", "8 : 2", "Beide Seiten: durch 2", -0.7),
            ("x", "4", "Ergebnis", -1.6),
        ]
        vorher = None
        for links, rechts, hinweis, y in schritte:
            zeile = VGroup(*[
                Text(text, font_size=46) for text in (links, "=", rechts)
            ]).arrange(RIGHT, buff=0.25)
            anker = np.array([0.0, y, 0.0])
            zeile.shift(anker - zeile[1].get_center())
            notiz = Text(hinweis, font_size=24, color=ORANGE)
            if notiz.width > 3.6:
                notiz.scale_to_fit_width(3.6)
            notiz.move_to([5.1, y, 0])
            if vorher is not None:
                self.play(vorher.animate.set_opacity(0.4), run_time=0.3)
            self.play(Write(zeile), FadeIn(notiz), run_time=1)
            self.wait(4)
            vorher = VGroup(zeile, notiz)

        probe = Text(
            "Probe: 2 · 4 + 3 = 11", font_size=42, color=GREEN_C
        ).move_to([0, -2.7, 0])
        self.play(Write(probe))
        self.wait(3)
        frage = Text(
            "Jetzt du: Wie beginnst du bei 3x + 2 = 17?",
            font_size=28,
        ).to_edge(DOWN, buff=0.35)
        self.play(FadeIn(frage))
        self.wait(5)
