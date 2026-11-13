# Javni katalog: kako dodaš izdelek

Javni katalog je del kode in ga vidijo vsi uporabniki. Osebni katalog (tabela
`equipment_types`) ostane: vsak uporabnik si lahko izdelek iz javnega kataloga kopira in ga
dopolni ali doda svoje tipe.

## Koraki

1. **Model** (neobvezno, `.glb`) shrani v `public/library/<proizvajalec>/`, npr.
   `public/library/viessmann/Vitocal-250-A_IDU-A.glb`. Mapa: male črke, številke in `-`.
   Ime datoteke: črke, številke, `.`, `_`, `-` (brez presledkov).
2. **Izmeri model:**

   ```
   node scripts/measure-model.mjs public/library/viessmann/Vitocal-250-A_IDU-A.glb
   ```

   Izpiše `bounds` (prepiši jih v izdelek) in mere š × g × v. Mere preveri v dokumentaciji
   proizvajalca: veljajo mere tipa, model je samo slika.

3. **Izdelek** vpiši v `src/catalog/public/<proizvajalec>.ts` (vzorec: `viessmann.ts`).
   Nov proizvajalec: novo datoteko dodaj v seznam v `src/catalog/public/index.ts`.
   - `id`: enoličen, nikoli ga ne spreminjaj (npr. `viessmann-vitocal-250-a-idu-a`).
   - `tagPrefix`: predpona oznak (`HP`, `IDU`, `CYL` …).
   - `shape`: `box` (širina, globina, višina) ali `cylinder` (premer, višina), mm.
   - `mounting`: `floor` ali `wall`.
   - `ports`: priključki iz navodil proizvajalca. Položaj v lokalnih koordinatah naprave
     (izhodišče v središču tlorisa spodaj; x desno, +y hrbet, −y spredaj, z gor), smer
     (`+x`, `-x`, `+y`, `-y`, `+z`, `-z`), sistem (`supply`, `return`, `dhw`, `cold`),
     `size` (besedilo, npr. `DN25`) in `outerDiameter` (mm, potreben za cevi).
   - `clearances`: servisni odmiki iz navodil (`front`, `back`, `left`, `right`, `top`).
   - `model.rotation`: 0/90/180/270, da je sprednja stran modela spredaj.
4. Zaženi `npm test`: test preveri, da je vsak izdelek veljaven, da so id-ji enolični in da
   datoteka modela obstaja.

Sprememba izdelka ne spremeni že postavljenih naprav v projektih (te imajo svojo kopijo tipa).
