# Demo video script (2–3 minutes)

Everything technical is done and live — this is the only remaining piece,
and it needs a human voice. Screen-record `https://bitcred.online`
(or `npm run dev` locally against the same deployed contract) following this
beat sheet. The resolver is already running continuously against the
deployed contract, so a real window will open/lock/settle in front of the
camera without you doing anything extra — just have the tab open a few
minutes before you start recording so a window is mid-flight when you hit
record.

## 0:00–0:15 — Cold open, no talking

Cut straight to `/play`, already loaded, race view live and moving (real
BTC/ETH prices ticking, countdown running). No logo splash, no
talking-head. A judge scanning 86 submissions decides in this window.

## 0:15–0:40 — The problem (voiceover over the landing page's stat cards)

"Most DreamDEX markets never traded. 83.5% of them, by DreamDEX's own
numbers — because 'will BTC go up' has no natural other side. Everyone who
has an opinion has the *same* opinion, so the book never fills."

Scroll to the `83.5%` stat card on the landing page while saying this.

## 0:40–1:00 — The fix

"So instead of betting on one asset against silence, you bet on BTC against
ETH. That's a real disagreement — people have tribal opinions about which
one wins — so both sides populate naturally."

Show the BTC-vs-ETH hero graphic / pot-split bar filling on both sides.

## 1:00–2:00 — Live run (this is the section that matters most)

0. Optional: point out the 5m / 15m / 1h tabs — all three run for real off
   the same DreamDEX feed, not just the one shown. Stay on 5m for the rest
   of the run (best odds of a decisive result in the recording window).
1. Show the countdown, live prices moving, pot-split bar.
2. Tap "Get test STT" — instant, no popup.
3. Tap a side (BTC or ETH) — instant confirmation, no wallet popup, no gas
   prompt. Say out loud: *"That's an on-chain transaction. It just
   confirmed instantly — that's Somnia."*
4. Let the countdown run down to lock. Show "Picks locked."
5. Wait for expiry — the resolver settles automatically in the background
   (usually within ~5–10 seconds of expiry, watch `resolver.log` if you
   want proof it's not staged).
6. **Whatever happens, react to it on camera.** If it's decisive: point at
   the win banner, tap Claim, show the balance change. If it's a draw:
   point at "No Contest — Dead Heat" and say *"same direction on both —
   full refund, no drama, and that happens about 85% of the time, which we
   measured before building this."* Either outcome is a good clip; a draw
   handled this cleanly is a strength, not a failure — say so on camera.
7. Show the on-chain transaction (Shannon explorer link, or the tx hash in
   `resolver.log`) — the "clean settlement" proof point.

## 2:00–2:30 — Why Somnia, and the roadmap line

"Every pick, every payout — sub-second finality, no claim-button ceremony.
That's the only reason a five-minute market is pleasant to use at all."

One roadmap line: "Right now the pot is pooled on our own contract because
DreamDEX's books are thin today — the natural next step is routing picks
onto the real Event Contract books as liquidity arrives."

Cut.

---

## If you want to force a specific outcome for the recording

You can't control DreamDEX's real resolution, and you shouldn't try to fake
it — the non-negotiable per the brief is a **real, live settlement**. But
you can maximize your odds of catching a decisive (non-draw) window by just
recording for 15–20 minutes (3–4 windows) and cutting to whichever one
lands the way you want — decisive windows happen ~15% of the time at the
5-minute cadence, so a few attempts is normally enough. Record a draw too
regardless; the script above already treats it as a first-class clip, and
having both in your back pocket while editing is strictly better.

## Assets already in place

- Live app: https://bitcred.online
- Contract: `0x219eE4A6A83E7D9238e43e568720da2b5e5eC1c2` on Shannon
  (`https://shannon-explorer.somnia.network/address/0x219eE4A6A83E7D9238e43e568720da2b5e5eC1c2`)
- Resolver log for on-camera proof of automatic settlement:
  `resolver/resolver.log` (or watch it live: `tail -f resolver/resolver.log`)
