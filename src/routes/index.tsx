import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import logo from "@/assets/logo.jpeg";
import hero from "@/assets/hero.jpeg";

import {
  translations,
  services,
  barberProfessionals,
  hairProfessionals,
  type Lang,
} from "@/lib/i18n";

import PuntyAssistant from "@/components/PuntyAssistant";
import Reminders from "@/components/Reminders";
import Reviews from "@/components/Reviews";

import {
  createBooking,
  createWalkin,
  listBookings,
} from "@/lib/data";

import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "El Punty Barber Shop — London" },
      {
        name: "description",
        content:
          "Modern barbershop in London. Book online or join the walk-in queue. No waiting.",
      },
      { property: "og:title", content: "El Punty Barber Shop" },
      {
        property: "og:description",
        content: "Your cut, on your time. No waiting.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/project-preview.jpeg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "El Punty Barber Shop" },
      {
        name: "twitter:description",
        content: "Your cut, on your time. No waiting.",
      },
      { name: "twitter:image", content: "/project-preview.jpeg" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    links: [
      { rel: "icon", href: "/favicon.jpeg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href:
          "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [lang, setLang] = useState<Lang>("es");

  useEffect(() => {
    const stored = localStorage.getItem("elpunty_lang") as Lang | null;

    if (stored === "es" || stored === "en") {
      setLang(stored);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("elpunty_lang", lang);
  }, [lang]);

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header lang={lang} setLang={setLang} t={t} />

      <Hero t={t} />

      <Problem t={t} />

      <DataSection t={t} />

      <Solution t={t} />

      <Services t={t} lang={lang} />

      <Booking t={t} lang={lang} />

      <Walkin t={t} />
<<<<<<< HEAD

      <Reviews lang={lang} />

=======
      
      <Reviews lang={lang} />
      
>>>>>>> c987d3f (reviews working on stable deploy)
      <Benefits t={t} />

      <Reminders lang={lang} />

      <Footer t={t} />

      <PuntyAssistant lang={lang} setLang={setLang} />
    </div>
  );
}

function Header({
  lang,
  setLang,
  t,
}: {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: any;
}) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-3">
          <img
            src={logo}
            alt="El Punty"
            className="w-11 h-11 rounded-full object-cover shadow-soft"
          />

          <div className="leading-tight">
            <div className="font-bold text-brand-blue text-lg">
              EL PUNTY
            </div>

            <div className="text-[10px] tracking-[0.2em] text-brand-gray">
              BARBER SHOP
            </div>
          </div>
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#services" className="hover:text-brand-red transition">
            {t.nav.services}
          </a>

          <a href="#booking" className="hover:text-brand-red transition">
            {t.nav.booking}
          </a>

          <a href="#walkin" className="hover:text-brand-red transition">
            {t.nav.walkin}
          </a>

          <a href="#contact" className="hover:text-brand-red transition">
            {t.nav.contact}
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-secondary rounded-full p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLang("es")}
              className={`px-3 py-1 rounded-full transition ${
                lang === "es"
                  ? "bg-white text-brand-blue shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              ES
            </button>

            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-3 py-1 rounded-full transition ${
                lang === "en"
                  ? "bg-white text-brand-blue shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              EN
            </button>
          </div>

          <a
            href="#booking"
            className="hidden sm:inline-flex items-center bg-gradient-brand text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-soft hover:scale-105 transition"
          >
            {t.cta || t.hero?.book || "Reservar ahora"}
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero({ t }: { t: any }) {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img src={hero} alt="El Punty interior" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-black/85 via-brand-black/60 to-brand-black/30" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-28 md:py-40">
        <div className="max-w-2xl text-white animate-fade-up">
          <span className="inline-block px-3 py-1 bg-brand-red/90 rounded-full text-xs font-semibold tracking-wider mb-6">
            LONDON · SE1
          </span>

          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-5">
            {t.hero.title}
          </h1>

          <p className="text-lg md:text-xl text-white/85 mb-8 max-w-xl">
            {t.hero.subtitle}
          </p>

          <div className="flex flex-wrap gap-3">
            <a href="#booking" className="bg-gradient-brand text-white px-7 py-3.5 rounded-full font-semibold shadow-soft hover:scale-105 transition">
              {t.hero.book}
            </a>

            <a href="#solution" className="bg-white/10 backdrop-blur border border-white/30 text-white px-7 py-3.5 rounded-full font-semibold hover:bg-white/20 transition">
              {t.hero.how}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Problem({ t }: { t: any }) {
  const icons = ["📈", "⏰", "💻", "😩"];

  return (
    <section className="py-20 md:py-28 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <SectionTitle title={t.problem.title} subtitle={t.problem.subtitle} />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {t.problem.items.map((it: any, i: number) => (
            <div key={i} className="bg-card rounded-2xl p-6 shadow-card hover:shadow-soft hover:-translate-y-1 transition">
              <div className="text-4xl mb-4">{icons[i]}</div>
              <h3 className="font-bold text-lg mb-2 text-brand-blue">{it.t}</h3>
              <p className="text-sm text-muted-foreground">{it.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DataSection({ t }: { t: any }) {
  return (
    <section className="py-20 md:py-28 px-4 sm:px-6 bg-gradient-to-br from-secondary to-white">
      <div className="max-w-7xl mx-auto">
        <SectionTitle title={t.data.title} />

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <div className="bg-card rounded-3xl p-10 shadow-card">
            <div className="text-6xl md:text-7xl font-bold text-brand-red mb-2">
              -30%
            </div>
            <p className="text-muted-foreground">{t.data.lost}</p>
            <div className="mt-6 h-3 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-brand-red rounded-full" style={{ width: "30%" }} />
            </div>
          </div>

          <div className="bg-card rounded-3xl p-10 shadow-card">
            <div className="text-6xl md:text-7xl font-bold text-brand-blue mb-2">
              £15,000
            </div>
            <p className="text-muted-foreground">{t.data.money}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Solution({ t }: { t: any }) {
  const icons = ["📅", "⚡", "✨"];

  return (
    <section id="solution" className="py-20 md:py-28 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <SectionTitle title={t.solution.title} subtitle={t.solution.subtitle} />

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {t.solution.steps.map((s: any, i: number) => (
            <div key={i} className="relative bg-card rounded-2xl p-8 shadow-card hover:shadow-soft transition">
              <div className="absolute -top-5 left-8 w-10 h-10 rounded-full bg-gradient-brand text-white font-bold flex items-center justify-center shadow-soft">
                {i + 1}
              </div>
              <div className="text-5xl mb-4 mt-2">{icons[i]}</div>
              <h3 className="font-bold text-xl mb-2 text-brand-blue">{s.t}</h3>
              <p className="text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Services({ t, lang }: { t: any; lang: Lang }) {
  return (
    <section id="services" className="py-20 md:py-28 px-4 sm:px-6 bg-secondary/40">
      <div className="max-w-7xl mx-auto">
        <SectionTitle title={t.services.title} subtitle={t.services.subtitle} />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {services.map((s) => (
            <div key={s.id} className="bg-card rounded-2xl p-6 shadow-card hover:shadow-soft hover:-translate-y-1 transition flex items-center gap-4">
              <div className="text-4xl">{s.icon}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  {lang === "es" ? s.name_es : s.name_en}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {s.duration} {t.services.min}
                </p>
              </div>
              <div className="text-brand-blue font-bold text-lg">£{s.price}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Booking({ t, lang }: { t: any; lang: Lang }) {
  return (
    <section id="booking" className="py-20 md:py-28 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <SectionTitle
          title={t.booking.title}
          subtitle={t.booking.subtitle}
        />

        <div className="bg-card rounded-3xl p-6 md:p-10 shadow-soft mt-12 text-center">
          <p className="text-muted-foreground">
            Formulario de reservas activo.
          </p>
        </div>
      </div>
    </section>
  );
}

function Walkin({ t }: { t: any }) {
  return (
    <section
      id="walkin"
      className="py-20 md:py-28 px-4 sm:px-6 bg-gradient-to-br from-brand-blue to-brand-black text-white"
    >
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-3">
          {t.walkin.title}
        </h2>

        <p className="text-white/70 max-w-2xl mx-auto">
          {t.walkin.subtitle}
        </p>
      </div>
    </section>
  );
}

function Benefits({ t }: { t: any }) {
  const icons = ["⚡", "🎯", "💎", "🚀"];

  return (
    <section className="py-20 md:py-28 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <SectionTitle title={t.benefits.title} />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {t.benefits.items.map((b: any, i: number) => (
            <div
              key={i}
              className="bg-card rounded-2xl p-6 shadow-card hover:shadow-soft hover:-translate-y-1 transition text-center"
            >
              <div className="text-4xl mb-3">{icons[i]}</div>

              <h3 className="font-bold text-brand-blue mb-2">
                {b.t}
              </h3>

              <p className="text-sm text-muted-foreground">
                {b.d}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ t }: { t: any }) {
  return (
    <footer
      id="contact"
      className="bg-brand-black text-white px-4 sm:px-6 py-16"
    >
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img
              src={logo}
              alt="El Punty"
              className="w-12 h-12 rounded-full"
            />

            <div>
              <div className="font-bold text-lg">
                EL PUNTY
              </div>

              <div className="text-[10px] tracking-[0.2em] text-white/60">
                BARBER SHOP
              </div>
            </div>
          </div>

          <p className="text-sm text-white/60 max-w-xs">
            London's modern barbershop experience.
            Tradition meets technology.
          </p>
        </div>

        <div>
          <h4 className="font-bold mb-3 text-brand-red">
            {t.footer.address}
          </h4>

          <p className="text-sm text-white/70 leading-relaxed">
            212 Old Kent Rd
            <br />
            London SE1 5TY
          </p>
        </div>

        <div>
          <h4 className="font-bold mb-3 text-brand-red">
            {t.footer.hours}
          </h4>

          <p className="text-sm text-white/70 leading-relaxed">
            {t.footer.mon}
            <br />
            {t.footer.sun}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-white/10 text-xs text-white/50 text-center">
        © {new Date().getFullYear()} El Punty Barber Shop.{" "}
        {t.footer.rights}
      </div>
    </footer>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <h2 className="text-3xl md:text-5xl font-bold text-brand-blue mb-3">
        {title}
      </h2>

      {subtitle && (
        <p className="text-muted-foreground text-lg">
          {subtitle}
        </p>
      )}
    </div>
  );
}