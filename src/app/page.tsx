import Link from "next/link";
import WebHeader from "@/components/cabinet/WebHeader";
import EntryBanner from "@/components/EntryBanner";

// The (mocked) comdirect start page of a real customer, with our entry banner (🆕).
// Account figures are placeholders.
const ROWS: [string, string, string, string, string][] = [
  ["Girokonto", "Transfer ›", "DE89 2004 1111 0987 6543 00", "3.214,57 €", "3.214,57 €"],
  ["Visa card (credit card)", "", "•••• •••• •••• 4653", "2.000,00 €", "0,00 €"],
  ["Tagesgeld PLUS account", "", "DE71 2004 1111 0987 6543 05", "12.500,00 €", "12.500,00 €"],
  ["Depot", "Buy/Sell ›", "9876543", "", "0,00 €"],
  ["Verrechnungskonto", "", "DE44 2004 1111 0987 6543 40", "0,00 €", "0,00 €"],
];

export default function Home() {
  return (
    <div className="web">
      <WebHeader current="Personal area" logout={<span className="btn btn-primary btn-sm" aria-disabled="true">Logout ›</span>} />
      <main className="web-main">
        <div className="web-page">
          <div className="page-head">
            <h1>Good morning, Mr Mustermann.</h1>
            <div className="page-owner"><span className="page-icons" aria-hidden>ⓘ ⎙ ✉</span><span className="small">Holder: <strong>Max Mustermann</strong></span></div>
          </div>
          <EntryBanner />
          <section className="acc">
            <div className="acc-title">comdirect</div>
            <table className="acc-table">
              <thead><tr><th>Account</th><th>Actions</th><th>IBAN / number</th><th className="r">Available</th><th className="r">Balance</th></tr></thead>
              <tbody>
                {ROWS.map(([a, act, iban, av, bal]) => (
                  <tr key={a}>
                    <td><span className="link">{a}</span></td>
                    <td>{act && <span className="pill">{act}</span>}</td>
                    <td className="num muted">{iban}</td>
                    <td className="r num">{av}</td>
                    <td className="r num bal">{bal}</td>
                  </tr>
                ))}
                <tr className="acc-total"><td><strong>Total</strong></td><td /><td /><td className="r num">17.714,57 €</td><td className="r num bal"><strong>15.714,57 €</strong></td></tr>
              </tbody>
            </table>
            <div className="row acc-actions">
              <span className="pill pill-lg">All transactions ›</span>
              <span className="pill pill-lg pill-yellow">ProTrader ›</span>
              <span className="pill pill-lg pill-yellow">CFD demo account ›</span>
            </div>
          </section>
          <section className="recent">
            <div className="acc-title">Recent activity</div>
            <dl>
              <dt>Login</dt><dd>Today at 09.12</dd>
              <dt>Depot</dt><dd>Opened 3 years ago · never used</dd>
            </dl>
          </section>
          <p className="xs muted foot-note">Mocked comdirect start page for the demo. The banner above is the entry to comdirect edu. <Link href="/learn">Learning map</Link></p>
        </div>
      </main>
    </div>
  );
}
