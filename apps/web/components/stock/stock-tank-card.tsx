type StockTankCardProps = {
  name: string;
  productName: string;
  currentLiters: number;
  capacityLiters: number;
  fillPercent: number;
  statusLabel: string;
  notes?: string;
};

export function StockTankCard(props: StockTankCardProps) {
  const {
    name,
    productName,
    currentLiters,
    capacityLiters,
    fillPercent,
    statusLabel,
    notes,
  } = props;

  return (
    <article className="tank-card">
      <div className="tank-card-header">
        <div>
          <strong>{name}</strong>
          <div className="hint">{productName}</div>
        </div>
        <span className="status-pill">{statusLabel}</span>
      </div>

      <div className="tank-visual">
        <div className="tank-shell">
          <div
            className="tank-fill"
            style={{ height: `${Math.max(fillPercent, 8)}%` }}
          />
        </div>
        <div className="tank-metrics">
          <div className="tank-percentage">{fillPercent}%</div>
          <div className="hint">
            {currentLiters.toLocaleString()} / {capacityLiters.toLocaleString()} lts
          </div>
        </div>
      </div>

      {notes ? <div className="hint">Alias comercial: {notes}</div> : null}
    </article>
  );
}
