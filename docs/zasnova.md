# Zasnova aplikacije

## Namen

Spletna aplikacija za načrtovanje strojnih inštalacij v tehničnih prostorih (strojnicah).
Projektant ali monter:

1. vriše prostor po merah (stene, vrata, okna),
2. postavi naprave (toplotna črpalka, hranilnik, raztezna posoda, razdelilnik ...),
3. pusti aplikaciji, da med priključki samodejno spelje cevi,
4. po potrebi traso ročno popravi,
5. izvozi tloris, legendo in popis materiala.

Isti model se sproti prikazuje v 2D tlorisu in v 3D pogledu.

## Načela

- **En model scene.** Projekt je en JSON dokument (`scene`), shranjen v Postgres (`jsonb`).
  Vse dolžine so v milimetrih, cela števila. 2D in 3D pogled sta samo prikaza modela in
  nimata lastnega stanja geometrije; vsaka sprememba gre skozi model.
- **Čisto jedro.** Vsa geometrija (presečišča, trki, iskanje poti, izračuni dolžin) je v
  `src/core/` kot čisti TypeScript brez Reacta in DOM-a ter je v celoti pokrita s testi.
- **Podatke vnaša uporabnik.** Mere naprav, servisni odmiki in standardi se ne
  izmišljujejo; aplikacija jih ne predpostavlja, temveč jih vnese uporabnik.
- **Oznake so identifikatorji.** Oznake, kot so `HP-01` ali `CYL-01`, se ohranijo točno
  tako, kot jih vnese uporabnik.
- **Jezik.** Uporabniški vmesnik v slovenščini, koda in komentarji v angleščini.

## Arhitektura

```
Brskalnik
├─ React UI (strani, obrazci, orodne vrstice)
│   ├─ 2D urejevalnik (SVG)        ─┐
│   └─ 3D pogled (React Three Fiber)├─ prikaz istega modela
├─ Zustand store (trenutna scena, izbor, orodje)
└─ src/core (čisti TS: model, geometrija, trki, poti)

Supabase
├─ Auth (e-pošta + geslo)
└─ Postgres: projects(id, owner_id, name, scene jsonb, created_at, updated_at) + RLS
```

### Model scene (izhodišče)

```ts
interface Scene {
  version: number // verzija sheme, za migracije modela
  units: 'mm'
  walls: Wall[]
  openings: Opening[] // vrata, okna
  equipment: Equipment[]
  pipes: Pipe[]
}
```

Tipi elementov se dopolnjujejo po fazah. Ob vsaki spremembi oblike shranjenega modela se
poveča `version` in doda migracija v `src/core/`.

## Faze

### Faza 0: ogrodje, Supabase, prijava

- Vite + React + TS (strict), React Router, Zustand, ESLint, Prettier, Vitest
- Supabase odjemalec, ključi iz `.env.local`
- Tabela `projects` z RLS (uporabnik vidi in ureja samo svoje projekte)
- Strani: prijava/registracija, seznam projektov (ustvari, preimenuj, izbriši), stran
  projekta (zaenkrat brez urejevalnika)
- Prazen model scene (`createEmptyScene()`), s katerim se ustvari nov projekt

### Faza 1: projekti + 2D risanje prostora + 3D prikaz (končana)

Izvedeno: model sten in odprtin z nastavitvami projekta, `parseScene`, čiste operacije
nad sceno, snap (mreža, krajišča, pravi kot), 2D urejevalnik (orodja Izberi/Stena/Vrata/
Okno/Briši, vtipkana dolžina, pravokoten prostor, vlečenje krajišč, kote, merilo),
plošča lastnosti, undo/redo, samodejno shranjevanje s ponovnimi poskusi, 3D prikaz z
izrezanimi odprtinami. Višina prostora je višina posamezne stene. Odprto za kasneje:
premikanje odprtine z vlečenjem, spajanje stene v sredino druge stene (T-stik).

Prvotni obseg:

- Shranjevanje in nalaganje scene projekta
- 2D urejevalnik (SVG): risanje sten po merah (vnos dolžin in kotov), debelina sten
- Vrata in okna v steni (položaj, širina, višina, parapet)
- Višina prostora
- Kote/odčitek mer med risanjem, mreža in pripenjanje
- 3D prikaz istega modela (React Three Fiber), orbit kamera
- Razveljavi/uveljavi (undo/redo)

### Faza 2: parametrični katalog naprav

- Naprave kot parametrična telesa: kvader ali valj z merami, ki jih vnese uporabnik
- Priključki na napravi: položaj, smer, dimenzija in sistem:
  dvižni vod, povratek, STV (sanitarna topla voda), hladna voda
- Oznaka naprave (npr. `HP-01`, `CYL-01`) kot točen identifikator
- Servisni odmiki, ki jih vnese uporabnik
- Postavljanje naprav v prostor, vrtenje, snap na steno
- Kontrola trkov (naprava–stena, naprava–naprava, servisni odmiki)

### Faza 3: samodejno speljevanje cevi

- Iskanje poti med dvema priključkoma po 3D mreži
- Pravokotne trase (samo osni odseki in koleni)
- Cenovna funkcija: dolžina, število kolen, prednost poteka ob stenah
- Brez trkov z napravami, stenami in drugimi cevmi (z odmikom)
- Ročni popravki trase (premik odseka, dodajanje/brisanje točk), ki ostanejo veljavni

### Faza 4: dokumentacija in izvoz

- Kote v tlorisu
- Legenda sistemov (barve, oznake)
- Izvoz PDF in PNG
- Popis: dolžine cevi po sistemih in dimenzijah, število kolen, seznam naprav

### Faza 5 (kasneje)

- Uvoz 3D skena prostora (GLB/USDZ)
- Modeli proizvajalcev (namesto parametričnih teles)
- Samodejna razporeditev naprav
- iOS aplikacija za LiDAR skeniranje

### Izven V1

- LiDAR skeniranje v sami spletni aplikaciji
- Hidravlični izračun (padci tlaka, dimenzioniranje)
- Končni izgled / CGP (celostna grafična podoba)
