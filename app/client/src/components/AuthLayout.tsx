import type { ReactNode } from 'react';

export default function AuthLayout({ title, description, children }: {
  title: string; description: string; children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-950 text-white lg:grid lg:grid-cols-2">
      <section className="relative overflow-hidden px-6 py-10 sm:px-12 lg:flex lg:flex-col lg:justify-between lg:p-16">
        <div className="pointer-events-none absolute -right-24 top-24 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="relative flex items-center gap-3 text-sm font-semibold tracking-wide">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-300/30 bg-teal-300/10 text-xl text-teal-200">↗</span>
          UNITY · LEARNING WORKSHOP
        </div>
        <div className="relative max-w-lg py-10 lg:py-20">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.25em] text-teal-300">Lernen. Ausprobieren. Gestalten.</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Deine Idee.<br />Dein nächstes Spiel.</h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-slate-400">Ein Platz für deine Unity-Projekte: kleine Schritte, eigene Experimente und Feedback, das dich weiterbringt.</p>
          <ol className="mt-10 space-y-4 text-sm text-slate-300">
            {['Entdecke den Workshop', 'Setze deine Ideen um', 'Teile dein Ergebnis'].map((text, i) => (
              <li key={text} className="flex items-center gap-4"><span className="font-mono text-xs text-teal-300">0{i + 1}</span>{text}</li>
            ))}
          </ol>
        </div>
        <p className="hidden text-xs text-slate-500 lg:block">Neugier ist dein bester Ausgangspunkt.</p>
      </section>
      <section className="flex items-center justify-center rounded-t-3xl bg-slate-50 px-6 py-12 text-slate-900 lg:rounded-none lg:p-16">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="mb-8 mt-3 text-sm leading-relaxed text-slate-500">{description}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
