import Link from "next/link";

type ModulePageProps = {
  title: string;
  description: string;
  highlights: string[];
};

export function ModulePage({
  title,
  description,
  highlights,
}: ModulePageProps) {
  return (
    <div className="page-shell">
      <section className="hero">
        <article className="hero-card">
          <p className="eyebrow">Modulo</p>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="actions">
            <Link className="button" href="/stock">
              Ver modulo operativo actual
            </Link>
            <Link className="button-secondary" href="/">
              Volver al dashboard
            </Link>
          </div>
        </article>
        <article className="hero-card">
          <h2>Alcance previsto</h2>
          <div className="trace-list">
            {highlights.map((item) => (
              <div className="trace-item" key={item}>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
