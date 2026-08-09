'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface FeatureRow {
  id: string;
  featureNumber: number;
  name: string;
  isActive: boolean;
}

export default function FeaturesTable({ features }: { features: FeatureRow[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Nao foi possivel criar a feature');
        return;
      }
      setName('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(feature: FeatureRow) {
    setPendingId(feature.id);
    try {
      const res = await fetch(`/api/admin/features/${feature.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !feature.isActive }),
      });
      if (res.ok) router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function rename(feature: FeatureRow) {
    const newName = window.prompt('Novo nome da feature:', feature.name);
    if (!newName || newName === feature.name) return;
    setPendingId(feature.id);
    try {
      const res = await fetch(`/api/admin/features/${feature.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="inline-form">
        <div className="field">
          <label htmlFor="name">Nova feature</label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da feature"
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Adicionando...' : 'Adicionar feature'}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}
      <p style={{ fontSize: '0.85rem', opacity: 0.75, marginBottom: 12 }}>
        O número de cada feature é fixo e nunca é reaproveitado, pois é usado no algoritmo de
        geração de codigo. &quot;Remover&quot; apenas desativa a feature, que deixa de aparecer na tela
        de geração de codigo.
      </p>
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Nome</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {features.map((f) => (
            <tr key={f.id}>
              <td>{f.featureNumber}</td>
              <td>{f.name}</td>
              <td>
                <span className={`badge ${f.isActive ? 'active' : 'disabled'}`}>
                  {f.isActive ? 'Ativa' : 'Inativa'}
                </span>
              </td>
              <td style={{ display: 'flex', gap: 8 }}>
                <button className="secondary" disabled={pendingId === f.id} onClick={() => rename(f)}>
                  Renomear
                </button>
                <button
                  className={f.isActive ? 'danger' : 'secondary'}
                  disabled={pendingId === f.id}
                  onClick={() => toggleActive(f)}
                >
                  {f.isActive ? 'Desativar' : 'Ativar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
