export function Aurora() {
  const particles = Array.from({ length: 14 });
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute -top-32 -left-24 h-[520px] w-[520px] rounded-full opacity-70 blur-3xl animate-aurora"
        style={{ background: "radial-gradient(circle, oklch(0.88 0.11 20 / 0.85), transparent 70%)" }}
      />
      <div
        className="absolute top-1/3 -right-32 h-[480px] w-[480px] rounded-full opacity-60 blur-3xl animate-drift"
        style={{ background: "radial-gradient(circle, oklch(0.9 0.08 55 / 0.75), transparent 70%)" }}
      />
      <div
        className="absolute bottom-0 left-1/4 h-[420px] w-[420px] rounded-full opacity-50 blur-3xl animate-aurora"
        style={{ background: "radial-gradient(circle, oklch(0.86 0.06 35 / 0.7), transparent 70%)", animationDelay: "-8s" }}
      />

      {/* floating particles */}
      <div className="absolute inset-0">
        {particles.map((_, i) => {
          const size = 2 + ((i * 7) % 5);
          const left = (i * 37) % 100;
          const delay = (i * 0.7) % 8;
          const dur = 10 + ((i * 3) % 9);
          return (
            <span
              key={i}
              className="absolute rounded-full animate-float"
              style={{
                width: size,
                height: size,
                left: `${left}%`,
                bottom: `-${size + 4}px`,
                background: "oklch(0.85 0.11 20 / 0.55)",
                boxShadow: "0 0 10px oklch(0.85 0.11 20 / 0.6)",
                animationDelay: `-${delay}s`,
                animationDuration: `${dur}s`,
              }}
            />
          );
        })}
      </div>

      {/* subtle grain */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}
