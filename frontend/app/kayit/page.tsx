import { RegisterForm } from '@/components/auth/RegisterForm';
import { AuthAside } from '@/components/auth/AuthAside';

export default function KayitPage() {
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-5xl items-center gap-12 px-6 py-16 md:grid-cols-2">
      <div className="flex justify-center md:order-1 md:justify-start">
        <div className="w-full max-w-sm">
          <h1 className="mb-2 font-display text-3xl font-extrabold">Kayıt ol</h1>
          <p className="mb-6 font-body text-sm text-muted-2">
            30 saniyede hesap aç, fiyat alarmlarını kur.
          </p>
          <RegisterForm />
        </div>
      </div>
      <div className="md:order-2">
        <AuthAside />
      </div>
    </main>
  );
}
