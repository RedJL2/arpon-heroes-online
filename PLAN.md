# Arpon Heroes Online: Public Playtest Polish Plan

## Preservation Rules

- Preserve the existing Supabase RPCs, realtime room model, matchmaking, accounts, and database schema.
- Preserve all Set A card values, ability calculations, turn limits, movement rules, and wall restrictions unless a listed bug fix explicitly clarifies their existing rule.
- Keep pass-and-play, solo, private rooms, matchmaking, accounts, friends, and creator tools playable after every milestone.

## Milestone 1: Gameplay Flow and Rule Fixes

- Make staying on the same square confirm correctly during movement and retreat.
- Remove duplicate/reappearing center actions and automatically finish turns when no actions remain.
- Let players dismiss the split-movement choice without losing the pending choice.
- Correct diagonal movement and attacks around a single fortress corner.
- Add wall undo and replace wall instructions with a clear remaining-wall counter.
- Repair result-recording retries and sort leaderboard results high to low.
- Make friendly battle invitations use the same customizable settings as private rooms.

## Milestone 2: Responsive Interface

- Keep the desktop board and side panels readable as a compact tactical workspace.
- Give mobile a collapsible bottom squad/card drawer with tap-based inspection.
- Increase the always-visible turn counter and simplify crowded topbar states.
- Remove hover-only dependencies and keep all important actions reachable by tap.

## Milestone 3: Game Feel and Audio

- Add restrained feedback for dice, damage, attacks, turn starts, and turn endings.
- Use a central `audioManager.js` based on generated Web Audio tones, with no external copyrighted audio.
- Add a persistent mute toggle.
- Keep action feedback informative without delaying gameplay or causing controls to reappear.

## Milestone 4: Verification and Release

- Verify syntax and element bindings.
- Test local setup, movement splitting, retreat staying, fortress-corner attacks, wall undo, automatic turn ending, solo flow, and online-facing result/friend flows.
- Check desktop and mobile layouts in the browser.
- Commit the safe web files and publish the verified build to GitHub Pages.
