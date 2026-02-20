export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-dark-950">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-display text-gold mb-4">
          ADI Commodities Marketplace
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Institutional-grade decentralized commodities trading platform
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <a
            href="/trade"
            className="px-6 py-3 btn-gold rounded-lg font-semibold text-lg"
          >
            Start Trading
          </a>
          <a
            href="/admin"
            className="px-6 py-3 btn-outline-gold rounded-lg font-semibold text-lg"
          >
            Admin Dashboard
          </a>
        </div>
        <div className="mt-12 text-sm text-muted-foreground">
          <p>Chain ID: 99999 (ADI Testnet)</p>
          <p className="mt-2">Core infrastructure initialized ✓</p>
        </div>
      </div>
    </main>
  );
}
