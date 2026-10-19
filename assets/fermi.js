const taskStep = document.getElementById("aufgabe");
const workStep = document.getElementById("loesungsweg");
const stepLabel = document.querySelector("[data-step-label]");
const backLink = document.querySelector("[data-back]");

function showStep(focus = false) {
  const working = window.location.hash === "#loesungsweg";
  taskStep.hidden = working;
  workStep.hidden = !working;
  stepLabel.textContent = working ? "Schritt 2 von 2 · Eigener Lösungsweg" : "Schritt 1 von 2 · Aufgabe";
  document.querySelectorAll(".step-link").forEach((link) => {
    if (link.hash === (working ? "#loesungsweg" : "#aufgabe")) link.setAttribute("aria-current", "step");
    else link.removeAttribute("aria-current");
  });
  backLink.href = working ? "#aufgabe" : "index.html";
  backLink.textContent = working ? "← Zurück zur Aufgabe" : "← Zur Aufgabenübersicht";
  if (focus) {
    const heading = working ? workStep.querySelector("h2") : document.querySelector("h1");
    heading.focus({ preventScroll: true });
    if (working) workStep.scrollIntoView({ block: "nearest", behavior: "instant" });
    else window.scrollTo({ top: 0, behavior: "instant" });
  }
}

window.addEventListener("hashchange", () => showStep(true));
showStep();
