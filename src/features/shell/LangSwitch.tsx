"use client";
import { useEffect } from "react";
import { dict, setLang, tr, useLang, useT } from "@/shared/lib/i18n";

// Page titles and the description come from server metadata (English); the browser tab follows the language here.
dict({
  "comdirect edu": "comdirect edu",
  "Practice first, then invest: a training sandbox that looks like comdirect and runs on play money.": "Erst üben, dann investieren: eine Trainings-Sandbox im Look von comdirect, mit Spielgeld.",
  "Welcome · comdirect edu": "Willkommen · comdirect edu",
  "Web cabinet · comdirect edu": "Web-Kundenbereich · comdirect edu",
  "Personal area · comdirect": "Persönlicher Bereich · comdirect",
  "Pro mode · comdirect edu": "Pro-Modus · comdirect edu",
  "History Mode · comdirect edu": "Geschichtsmodus · comdirect edu",
  "Investor Simulator · comdirect edu": "Anleger-Simulator · comdirect edu",
  "Ready for real? · comdirect edu": "Bereit für echt? · comdirect edu",
});

/** EN | DE toggle, shown in every header. */
export default function LangSwitch() {
  const t = useT();
  return (
    <span className="lang-switch" role="group" aria-label={t("Language", "Sprache")}>
      {(["en", "de"] as const).map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={t.lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
      ))}
    </span>
  );
}

let enTitle = "";
/** Next writes the English title on every navigation; anything that isn't our German version of it is a new English title. */
function syncTitle(l: "en" | "de") {
  const cur = document.title;
  if (cur !== tr(enTitle, "de")) enTitle = cur;
  const want = tr(enTitle, l);
  if (cur !== want) document.title = want;
}

/** Keeps <html lang>, the tab title and the description in the current language. Mounted once in the root layout. */
export function LangSync() {
  const l = useLang();
  useEffect(() => {
    const html = document.documentElement;
    html.lang = l;
    const id = requestAnimationFrame(() => html.classList.remove("i18n-wait"));
    const desc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (desc) { desc.dataset.en ??= desc.content; desc.content = tr(desc.dataset.en, l); }
    syncTitle(l);
    const mo = new MutationObserver(() => syncTitle(l));
    mo.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => { cancelAnimationFrame(id); mo.disconnect(); };
  }, [l]);
  return null;
}
