# Notepad Calculator

A single-file, local-only notepad calculator (Soulver/Numi style): type expressions
on the left, read live results on the right.

- **`notepad-calc.html`** — the whole app. No dependencies, no network. Open it
  directly: `open notepad-calc.html` (works from `file://`).
- **`test.cjs`** — engine regression tests. Run with `node test.cjs`.

## Storage

The note lives in the **tab's URL** (`#…`) and in `localStorage`. Bookmark/copy the
URL to keep a note; open a **new browser tab** for a separate note. Nothing leaves
your machine.

## Syntax

| feature | example |
|---|---|
| numbers | `0xff`, `0b1010`, `1 000 000`, `1.5e3`, `2.4e-6` |
| SI prefixes (bare) | `100M`, `2000k` — `k M G T P µ n p` (note: `m` is metre) |
| constants | `e`, `pi`, `π`, `tau` |
| arithmetic | `+ - * / ^`, `div`, `mod`, `%` (`200 + 10%`, `10% of 200`) |
| functions (radians) | `sin cos tg(=tan) ln log exp sqrt abs asin acos atan round floor ceil` |
| times & periods | `9:30:00 - 8:15:30` → `1:14:30`; `2d 03:04:05` (over 24h shows days) |
| dates & epoch (UTC) | `"2024-01-15"` → epoch secs; `1705320000 ep` / `… in epoch` → datetime; `dt ± period`; `dt - dt` → period; `now` |
| units | length, mass, time, temp (C/F/K), angle (deg/rad), data (bytes), `L mL gal mph kmh knot` |
| variables | `rate = 85` then `rate * hours` (a variable shadows a same-named unit) |
| base conversion | `255 in hex`, `0b101 in dec` |
| unit conversion | `90 km/h in m/s`, `20 C in F`, `5000000 in M` |
| lists | a column of plain numbers shows a running sum (Σ) |

## Conventions

- Every result **normalises to SI** (`100 ft` → `30.48 m`, `2 h` → `7200 s`,
  temperature → K, data → bytes). Use `in <unit>` to choose any unit.
  Clock literals (`9:30:00`) keep their form.
- **Juxtaposition binds tighter than `* /`**, so `10 km / 2 h` = `1.39 m/s`.
  Consequence: `1/2 m` means `1/(2m)`; write `0.5 m` for half a metre.
- Clock times are hours-first: `1:30` = 1 h 30 m.
- **Datetimes are UTC** (shown with a ` UTC` suffix) so shared URLs are reproducible. Epoch
  values `≥ 1e12` are read as milliseconds, otherwise seconds. A quoted datetime shows as
  epoch **seconds**; `ep` / `in epoch` shows an epoch number **as a datetime**. Either quote
  style works (`'…'` or `"…"`), and ISO offsets on input (`…+0200`, `…+02:00`, `…Z`) are
  converted to UTC.

## Implementation

Hand-written tokenizer → recursive-descent parser → dimensional-analysis evaluator
(quantities carry a 6D unit-exponent vector: length, mass, time, temperature, angle,
data). Syntax highlighting reuses the tokenizer regexes to paint a backdrop `<div>`
behind a transparent `<textarea>`.
