'use client';

import { useState, type FormEvent } from 'react';

interface ModelOption {
  id: string;
  productCode: string;
  name: string;
}

interface FeatureOption {
  id: string;
  featureNumber: number;
  name: string;
}

interface Result {
  featureNumber: number;
  featureName: string;
  code: string;
}

export default function GenerateForm({
  models,
  features,
}: {
  models: ModelOption[];
  features: FeatureOption[];
}) {
  const [productModelId, setProductModelId] = useState(models[0]?.id ?? '');
  const [serial, setSerial] = useState('');
  const [featureId, setFeatureId] = useState('ALL');
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const serialValid = serial.length === 15;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/codes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productModelId, serial, featureId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível gerar o codigo');
        return;
      }
      setResults((prev) => [...(data.results as Result[]), ...prev]);
    } finally {
      setLoading(false);
    }
  }

  function copyLog() {
    const text = results.map((r) => `${r.code}  -> ${r.featureName}`).join('\n');
    void navigator.clipboard.writeText(text);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="inline-form">
        <div className="field">
          <label htmlFor="model">Modelo do produto</label>
          <select id="model" value={productModelId} onChange={(e) => setProductModelId(e.target.value)}>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.productCode} ({m.name})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="serial">Número de série (15 caracteres)</label>
          <input
            id="serial"
            required
            maxLength={15}
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            style={
              serialValid || serial.length === 0
                ? undefined
                : { color: '#e5484d', borderColor: '#e5484d' }
            }
          />
        </div>
        <div className="field">
          <label htmlFor="feature">Opção</label>
          <select id="feature" value={featureId} onChange={(e) => setFeatureId(e.target.value)}>
            <option value="ALL">Todas as opções</option>
            {features.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={loading || !serialValid || !productModelId}>
          {loading ? 'Gerando...' : 'Build Code'}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}
      <div className="field">
        <label>Log</label>
        <pre className="log-output">
          {results.length === 0
            ? 'Os códigos gerados aparecem aqui.'
            : results.map((r) => `${r.code}  -> ${r.featureName}`).join('\n')}
        </pre>
      </div>
      {results.length > 0 && (
        <button type="button" className="secondary" onClick={copyLog}>
          Copiar log
        </button>
      )}
    </div>
  );
}
