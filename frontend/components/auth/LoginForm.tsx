'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RegisterForm() {
  return <CredentialForm mode="register" />;
}
export function LoginForm() {
  return <CredentialForm mode="login" />;
}

function CredentialForm({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isLogin = mode === 'login';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
      router.push('/');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Bir şeyler ters gitti, tekrar dene.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="sen@ornek.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Şifre</Label>
        <Input
          id="password"
          type="password"
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="En az 8 karakter"
        />
      </div>
      {error && (
        <p role="alert" className="font-mono text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? 'Bir saniye…' : isLogin ? 'Giriş yap' : 'Kayıt ol'}
      </Button>
      <p className="text-center font-body text-sm text-muted-2">
        {isLogin ? (
          <>
            Hesabın yok mu?{' '}
            <Link href="/kayit" className="text-coral hover:underline">
              Kayıt ol
            </Link>
          </>
        ) : (
          <>
            Zaten üye misin?{' '}
            <Link href="/giris" className="text-coral hover:underline">
              Giriş yap
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
