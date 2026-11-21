"use client";
import Link from "next/link";
import WebHeader from "@/features/cabinet/WebHeader";
import EntryBanner from "@/features/home/EntryBanner";
import { USER } from "@/shared/lib/user";
import { dict, useT } from "@/shared/lib/i18n";
import LangSwitch from "@/features/shell/LangSwitch";

// The (mocked) comdirect start page of a real customer, with our entry banner (🆕).
// Account figures are placeholders.
const ROWS: [string, string, string, string, string][] = [
  ["Current account", "Transfer ›", "DE89 2004 1111 0987 6543 00", "3.214,57 €", "3.214,57 €"],
  ["Visa card (credit card)", "", "•••• •••• •••• 4653", "2.000,00 €", "0,00 €"],
  ["Tagesgeld PLUS account", "", "DE71 2004 1111 0987 6543 05", "12.500,00 €", "12.500,00 €"],
  ["Portfolio", "Buy/Sell ›", "9876543", "", "0,00 €"],
  ["Trading account", "", "DE44 2004 1111 0987 6543 40", "0,00 €", "0,00 €"],
];

/** The mocked comdirect start page; shown at / before onboarding and at /comdirect. */
export default function ComdirectHome() {
  const t = useT();
  return (
    <div className="web">
      <WebHeader current="Personal area" extraTop={<LangSwitch />} logout={<span className="btn btn-primary btn-sm" aria-disabled="true">{t("Logout ›", "Abmelden ›")}</span>} />
      <main className="web-main">
        <div className="web-page">
          <div className="page-head">
            <h1>{t("Good morning", "Guten Morgen")}, {t(USER.salutation)}.</h1>
            <div className="page-owner"><span className="page-icons" aria-hidden>ⓘ ⎙ ✉</span><span className="small">{t("Holder", "Inhaber")}: <strong>{USER.name}</strong></span></div>
          </div>
          <EntryBanner />
          <section className="acc">
            <div className="acc-title">comdirect</div>
            <table className="acc-table">
              <thead><tr><th>{t("Account", "Konto")}</th><th>{t("Actions", "Aktionen")}</th><th>{t("IBAN / number", "IBAN / Nummer")}</th><th className="r">{t("Available", "Verfügbar")}</th><th className="r">{t("Balance", "Saldo")}</th></tr></thead>
              <tbody>
                {ROWS.map(([a, act, iban, av, bal]) => (
                  <tr key={a}>
                    <td><span className="link">{t(a)}</span></td>
                    <td>{act && <span className="pill">{t(act)}</span>}</td>
                    <td className="num muted">{iban}</td>
                    <td className="r num">{av}</td>
                    <td className="r num bal">{bal}</td>
                  </tr>
                ))}
                <tr className="acc-total"><td><strong>{t("Total", "Gesamt")}</strong></td><td /><td /><td className="r num">17.714,57 €</td><td className="r num bal"><strong>15.714,57 €</strong></td></tr>
              </tbody>
            </table>
            <div className="row acc-actions">
              <span className="pill pill-lg">{t("All transactions ›", "Alle Umsätze ›")}</span>
              <span className="pill pill-lg pill-yellow">ProTrader ›</span>
              <span className="pill pill-lg pill-yellow">{t("CFD demo account ›", "CFD-Demokonto ›")}</span>
            </div>
          </section>
          <section className="recent">
            <div className="acc-title">{t("Recent activity", "Letzte Aktivitäten")}</div>
            <dl>
              <dt>{t("Login", "Anmeldung")}</dt><dd>{t("Today at 09.12", "Heute um 09.12 Uhr")}</dd>
              <dt>{t("Portfolio", "Depot")}</dt><dd>{t("Opened 3 years ago · never used", "Vor 3 Jahren eröffnet · nie genutzt")}</dd>
            </dl>
          </section>
          <p className="xs muted foot-note">{t("Mocked comdirect start page for the demo. The banner above is the entry to comdirect edu.", "Nachgebaute comdirect-Startseite für die Demo. Das Banner oben ist der Einstieg in comdirect edu.")} <Link href="/">comdirect edu</Link></p>
        </div>
      </main>
    </div>
  );
}

dict({
  "Current account": "Girokonto", "Transfer ›": "Überweisung ›", "Visa card (credit card)": "Visa-Karte (Kreditkarte)",
  "Tagesgeld PLUS account": "Tagesgeld PLUS-Konto", Portfolio: "Depot", "Buy/Sell ›": "Kauf/Verkauf ›", "Trading account": "Verrechnungskonto",
});
