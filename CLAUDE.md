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

## Dogovori modela (faza 2: naprave)

- **Lokalne koordinate naprave:** izhodišče v središču tlorisa na spodnjem robu; x = širina
  (desno, gledano od spredaj), **+y = hrbet, −y = sprednja stran**, z navzgor. Valj ima
  širino in globino enako premeru.
- **`rotation`:** cele stopinje, v tlorisu proti urinemu kazalcu, 0–359. Pri 0 je sprednja
  stran obrnjena proti −y tlorisa.
- **`Equipment.type` je kopija** tipa iz kataloga ob postavitvi. Urejanje kataloga nikoli
  ne spremeni obstoječega projekta.
- **Oznaka (`tag`)** je točen identifikator: enolična v projektu, primerja se znak za znak,
  nikoli se ne preštevilči. Nova oznaka je `predpona-NN` s številko za najvišjo že
  uporabljeno (sproščene številke se ne uporabijo znova, dokler obstaja višja).
- **Sistemi** so v `scene.settings.systems`. Začetni štirje imajo stalne id-je (`supply`,
  `return`, `dhw`, `cold`), enake v vseh projektih, ker je katalog skupen vsem projektom.
  Priključek z neznanim sistemom se nariše sivo in sproži opozorilo.
- **Snap na steno:** hrbet naprave se prisloni na lice stene (os ± debelina/2) na strani
  kazalca, rotacija se poravna s steno. Pri poševni steni se rotacija zaokroži na cele
  stopinje, razdalja pa izbere tako, da tloris ne sega v steno.
- **Trki in odmiki so opozorila, ne blokade** (`core/sceneWarnings.ts`). Dotik in prekrivanje
  do 1 mm ne štejeta. Stena šteje kot polna do svoje višine (odprtine se ne upoštevajo).
  Cona odmika je kvader ob vsaki strani naprave v njeni višini, `top` nad njo.
- **Predloge tipov** (`catalog/templates.ts`) določajo samo obliko, predpono in montažo.
  Mer, priključkov in odmikov ne vsebujejo; vnese jih uporabnik.
- **Verzija scene:** `SCENE_VERSION = 5`. Starejše scene nadgradi `core/sceneMigrations.ts`
  (klicano iz `parseScene`). Vsaka sprememba shranjene oblike dobi novo verzijo, korak
  migracije in test.
- **Katalog** je tabela `equipment_types` (na uporabnika, RLS). `definition` se ob branju
  validira (`parseEquipmentType`); neberljiv zapis se prikaže kot napaka, ne uporabi.

## Dogovori modela (faza 3: cevi)

- **Zunanji premer cevi** (`Port.outerDiameter`, `WallTerminal.outerDiameter`) vnese
  uporabnik; iz besedila `size` se nikoli ne izpelje. Priključka brez premera ni mogoče
  povezati.
- **Cev** (`Pipe`) povezuje dva konca istega sistema (`port` ali `terminal`); vsak konec ima
  največ eno cev. `route` so samo oglišča osno vzporednih odsekov (cele mm), od `from` do
  `to`; prazna trasa pomeni, da poti ni (`routeError`). Različna premera sta opozorilo.
- **Izhod v steni** (`WallTerminal`) leži na osi stene; oznake izhodov (`IZ-NN`) so enolične
  skupaj z oznakami naprav.
- **Samodejne cevi** (`mode: 'auto'`) se speljejo znova, ko se premakne njihov konec;
  rezultat se doda trenutnemu koraku zgodovine (`editorStore.amend`), zato ga Ctrl+Z
  razveljavi skupaj s premikom. **Ročne cevi** se nikoli ne spremenijo samodejno.
- **Speljevanje** (`core/routing/`) je A* po 3D mreži (`settings.routingGrid`) z izhodnim
  ravnim odsekom (`settings.portStraight`). Vse cene in omejitve so v
  `core/routing/costs.ts` (niso standardi). Velikost mreže se preveri pred gradnjo
  (`buildGrid`), čas na cev je omejen, računanje teče v Web Workerju (`src/routing/`).
- **Preboji sten** se ne shranjujejo: vedno se izračunajo iz trase (`wallCrossings`).
- **Čist 3D pogled:** pravilo je čista funkcija `core/wallVisibility.ts` (zunanja normala,
  prag s histerezo, pogled od zgoraj); uporablja se v `useFrame` brez pisanja v store.

## Dogovori modela (3D modeli proizvajalcev)

