import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center justify-between border-b">
        <Link href="#" className="flex items-center gap-3" prefetch={false}>
          <Image 
            src="https://d1p8logw3f6tew.cloudfront.net/header_images/4yJWX6TaZj9J.jpeg"
            alt="ACISO Logo"
            width={120}
            height={40}
            className="h-10 w-auto"
          />
        </Link>
        <nav className="flex gap-4 sm:gap-6">
          <Link
            href="/login"
            className="text-sm font-medium hover:underline underline-offset-4"
            prefetch={false}
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium hover:underline underline-offset-4"
            prefetch={false}
          >
            Anmelden
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 text-center relative overflow-hidden min-h-[600px]">
          {/* Large Background Logo */}
          <div className="absolute inset-0 flex items-center justify-center opacity-8">
            <Image 
              src="https://d1p8logw3f6tew.cloudfront.net/header_images/4yJWX6TaZj9J.jpeg"
              alt="ACISO Background"
              width={1200}
              height={900}
              className="object-contain scale-125"
            />
          </div>
          
          {/* Glass Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-white/60 dark:from-gray-900/80 dark:to-gray-800/70 backdrop-blur-md"></div>
          
          <div className="container px-4 md:px-6 relative z-10">
            <div className="space-y-8">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none text-gray-900 dark:text-white drop-shadow-2xl">
                Intelligente Churn-Prävention für Fitnessstudios
              </h1>
              <p className="mx-auto max-w-[800px] text-gray-800 md:text-xl lg:text-2xl dark:text-gray-100 drop-shadow-xl font-medium">
                Hochrisikokunden mit KI-gestützter Analyse identifizieren und maßgeschneiderte Retention-Strategien entwickeln.
              </p>
              <div className="space-x-4 pt-6">
                <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-2xl text-lg px-8 py-4">
                   <Link href="/dashboard">Dashboard starten</Link>
                 </Button>
                 <Button variant="outline" asChild size="lg" className="shadow-2xl backdrop-blur-md bg-white/80 dark:bg-gray-800/80 border-2 text-lg px-8 py-4">
                   <Link href="/login">Anmelden</Link>
                 </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 relative overflow-hidden">
          {/* Background Logo */}
          <div className="absolute inset-0 flex items-center justify-center opacity-3">
            <Image 
              src="https://d1p8logw3f6tew.cloudfront.net/header_images/4yJWX6TaZj9J.jpeg"
              alt="ACISO Background"
              width={800}
              height={600}
              className="object-contain"
            />
          </div>
          
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center justify-center space-y-6 text-center mb-16">
              <h2 className="text-4xl font-bold tracking-tighter sm:text-5xl lg:text-6xl text-gray-900 dark:text-white">Funktionen</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Datenanalyse und Vorhersagemodelle für Fitnessstudios.
              </p>
            </div>
            <div className="mx-auto grid max-w-6xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3">
              <div className="group grid gap-4 p-8 rounded-2xl border-2 bg-white/80 dark:bg-gray-950/80 shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-sm hover:scale-105">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Churn-Risikoanalyse</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Gefährdete Kunden mit ML-basierten Vorhersagemodellen und präzisen Risiko-Scores identifizieren.
                </p>
              </div>
              
              <div className="group grid gap-4 p-8 rounded-2xl border-2 bg-white/80 dark:bg-gray-950/80 shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-sm hover:scale-105">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Personalisierte Retention-Pläne</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Maßgeschneiderte Strategien zur Kundenbindung mit ROI-Berechnungen und Erfolgsmetriken entwickeln.
                </p>
              </div>
              
              <div className="group grid gap-4 p-8 rounded-2xl border-2 bg-white/80 dark:bg-gray-950/80 shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-sm hover:scale-105 sm:col-span-2 lg:col-span-1">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">BigQuery ML Integration</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Leistungsstarke Cloud-ML-Modelle für präzise Vorhersagen und Echtzeit-Datenanalyse nutzen.
                </p>
              </div>
            </div>
          </div>
        </section>


      </main>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <Image 
            src="https://d1p8logw3f6tew.cloudfront.net/header_images/4yJWX6TaZj9J.jpeg"
            alt="ACISO Logo"
            width={60}
            height={20}
            className="h-5 w-auto"
          />
          <p className="text-xs text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} ACISO. Alle Rechte vorbehalten. Be Agil!
          </p>
        </div>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4 text-gray-600 dark:text-gray-400" prefetch={false}>
            Nutzungsbedingungen
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4 text-gray-600 dark:text-gray-400" prefetch={false}>
            Datenschutz
          </Link>
        </nav>
      </footer>
    </div>
  );
}
