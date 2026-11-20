import Link from "next/link";

// Hero photo: Look Studio on Unsplash (free Unsplash License), hotlinked from Unsplash's CDN as their guidelines ask.
const PHOTO = "https://images.unsplash.com/photo-1713358630106-3ffa7ec25e0a?w=1200&q=80&auto=format&fit=crop";

export default function Home() {
  return (
    <main>
      <section className="landing">
        <div className="landing-text">
          <h1>Learn to invest without risking a cent</h1>
          <p>The same screen as your comdirect depot, with play money. Learn every concept as a game, then test yourself in a market full of news, rumors and rivals.</p>
          <Link className="btn btn-primary btn-lg" href="/simulator">Open the platform →</Link>
          {/* Decorative market line along the bottom of the text column. */}
          <svg className="landing-line" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden>
            <polyline points="0,96 40,90 80,98 120,80 160,86 200,70 240,76 280,58 320,66 360,48 400,54 440,38 480,44 520,26 560,30 600,14" />
          </svg>
        </div>
        <figure className="landing-photo">
          {/* eslint-disable-next-line @next/next/no-img-element -- external CDN photo, no next/image remote config needed */}
          <img src={PHOTO} alt="Happy young woman taking a selfie with her phone" />
        </figure>
      </section>
    </main>
  );
}
