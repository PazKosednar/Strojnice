# Strojnice: načrtovanje strojnih inštalacij

Spletna aplikacija za načrtovanje strojnih inštalacij v tehničnih prostorih (strojnicah).
Uporabnik vriše prostor po merah, postavi naprave (toplotna črpalka, hranilnik, raztezna
posoda, razdelilnik ...) in aplikacija med priključki sama spelje cevi. Isti model se sproti
prikazuje v 2D tlorisu in v 3D pogledu.

Celotna zasnova in faze: [docs/zasnova.md](docs/zasnova.md).

## Tehnologija (odločeno, ne spreminjaj brez vprašanja)

- Vite + React + TypeScript (strict)
- React Router, Zustand za stanje
- Supabase: prijava (e-pošta + geslo) in Postgres baza
- Vitest za teste, ESLint + Prettier
- Kasneje: React Three Fiber za 3D, SVG za 2D urejevalnik

TypeScript je zaklenjen na `~6.0`, ker typescript-eslint še ne podpira TS 7.

## Arhitekturna pravila

- **En model scene** v JSON, vse mere v **milimetrih (cela števila)**. 2D in 3D sta samo
  prikaza tega modela, nikoli nimata svojega stanja geometrije.
- **Geometrijsko jedro** je čisti TypeScript v `src/core/`, brez Reacta in brez DOM-a,
  vsaka funkcija pokrita s testi. To se preverja samodejno:
  - `tsconfig.core.json` nima tipov DOM (`lib: ["ES2023"]`),
  - ESLint v `src/core/` prepove uvoz `react`, `zustand`, `@supabase/*`,
  - testi jedra tečejo v okolju `node` (projekt `core` v Vitestu).
- **Mer naprav, servisnih odmikov in standardov si ne izmišljuj**; vnese jih uporabnik.
- **Oznake naprav in kode** (npr. `HP-01`, `CYL-01`) so točni identifikatorji, ne
  spreminjaj jih (ne prevajaj, ne spreminjaj velikosti črk, ne normaliziraj).
- **Uporabniški vmesnik je v slovenščini**, koda in komentarji v angleščini.
- Izgled je začasen: čist, funkcionalen, brez posebnega oblikovanja.
- Majhne datoteke z eno odgovornostjo; po vsaki zaključeni nalogi testi in commit.

## Dogovori modela (faza 1)

- **Koordinate tlorisa:** x desno, y v tlorisu navzgor (SVG obrne os y). Višine od tal (0).
- **3D:** `x → x`, `y tlorisa → −z`, višina → `y`; mm → m samo v `core/sceneToBoxes.ts`.
- **Stena** je samostojen odsek (`start`, `end`), debelina simetrično okoli osi. Sosednje
  stene si delijo točno isto koordinato krajišča; premik krajišča premakne vse stene na
  tej koordinati.
- **Odprtina:** `offset` je razdalja od začetka stene do **bližjega roba** odprtine.
  Vrata imajo vedno `sillHeight = 0`.
- **Nastavitve projekta** (`scene.settings`: debelina/višina stene, mere vrat in okna,
  korak mreže) so vrednosti za nove elemente, ki jih uporabnik spreminja. Niso standardi.
- Operacije nad sceno (`core/*Ops.ts`) so čiste funkcije, ki vrnejo `SceneResult`
  (nova scena ali koda napake); vmesnik kodo prevede v `editor/sceneErrorMessages.ts`.
- Id-ji se v jedro podajo od zunaj (`IdFactory`), da so funkcije deterministične.
- Shranjeni JSON se vedno prebere skozi `parseScene()`; neveljaven zapis se zavrne z
  napako, nikoli tiho ne popravi.

## Ukazi

| Namen               | Ukaz                   |
| ------------------- | ---------------------- |
| Razvojni strežnik   | `npm run dev`          |
| Testi (enkrat)      | `npm test`             |
| Testi (watch)       | `npm run test:watch`   |
| Preverjanje tipov   | `npm run typecheck`    |
| Lint                | `npm run lint`         |
| Formatiranje        | `npm run format`       |
| Preverjanje formata | `npm run format:check` |
| Produkcijski build  | `npm run build`        |
| Predogled builda    | `npm run preview`      |

Pred commitom: `npm run lint && npm run typecheck && npm test && npm run build`.

`npm test` teče prek `scripts/vitest.mjs`, ki na Windows normalizira črko pogona
(`c:` → `C:`). Brez tega Vitest naloži runner dvakrat in vsi testi padejo z
`Cannot read properties of undefined (reading 'config')`. Ne kliči `npx vitest` neposredno.

## Struktura

```
src/
  core/        čisto geometrijsko jedro (model scene), brez Reacta/DOM-a
  lib/         odjemalci in dostop do podatkov (Supabase, API projektov, autosave)
  stores/      Zustand store-i (editorStore: scena + undo/redo, izbor, orodje)
  editor/      urejevalnik: orodna vrstica, plošča lastnosti, bližnjice, shranjevanje
  editor2d/    2D tloris (SVG): pogled, orodja, sloji
  view3d/      3D prikaz (React Three Fiber), samo bere sceno iz stora
  components/  skupne React komponente
  pages/       strani (ena datoteka na pot)
  test/        nastavitev testov
supabase/
  migrations/  SQL migracije (časovni žig v imenu)
docs/          zasnova in dokumentacija
```

## Okolje

Ključi Supabase so v `.env.local` (ni v gitu), predloga je `.env.example`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Vrednosti ključev si ne izmišljuj; vpraša se uporabnika.
