'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível confirmar o código');
        return;
      }
      router.push('/set-password');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Não foi possível reenviar o código');
      return;
    }
    setInfo('Código reenviado. Confira sua caixa de entrada.');
  }

  return (
    <div className="card">
      <h1>Confirmar e-mail</h1>
      <p className="subtitle">Informe o código de 6 dígitos enviado para seu e-mail</p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="code">Código</label>
          <input
            id="code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        {info && <p className="success-text">{info}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Confirmando...' : 'Confirmar'}
        </button>
      </form>
      <p className="helper-link">
        Não recebeu?{' '}
        <a onClick={handleResend} style={{ cursor: 'pointer', color: '#0070f3', fontWeight: 600 }}>
          Reenviar código
        </a>
      </p>
    </div>
  );
}
