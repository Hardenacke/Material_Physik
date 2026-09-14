"""Reflexionsgesetz mit veränderlichem Winkel, ohne LaTeX.

Rendern und automatisch ablegen: npm run build:videos -- --only reflexionsgesetz
"""
from manim import *
import numpy as np

config.frame_width = 16
config.frame_height = 9
config.background_color = "#0F172A"


class Reflexionsgesetz(Scene):
    def construct(self):
        punkt = np.array([0.0, -1.2, 0.0])
        alpha = ValueTracker(40 * DEGREES)
        titel = Text("Das Reflexionsgesetz", font_size=40).to_edge(UP, buff=0.35)
        spiegel = Line(
            punkt + 5 * LEFT, punkt + 5 * RIGHT,
            color=WHITE, stroke_width=6,
        )
        lot = DashedLine(punkt, punkt + 3.8 * UP, color=GRAY_B)
        lot_text = Text("Lot", font_size=28).next_to(lot.get_end(), RIGHT)

        def richtungen():
            winkel = alpha.get_value()
            einfall = np.array([np.sin(winkel), -np.cos(winkel), 0.0])
            normale = np.array([0.0, 1.0, 0.0])
            reflexion = einfall - 2 * np.dot(einfall, normale) * normale
            return einfall, reflexion

        einfallend = always_redraw(lambda: Arrow(
            punkt - 3.5 * richtungen()[0], punkt,
            buff=0, color=BLUE_C, stroke_width=5,
        ))
        reflektiert = always_redraw(lambda: Arrow(
            punkt, punkt + 3.5 * richtungen()[1],
            buff=0, color=ORANGE, stroke_width=5,
        ))
        winkel_links = always_redraw(lambda: Arc(
            radius=0.8, start_angle=PI / 2, angle=alpha.get_value(),
            arc_center=punkt, color=BLUE_C,
        ))
        winkel_rechts = always_redraw(lambda: Arc(
            radius=0.8, start_angle=PI / 2 - alpha.get_value(),
            angle=alpha.get_value(), arc_center=punkt, color=ORANGE,
        ))
        alpha_text = Text("α", color=BLUE_C, font_size=36)
        beta_text = Text("β", color=ORANGE, font_size=36)
        alpha_text.add_updater(lambda m: m.move_to(
            punkt + 1.15 * np.array([
                -np.sin(alpha.get_value() / 2),
                np.cos(alpha.get_value() / 2), 0,
            ])
        ))
        beta_text.add_updater(lambda m: m.move_to(
            punkt + 1.15 * np.array([
                np.sin(alpha.get_value() / 2),
                np.cos(alpha.get_value() / 2), 0,
            ])
        ))
        # Beschriftungen schon vor ihrer Einblendung richtig positionieren.
        alpha_text.update()
        beta_text.update()
        regel = Text(
            "α = β", font_size=50
        ).move_to([0, -2.4, 0])
        hinweis = Text(
            "Beide Winkel werden zum Lot gemessen.", font_size=30
        ).move_to([0, -3.3, 0])

        self.play(FadeIn(titel), Create(spiegel))
        self.play(Create(lot), FadeIn(lot_text))
        self.wait(3)
        self.play(FadeIn(einfallend), Create(winkel_links), FadeIn(alpha_text))
        self.wait(4)
        self.play(FadeIn(reflektiert), Create(winkel_rechts), FadeIn(beta_text))
        self.play(FadeIn(regel), FadeIn(hinweis))
        self.wait(3)
        for winkel in (20, 60, 40):
            self.play(
                alpha.animate.set_value(winkel * DEGREES),
                run_time=3, rate_func=linear,
            )
            self.wait(2)
        self.wait(4)
