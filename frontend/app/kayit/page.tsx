import { RegisterForm } from '@/components/auth/RegisterForm';
import { AuthAside } from '@/components/auth/AuthAside';

export default function KayitPage() {
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-5xl items-center gap-12 px-6 py-16 md:grid-cols-2">
      <AuthAside />
      <div className="flex justify-center md:justify-start">
        <div className="w-full max-w-sm">
          <h1 className="mb-6 font-display text-3xl font-extrabold">Kayıt ol</h1>
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
