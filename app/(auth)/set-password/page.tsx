'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível definir a senha');
        return;
      }
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h1>Definir senha</h1>
      <p className="subtitle">Escolha uma senha para acessar o sistema</p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="password">Nova senha</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="confirmPassword">Confirmar senha</label>
          <input
            id="confirmPassword"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar e continuar'}
        </button>
      </form>
    </div>
  );
}
