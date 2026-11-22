# Midnight at the Meridian Vault

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/unuserv01-lab/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/unuserv01-lab/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down stealth heist game in plain static files: cross three rooms of the Meridian Vault at night, lift the diamond in each, and slip out the east door before the alarm tops out.

Guards patrol with sweeping vision cones, wall cameras sweep their own cones, and every watcher that sees you feeds one alarm meter — seen long enough and the guards grow suspicious, then chase once the alarm passes 60%; at 100% they converge. Cover blocks sight, so the room reads before you move: pedestals, crates, planters and the central display island to hide behind, with several routes through each room. Gold coins lying around pay for three tools — a coin toss that pulls a guard over to look, a smoke puff that hides you for 4 seconds, and an EMP burst that blinds the cameras for 6 seconds. Sneak with Shift and the alarm climbs half as fast while a watcher sees you. Grab the diamond and the exit opens; clear all three rooms for the clean getaway.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

WASD / arrows move, Shift sneaks, 1/2/3 pick a tool, click to use it, P pauses, M mutes, R restarts after being caught. Sounds are plain WebAudio oscillators — no audio files, no network.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

---

<sub>Entered on [make.fun](https://make.fun/?ref=n8hpxggx&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)</sub>
