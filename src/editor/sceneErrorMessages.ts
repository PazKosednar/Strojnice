import type { SceneError } from '../core/sceneResult'

const MESSAGES: Record<SceneError, string> = {
  invalidSize: 'Mere morajo biti cela števila v mm (širina in višina večji od 0).',
  doorSill: 'Vrata morajo biti brez parapeta (parapet 0 mm).',
  outsideWall: 'Odprtina ne sme segati čez konec stene.',
  tooTall: 'Odprtina je višja od stene (parapet + višina > višina stene).',
  overlap: 'Odprtina se prekriva z drugo odprtino v isti steni.',
  notFound: 'Element ne obstaja več.',
  wallTooShort: 'Stena ne sme imeti dolžine 0.',
  invalidValue: 'Vrednost mora biti celo število v mm, večje od 0.',
  openingsDoNotFit: 'Sprememba ni mogoča: odprtine v steni ne bi več imele prostora.',
  tagEmpty: 'Oznaka ne sme biti prazna.',
  tagTaken:
    'To oznako že ima drug element (naprava, izhod ali ovira). Oznaka mora biti v projektu enolična.',
  invalidPlacement: 'Položaj in višina morata biti celi števili v mm (višina od tal vsaj 0).',
  invalidSystem: 'Sistem mora imeti ime in barvo v obliki #rrggbb.',
  pipeSystemMismatch: 'Povezava ni mogoča: oba konca morata pripadati istemu sistemu.',
  pipeEndInUse: 'Ta priključek oziroma izhod je že povezan. Vsak ima lahko le eno cev.',
  pipeEndNoDiameter:
    'Priključek nima vnesenega zunanjega premera cevi. Vnesi ga v lastnostih naprave.',
  pipeSameEnd: 'Cev ne more imeti obeh koncev na istem mestu.',
  invalidRoute: 'Trasa mora biti sestavljena iz pravokotnih odsekov v celih mm.',
  invalidTerminal:
    'Izhod mora biti na steni (odmik znotraj dolžine stene, višina do višine stene), s sistemom in premerom.',
  invalidBox:
    'Mere morajo biti cela števila v mm (širina, globina in višina večje od 0, spodnja višina vsaj 0), zasuk 0–359°.',
  invalidRule:
    'Vrednosti pravila morajo biti cela števila v mm (razmiki 0 ali več); najnižja višina ne sme biti nad najvišjo.',
}

/** Slovenian message for a rejected scene edit. */
export function sceneErrorMessage(error: SceneError): string {
  return MESSAGES[error]
}