- Tip naprave ima lahko neobvezen **model** (`EquipmentType.model`, glTF binary `.glb`).
  Datoteka je v zasebnem vedru Supabase `equipment-models` pod
  `<id uporabnika>/<id tipa>/<ime>.glb`; vsak uporabnik dostopa samo do svoje mape.
- Model je **samo slika** v 3D: mere, priključki in odmiki veljajo iz tipa. Mere modela se
  le ponudijo v obrazcu (»Prevzemi mere iz modela«), shranijo se šele, ko jih uporabnik
  potrdi s shranjevanjem tipa.
- `model.bounds` (mm, osi modela: x desno, y gor, z proti gledalcu) se izmerijo ob nalaganju;
  `model.rotation` (0/90/180/270) obrne model, da je njegova sprednja stran spredaj.
- Datoteka ostane v shrambi tudi, ko se tip izbriše iz kataloga (postavljene naprave v
  projektih jo še uporabljajo).

## Dogovori modela (faza 3b: prostor, ovire, pravila)

- **Ovira** (`Obstacle`): kvader (`PlanBox`: središče, širina, globina, rotacija, spodnja
  višina, višina) s kategorijo `electrical | duct | structure | other`. Oznaka `OV-NN` je
  točen identifikator, enolična skupaj z oznakami naprav in izhodov.
- **Cona** (`Zone`): kvader vrste `forbidden` (ovira), `avoid` (dražja), `preferred`
  (cenejša; hevristika A* se pomnoži s faktorjem, da ostane spodnja meja).
- **Izolacija** je pri sistemu (`insulationThickness`, privzeto 0). Razmiki in trki vedno
  uporabljajo `effectiveDiameter` = zunanji premer + 2 × izolacija (`core/pipeSize.ts`).
- **Pravila projekta** (`scene.rules`) vnese uporabnik z virom. Aplikacija nima vgrajenih
  predpisov; začetni nabor je prazen. Pravilo deluje samo, ko je vklopljeno, ima vir in vse
  vrednosti (`ruleStatus`); neznan sistem pravilo izklopi, ne pokvari projekta.
  `hard` = prepoved (speljevanje je ne krši), sicer kazen (cena). `maxBends` je vedno samo
  opozorilo.
- **Preverjanje** `core/rules/checkRules.ts` teče za vse cevi (tudi ročne); kršitve so
  opozorila `ruleViolation` z mestom, izmerjeno in zahtevano vrednostjo ter virom.
  `heightRange` se meri na os vodoravnih odsekov.
- **Fiksni ravni odseki pri priključkih** (`portStraight`) niso podvrženi pravilom razmika
  in višine. Pri speljevanju se razmik do tujih nastavkov zmanjša le toliko, da ostane
  lastni nastavek prost (priključki proizvajalca so lahko bližje od razmika med cevmi).
- Sprememba ovir, con, pravil ali nastavitev znova spelje vse samodejne cevi.
- Uteži so v `ROUTING_COSTS` (`avoidZoneFactor`, `preferredZoneFactor`, `softRuleFactor`,
  `softCrossingPenalty`); so nastavitve aplikacije, ne predpisi.

## Dogovori modela (javni katalog)

- **Javni katalog** je v kodi (`src/catalog/public/`, ena datoteka na proizvajalca), viden
  vsem uporabnikom, samo za branje. Osebni katalog (`equipment_types`) ostane; izdelek se
  lahko kopira vanj. Navodila: [docs/javni-katalog.md](docs/javni-katalog.md).
- Id izdelka je stalen in enoličen (npr. `viessmann-vitocal-250-a-idu-a`).
- Modeli javnih izdelkov so v `public/library/<mapa>/<ime>.glb`; pot v tipu je
  `library/<mapa>/<ime>.glb` (`isPublicModelPath`) in se naloži iz aplikacije, ne iz shrambe.
  Mere izmeri `scripts/measure-model.mjs`; priključki in odmiki so iz navodil proizvajalca.

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
  stores/      Zustand store-i (editorStore: scena + undo/redo, izbor, orodje; catalogStore)
  editor/      urejevalnik: orodna vrstica, stranska plošča, bližnjice, shranjevanje
  catalog/     katalog naprav: predloge, obrazec tipa s predogledom, plošča
  editor2d/    2D tloris (SVG): pogled, orodja, sloji
  routing/     Web Worker za speljevanje cevi, samodejno speljevanje ob spremembah
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
