export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display text-xl font-extrabold tracking-tight ${className}`}>
      KELEPİR
      <span className="ml-0.5 inline-block h-2 w-2 rounded-full bg-coral align-middle" aria-hidden />
    </span>
  );
}
