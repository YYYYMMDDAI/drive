// ===== カウンターコンポーネント =====

interface CounterProps {
  value: number;
  onChange: (value: number) => void;
}

export function Counter({ value, onChange }: CounterProps) {
  const increment = () => onChange(value + 1);
  const decrement = () => onChange(value - 1);
  const reset = () => onChange(0);

  return (
    <div className="section">
      <h2 className="section-title">カウンター</h2>
      <div className="counter-display">{value}</div>
      <div className="counter-buttons">
        <button className="btn btn-secondary" onClick={decrement}>
          -1
        </button>
        <button className="btn btn-secondary" onClick={reset}>
          リセット
        </button>
        <button className="btn btn-primary" onClick={increment}>
          +1
        </button>
      </div>
    </div>
  );
}
