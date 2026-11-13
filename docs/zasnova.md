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
└─ Postgres + RLS:
   ├─ projects(id, owner_id, name, scene jsonb, created_at, updated_at)
   └─ equipment_types(id, owner_id, name, definition jsonb, created_at, updated_at)
```

### Model scene (izhodišče)

```ts
interface Scene {
  version: number // verzija sheme, za migracije modela (trenutno 2)
  units: 'mm'
  settings: SceneSettings // privzete mere novih elementov, mreža, sistemi
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

### Faza 2: parametrični katalog naprav (končana)

Izvedeno: sistemi v nastavitvah projekta, tipi naprav (kvader/valj, montaža, priključki,
odmiki) v katalogu uporabnika (tabela `equipment_types`), postavljanje s snapom na lice
stene, premikanje, vrtenje, podvajanje, oznake (`HP-01` ...), opozorila za trke, kršene
odmike in neznane sisteme, prikaz naprav s priključki v 2D in 3D, scena verzije 2 z
migracijo iz verzije 1. Odprto za kasneje: urejanje mer že postavljene naprave (zdaj:
uredi tip v katalogu in postavi znova), upoštevanje odprtin pri trkih, vogalne cone odmikov.

Prvotni obseg:

- Naprave kot parametrična telesa: kvader ali valj z merami, ki jih vnese uporabnik
- Priključki na napravi: položaj, smer, dimenzija in sistem:
  dvižni vod, povratek, STV (sanitarna topla voda), hladna voda
- Oznaka naprave (npr. `HP-01`, `CYL-01`) kot točen identifikator
- Servisni odmiki, ki jih vnese uporabnik
- Postavljanje naprav v prostor, vrtenje, snap na steno
- Kontrola trkov (naprava–stena, naprava–naprava, servisni odmiki)

### Faza 3: samodejno speljevanje cevi (končana)

Izvedeno: zunanji premer na priključkih (vnese uporabnik), izhodi v steni, cevi z
pravilom »isti sistem, en priključek – ena cev«, scena verzije 3 z migracijo iz 1 in 2,
A* po 3D mreži s kaznimi za kolena, oddaljenost od sten, prečkanje sten in cone odmikov,
rezervacija izhodnih odsekov drugih priključkov, preboji sten, Web Worker z omejitvijo
časa (2 s na cev, varovalka 5 s) in velikosti mreže (preverjena pred gradnjo), ponovno
speljevanje ob premiku naprave (zamik 500 ms, razveljavi se skupaj s premikom), ročni
popravki (vlečenje odseka, dodajanje in brisanje oglišča, višina odseka), legenda
sistemov, cevi in izhodi v 3D, čist 3D pogled (skrivanje sprednjih sten s histerezo,
nizek obris, pogled od zgoraj).

Omejitve in odprto:

- Začetne vrednosti razmika med cevmi (50 mm), ravnega odseka (100 mm) in vse kazni
  niso iz standarda; uporabnik jih nastavi po projektni dokumentaciji.
- Speljevanje je zaporedno (prej speljane cevi so ovira za kasnejše); ni globalne
  optimizacije vrstnega reda.
- Pri trkih in speljevanju se odprtine upoštevajo, cone odmikov pa le kot cena.
- Odseki, ki potekajo navpično, se v 2D ne vlečejo (urejajo se prek višine sosednjih
  vodoravnih odsekov).
- Navpični odseki se v 2D prikažejo kot krog; višina cevi v tlorisu ni kotirana (faza 4).

Prvotni obseg:

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

### Modeli proizvajalcev (prestavljeno iz faze 5, izvedeno)

Tip naprave ima lahko 3D model `.glb` (npr. Viessmann Vitocal 250-A), ki se v 3D nariše
namesto kvadra ali valja. Shranjen je v zasebni shrambi Supabase. Mere modela se ponudijo
v obrazcu tipa, priključke in odmike vnese uporabnik.

### Faza 5 (kasneje)

- Uvoz 3D skena prostora (GLB/USDZ)
- Samodejna razporeditev naprav
- iOS aplikacija za LiDAR skeniranje

### Izven V1

- LiDAR skeniranje v sami spletni aplikaciji
- Hidravlični izračun (padci tlaka, dimenzioniranje)
- Končni izgled / CGP (celostna grafična podoba)
