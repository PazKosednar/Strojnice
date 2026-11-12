interface Props {
  missing: string[]
}

/** Shown instead of the app when Supabase env variables are not set. */
export function ConfigMissing({ missing }: Props) {
  return (
    <main className="page">
      <h1>Manjka nastavitev Supabase</h1>
      <p>V datoteki .env.local manjkajo ali so neveljavne vrednosti:</p>
      <ul>
        {missing.map((name) => (
          <li key={name}>
            <code>{name}</code>
          </li>
        ))}
      </ul>
      <p>
        Kopiraj <code>.env.example</code> v <code>.env.local</code>, vpiši vrednosti iz Supabase
        (Project Settings → API) in znova zaženi <code>npm run dev</code>.
      </p>
    </main>
  )
}
