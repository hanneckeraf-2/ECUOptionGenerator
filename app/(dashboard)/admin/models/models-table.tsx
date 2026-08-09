'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface ModelRow {
  id: string;
  productCode: string;
  name: string;
  isActive: boolean;
}

export default function ModelsTable({ models }: { models: ModelRow[] }) {
  const router = useRouter();
  const [productCode, setProductCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productCode, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Nao foi possivel criar o modelo');
        return;
      }
      setProductCode('');
      setName('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(model: ModelRow) {
    setPendingId(model.id);
    try {
      const res = await fetch(`/api/admin/models/${model.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !model.isActive }),
      });
      if (res.ok) router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(model: ModelRow) {
    if (!window.confirm(`Remover o modelo ${model.productCode}? Esta acao nao pode ser desfeita.`)) return;
    setPendingId(model.id);
    try {
      const res = await fetch(`/api/admin/models/${model.id}`, { method: 'DELETE' });
      if (res.ok) router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="inline-form">
        <div className="field">
          <label htmlFor="productCode">Codigo de produto (11 caracteres)</label>
          <input
            id="productCode"
            required
            maxLength={11}
            value={productCode}
            onChange={(e) => setProductCode(e.target.value)}
            placeholder="800.1004.02"
          />
        </div>
        <div className="field">
          <label htmlFor="name">Nome</label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="PR-SPORT"
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Adicionando...' : 'Adicionar modelo'}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Codigo</th>
            <th>Nome</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.id}>
              <td>{m.productCode}</td>
              <td>{m.name}</td>
              <td>
                <span className={`badge ${m.isActive ? 'active' : 'disabled'}`}>
                  {m.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td style={{ display: 'flex', gap: 8 }}>
                <button className="secondary" disabled={pendingId === m.id} onClick={() => toggleActive(m)}>
                  {m.isActive ? 'Desativar' : 'Ativar'}
                </button>
                <button className="danger" disabled={pendingId === m.id} onClick={() => handleDelete(m)}>
                  Remover
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
