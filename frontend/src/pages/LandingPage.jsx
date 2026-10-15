import React, { useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FinShieldLogo } from '../components/FinShieldLogo.jsx';
import './LandingPage.css';

export function LandingPage() {
  const navigate = useNavigate();
  const playerRef = useRef(null);

  useEffect(() => {
    // ----------------------------------------------------
    // 1. INTRO ANIMATION ENGINE (from user specifications)
    // ----------------------------------------------------
    const de = document.documentElement;
    const IT = [];
    const il = (f, ms) => IT.push(setTimeout(f, ms));

    function openIntro() {
      const intro = document.getElementById('intro');
      if (!intro) return;
      IT.forEach((x) => {
        clearTimeout(x);
        clearInterval(x);
      });
      intro.classList.add('open');
      de.classList.remove('lock');
      intro.style.pointerEvents = 'none';
      setTimeout(() => {
        const el = document.getElementById('intro');
        if (el) el.remove();
      }, 1200);
    }

    const box = document.getElementById('iad');
    if (box) {
      box.innerHTML = '';
      const parts = [
        ['Put in ₹5,000 today. ', 0],
        ['Get ₹10,000 in 7 days. ', 1],
        ['100% guaranteed. ', 1],
        ['Zero risk.', 1]
      ];
      const spans = parts.map(([, b]) => {
        const s = document.createElement('span');
        if (b) s.className = 'bad';
        box.appendChild(s);
        return s;
      });
      const caret = document.createElement('i');
      caret.className = 'caret';
      box.appendChild(caret);

      let p = 0;
      let c = 0;

      il(() => {
        const iv = setInterval(() => {
          if (p >= parts.length) {
            clearInterval(iv);
            return;
          }
          spans[p].textContent += parts[p][0][c++];
          spans[p].after(caret);
          if (c >= parts[p][0].length) {
            p++;
            c = 0;
          }
        }, 20);
        IT.push(iv);
      }, 400);

      il(() => {
        caret.remove();
        document.querySelectorAll('.bad').forEach((b, i) => {
          setTimeout(() => b.classList.add('hit'), i * 170);
        });
      }, 2250);

      il(() => {
        box.classList.add('gone');
        const iname = document.getElementById('iname');
        if (iname) iname.classList.add('on');
      }, 3350);

      il(openIntro, 5000);

      // Allow click-to-skip anywhere on intro or skip button
      const introEl = document.getElementById('intro');
      if (introEl) {
        introEl.onclick = (e) => {
          // If clicked anywhere on the overlay, open immediately
          openIntro();
        };
      }
    }

    // ----------------------------------------------------
    // 2. DEMO PLAYER ENGINE (24-second live walkthrough)
    // ----------------------------------------------------
    const DUR = 24;
    const CAPS = [
      'Paste a link, upload a photo or enter the ad text.',
      'FinShield reads the ad and highlights each warning sign with its points.',
      'The website behind the ad is checked and related ads are grouped into one case.',
      'The score is shown with evidence. The investigator reviews it and confirms.'
    ];

    let t = 0;
    let playing = false;
    let started = false;
    let last = 0;
    let animId = null;

    const fmt = (s) => '0:' + String(Math.floor(s)).padStart(2, '0');

    function render() {
      document.querySelectorAll('#player [data-at]').forEach((e) => {
        e.classList.toggle('on', t >= +e.dataset.at);
      });

      const si = t < 5 ? 0 : t < 11 ? 1 : t < 17 ? 2 : 3;

      document.querySelectorAll('#player .scene').forEach((s, i) => {
        s.classList.toggle('on', i === si);
      });

      document.querySelectorAll('#steps li').forEach((l, i) => {
        l.classList.toggle('on', i === si);
      });

      const cap = document.getElementById('cap');
      if (cap) cap.textContent = CAPS[si];

      const u = 'quickwealth.in/join';
      const url = document.getElementById('url');
      if (url) {
        url.textContent = u.slice(0, Math.max(0, Math.min(u.length, Math.floor((t - 0.5) * 10))));
      }

      const q = Math.min(1, Math.max(0, (t - 17.5) / 1.5));
      const sn = document.getElementById('sn');
      if (sn) sn.textContent = Math.round(98 * q);

      const sbar = document.getElementById('sbar');
      if (sbar) sbar.style.width = 98 * q + '%';

      const pf = document.getElementById('pf');
      if (pf) pf.style.width = (t / DUR) * 100 + '%';

      const tm = document.getElementById('tm');
      if (tm) tm.textContent = fmt(t) + ' / ' + fmt(DUR);
    }

    function tick(n) {
      if (!playing) return;
      t += (n - last) / 1000;
      last = n;
      if (t >= DUR) {
        t = DUR;
        playing = false;
        const pt = document.getElementById('pt');
        if (pt) pt.textContent = '▶';
        const ph = document.getElementById('ph');
        if (ph) ph.textContent = 'Watch again';
        const pp = document.getElementById('pp');
        if (pp) pp.textContent = 'Replay the walkthrough';
        const poster = document.getElementById('poster');
        if (poster) poster.hidden = false;
        render();
        return;
      }
      render();
      animId = requestAnimationFrame(tick);
    }

    function play(from) {
      if (from === 0 || t >= DUR) t = 0;
      started = true;
      playing = true;
      const poster = document.getElementById('poster');
      if (poster) poster.hidden = true;
      const pt = document.getElementById('pt');
      if (pt) pt.textContent = '❚❚';
      last = performance.now();
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(tick);
    }

    function pause() {
      playing = false;
      const pt = document.getElementById('pt');
      if (pt) pt.textContent = '▶';
      cancelAnimationFrame(animId);
    }

    const playBtn = document.getElementById('play');
    if (playBtn) playBtn.onclick = () => play(0);

    const startBtn = document.getElementById('start');
    if (startBtn) {
      startBtn.onclick = () => {
        const p = document.getElementById('player');
        if (p) p.scrollIntoView({ behavior: 'smooth', block: 'center' });
        play(0);
      };
    }

    const watchBtn = document.getElementById('watch');
    if (watchBtn) {
      watchBtn.onclick = () => {
        const p = document.getElementById('player');
        if (p) p.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => play(0), 500);
      };
    }

    const ptBtn = document.getElementById('pt');
    if (ptBtn) {
      ptBtn.onclick = () => {
        if (playing) pause();
        else if (!started || t >= DUR) play(0);
        else {
          const poster = document.getElementById('poster');
          if (poster) poster.hidden = true;
          play();
        }
      };
    }

    const prog = document.getElementById('prog');
    if (prog) {
      prog.onclick = (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        t = Math.max(0, Math.min(DUR - 0.01, ((e.clientX - r.left) / r.width) * DUR));
        const poster = document.getElementById('poster');
        if (poster) poster.hidden = true;
        started = true;
        render();
        if (!playing) play();
      };
    }

    // Step indicators click
    document.querySelectorAll('#steps li').forEach((li, idx) => {
      li.onclick = () => {
        const targetTimes = [0.1, 5.5, 11.5, 18];
        t = targetTimes[idx] || 0;
        const poster = document.getElementById('poster');
        if (poster) poster.hidden = true;
        started = true;
        render();
        if (!playing) play();
      };
    });

    render();

    return () => {
      IT.forEach((x) => {
        clearTimeout(x);
        clearInterval(x);
      });
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="landing-page-root">
      {/* 1. INTRO SCREEN (doors slide open after scam typewriter animation) */}
      <div id="intro">
        <div className="door l" />
        <div className="door r" />
        <div className="icenter">
          <p className="iad" id="iad" aria-hidden="true" />
          <div className="iname" id="iname">
            <span className="ilm">
              <FinShieldLogo variant="icon" size={72} light={false} />
            </span>
            <span className="iwd">
              Fin<b>Shield</b>
            </span>
          </div>
        </div>
      </div>

      {/* 2. STICKY BRAND HEADER */}
      <header>
        <div className="wrap bar">
          <a className="logo" href="#top">
            <span className="lmw">
              <FinShieldLogo variant="icon" size={26} light={false} />
            </span>
            <span>
              Fin<b>Shield</b>
            </span>
          </a>

          <nav aria-label="Primary">
            <a href="#problem">Problem</a>
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#signs">Risk score</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="hb">
            <Link
              to="/login"
              className="btn ghost sm js-login"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="btn sm js-signup"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <main id="top">
        <section className="hero">
          <div className="wrap">
            <h1>
              Catch fake investment ads <em>before they spread</em>
            </h1>
            <p className="lead">
              FinShield reads suspicious ads, follows their links, groups related ads and gives an investigator the evidence to decide.
            </p>
            <div className="btns">
              <a className="btn" href="#how" id="startHero">
                Explore the demo
              </a>
              <button className="btn ghost" type="button" id="watch">
                Watch how it works
              </button>
            </div>

            <div className="card" aria-hidden="true">
              <div className="ad">
                <small>Quick Wealth India · Sponsored</small>
                <p>
                  Put in ₹5,000 today and <span className="mk">get ₹10,000 in 7 days</span>.{' '}
                  <span className="mk">100% guaranteed returns</span>,{' '}
                  <span className="mk">zero risk</span>. Only 10 slots left, DM to join.{' '}
                  <span className="mk">No KYC needed.</span>
                </p>
              </div>
              <div className="res">
                <div className="score">
                  <b>98</b>
                  <span>High risk</span>
                </div>
                <div className="chips">
                  <span className="chip">Money doubling +25</span>
                  <span className="chip">Guaranteed returns +30</span>
                  <span className="chip">No-risk claim +25</span>
                  <span className="chip">Skips KYC +20</span>
                </div>
                <span className="chip b" style={{ alignSelf: 'flex-start' }}>
                  Waiting for investigator review
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. THE PROBLEM */}
        <section className="sec" id="problem">
          <div className="wrap">
            <span className="eyebrow">The problem</span>
            <h2>Scam ads don't look like scams</h2>
            <p className="sub">
              They look like normal posts, they spread fast, and the real trap sits behind a link. Checking them by hand can't keep up.
            </p>
            <div className="two">
              <div className="cmp">
                <h3>Without a tool</h3>
                <ul>
                  <li>Each ad is judged by hand while it keeps reaching new people</li>
                  <li>Nobody can tell if two ads belong to the same scam</li>
                  <li>The fake website behind an ad is found late</li>
                </ul>
              </div>
              <div className="cmp new">
                <h3>With FinShield</h3>
                <ul>
                  <li>The ad is checked automatically for warning signs</li>
                  <li>Related ads are grouped into one case</li>
                  <li>The website the ad points to is checked too</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 5. WHAT IT DOES */}
        <section className="sec alt" id="features">
          <div className="wrap">
            <span className="eyebrow">What it does</span>
            <h2>One place to catch, link and decide</h2>
            <p className="sub">
              Everything an investigator needs to go from a suspicious post to a confirmed case.
            </p>
            <div className="four">
              <div className="feat">
                <h3>Case queue</h3>
                <p>Paste a link, upload a photo or enter text. Every ad lands in one queue with its risk score.</p>
              </div>
              <div className="feat">
                <h3>Linked ads</h3>
                <p>If an ad sends people to another website, that site is checked too, and ads that share it are grouped.</p>
              </div>
              <div className="feat">
                <h3>Clear evidence</h3>
                <p>Every score comes with the steps and the exact words behind it.</p>
              </div>
              <div className="feat">
                <h3>Investigator review</h3>
                <p>FinShield only flags. The investigator reads the evidence and makes the final call.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. HOW IT WORKS & 24s WALKTHROUGH PLAYER */}
        <section className="sec" id="how">
          <div className="wrap">
            <span className="eyebrow">How it works</span>
            <h2>From submission to verdict in four steps</h2>
            <div className="how">
              <div>
                <ol className="sl" id="steps">
                  <li className="on">
                    <b>1. Submit</b>
                    <span>Paste a link, upload a photo or enter the ad text.</span>
                  </li>
                  <li>
                    <b>2. Detect</b>
                    <span>The ad is checked for fake promises and pressure tactics.</span>
                  </li>
                  <li>
                    <b>3. Follow</b>
                    <span>Websites the ad points to are checked and related ads are linked.</span>
                  </li>
                  <li>
                    <b>4. Verify</b>
                    <span>An investigator reviews the score and confirms the finding.</span>
                  </li>
                </ol>
                <button className="btn" type="button" id="start">
                  ▶ Start demo
                </button>
              </div>

              {/* Live Interactive Player */}
              <div className="player" id="player" ref={playerRef}>
                <div className="pbar">
                  <i />
                  <i />
                  <i />
                  <span style={{ flex: 1, textAlign: 'center' }}>
                    Case 0412 · Quick Wealth India
                  </span>
                </div>

                <div className="screen">
                  {/* Step 1: Submit */}
                  <div className="scene on">
                    <div className="lbl">Step 1 · Submit an ad</div>
                    <div className="field">
                      <span id="url" />
                      <i className="caret" />
                      <b className="go x" data-at="4">
                        Analyse
                      </b>
                    </div>
                    <div className="pad x" data-at="2.5">
                      Ad loaded from <b>quickwealth.in/join</b> · Sponsored on Instagram
                    </div>
                  </div>

                  {/* Step 2: Detect */}
                  <div className="scene">
                    <div className="lbl">Step 2 · Detect warning signs</div>
                    <p className="pad" style={{ margin: 0 }}>
                      Put in ₹5,000 today and{' '}
                      <span className="mk" data-at="5.5">
                        get ₹10,000 in 7 days
                      </span>
                      .{' '}
                      <span className="mk" data-at="6.5">
                        100% guaranteed returns
                      </span>
                      ,{' '}
                      <span className="mk" data-at="7.5">
                        zero risk
                      </span>
                      . Only 10 slots left, DM to join.{' '}
                      <span className="mk" data-at="8.5">
                        No KYC needed.
                      </span>
                    </p>
                    <div className="chips">
                      <span className="chip x" data-at="6">
                        Money doubling +25
                      </span>
                      <span className="chip x" data-at="7">
                        Guaranteed returns +30
                      </span>
                      <span className="chip x" data-at="8">
                        No-risk claim +25
                      </span>
                      <span className="chip x" data-at="9">
                        Skips KYC +20
                      </span>
                    </div>
                  </div>

                  {/* Step 3: Follow & Group */}
                  <div className="scene">
                    <div className="lbl">Step 3 · Follow links and group ads</div>
                    <div className="flow">
                      <span className="nd bad x" data-at="11.5">
                        Ad 0412
                      </span>
                      <span className="arw x" data-at="12.3">
                        →
                      </span>
                      <span className="nd x" data-at="12.5">
                        quickwealth.in
                      </span>
                      <span className="arw x" data-at="13.3">
                        →
                      </span>
                      <div className="col">
                        <span className="nd x" data-at="13.5">
                          Ad 2
                        </span>
                        <span className="nd x" data-at="14">
                          Ad 3
                        </span>
                        <span className="nd x" data-at="14.5">
                          Ad 4
                        </span>
                      </div>
                    </div>
                    <div className="chips">
                      <span className="chip b x" data-at="15.3">
                        3 related ads linked into one case
                      </span>
                    </div>
                  </div>

                  {/* Step 4: Investigator Verify */}
                  <div className="scene">
                    <div className="lbl">Step 4 · Investigator verifies</div>
                    <div className="pscore">
                      <b id="sn">0</b>
                      <span>/ 100 risk</span>
                    </div>
                    <div className="meter">
                      <i id="sbar" />
                    </div>
                    <div className="fbs">
                      <span className="fb p x" data-at="21.5">
                        Confirm as suspicious
                      </span>
                      <span className="fb">Reject</span>
                      <span className="stamp x" data-at="22.2">
                        CONFIRMED
                      </span>
                    </div>
                  </div>

                  {/* Poster Overlay */}
                  <div className="poster" id="poster">
                    <button className="play" id="play" type="button" aria-label="Start demo">
                      ▶
                    </button>
                    <h3 id="ph">See FinShield in action</h3>
                    <p id="pp">A 24-second walkthrough of one ad, start to finish</p>
                  </div>
                </div>

                <div className="cap" id="cap">
                  Paste a link, upload a photo or enter the ad text.
                </div>

                <div className="ctl">
                  <button id="pt" type="button" aria-label="Pause">
                    ❚❚
                  </button>
                  <div className="prog" id="prog">
                    <i id="pf" />
                  </div>
                  <span className="tm" id="tm">
                    0:00 / 0:24
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. RISK SCORE MATRIX */}
        <section className="sec alt" id="signs">
          <div className="wrap signs">
            <div>
              <span className="eyebrow">Risk score</span>
              <h2>Every point traces back to words in the ad</h2>
              <p className="sub" style={{ margin: 0 }}>
                Each warning sign adds points. Nothing is a black box, so the investigator can see exactly why an ad scored high.
              </p>
            </div>
            <div>
              <div className="bars" style={{ background: 'var(--bg)' }}>
                <div className="sig">
                  <span>Guaranteed returns</span>
                  <span className="t">
                    <span className="f" style={{ width: '100%' }} />
                  </span>
                  <b>30</b>
                </div>
                <div className="sig">
                  <span>Claims there is no risk</span>
                  <span className="t">
                    <span className="f" style={{ width: '83%' }} />
                  </span>
                  <b>25</b>
                </div>
                <div className="sig">
                  <span>Money doubling promises</span>
                  <span className="t">
                    <span className="f" style={{ width: '83%' }} />
                  </span>
                  <b>25</b>
                </div>
                <div className="sig">
                  <span>Skips identity checks (KYC)</span>
                  <span className="t">
                    <span className="f" style={{ width: '67%' }} />
                  </span>
                  <b>20</b>
                </div>
                <div className="sig">
                  <span>Fake urgency</span>
                  <span className="t">
                    <span className="f" style={{ width: '40%' }} />
                  </span>
                  <b>12</b>
                </div>
                <div className="sig">
                  <span>Moves you to private chat</span>
                  <span className="t">
                    <span className="f" style={{ width: '33%' }} />
                  </span>
                  <b>10</b>
                </div>
              </div>
              <p className="note" style={{ marginTop: '12px' }}>
                These points come from the rule set in our demo and can be adjusted.
              </p>
            </div>
          </div>
        </section>

        {/* 8. FAQ ACCORDION */}
        <section className="sec" id="faq">
          <div className="wrap faq">
            <span className="eyebrow">FAQ</span>
            <h2>Questions people ask</h2>
            <p className="sub">Short answers about what the demo does and doesn't do.</p>
            <details>
              <summary>Does FinShield decide on its own?</summary>
              <p>No. It flags an ad and explains why. An investigator reviews the evidence and makes the final decision.</p>
            </details>
            <details>
              <summary>What can the full system review?</summary>
              <p>The system reviews ad links, mule recruitment posts, account numbers, and extracted clues in coordinated syndicate graphs.</p>
            </details>
            <details>
              <summary>What if the ad leads to another website?</summary>
              <p>The website it points to is checked as well, including its URL, because the real scam is often there.</p>
            </details>
            <details>
              <summary>Are Login and Sign up working?</summary>
              <p>Yes! Click the Login button at the top right to access the full FinShield Sentinel Investigation Console.</p>
            </details>
            <details>
              <summary>Is this the full detection system?</summary>
              <p>Yes! Behind the Login lies the complete AI Security Operations Center (AI SOC v2.0) with live alerts, syndicate graphs, and case reporting.</p>
            </details>
          </div>
        </section>

        {/* 9. BOTTOM CTA BAND */}
        <section className="band">
          <div className="wrap">
            <h2>Explore a safer financial internet</h2>
            <p className="sub">
              FinShield helps investigators understand suspicious financial advertisements through clear evidence and risk indicators.
            </p>
            <div className="btns">
              <Link
                to="/signup"
                className="btn"
              >
                Sign up
              </Link>
              <Link
                to="/login"
                className="btn ghost"
              >
                Login
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 10. FOOTER */}
      <footer>
        <div className="wrap">
          <span>FinShield · AI-powered detection of suspicious financial advertisements</span>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
