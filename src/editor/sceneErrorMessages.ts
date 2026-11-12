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
}

/** Slovenian message for a rejected scene edit. */
export function sceneErrorMessage(error: SceneError): string {
  return MESSAGES[error]
}
