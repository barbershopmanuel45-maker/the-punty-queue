import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import HideLovableBadge from "../components/HideLovableBadge";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },

      { title: "JuniorFADEfactory | Barber Shop London SE1" },

      {
        name: "description",
        content:
          "Barbería profesional en Londres. Reserva online, walk-ins, degradados, cortes clásicos y servicio VIP.",
      },

      { name: "author", content: "JuniorFADEfactory" },

      { property: "og:title", content: "JuniorFADEfactory | Barber Shop London SE1" },
      {
        property: "og:description",
        content:
          "Professional barber shop in London. Online booking, walk-ins, skin fades, classic cuts and VIP grooming services.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://juniorfadefactory.lovable.app/" },
      {
        property: "og:image",
        content: "https://juniorfadefactory.lovable.app/project-preview.png",
      },

      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "JuniorFADEfactory | Barber Shop London SE1" },
      {
        name: "twitter:description",
        content:
          "Professional barber shop in London. Online booking, walk-ins, skin fades, classic cuts and VIP grooming services.",
      },
      {
        name: "twitter:image",
        content: "https://juniorfadefactory.lovable.app/project-preview.png",
      },
      { name: "description", content: "Reserva online en JuniorFADEfactory Barber Shop London SE1. Cortes, degradados, barba y servicios VIP sin esperas. Agenda tu cita fácil y rápido." },
      { property: "og:description", content: "Reserva online en JuniorFADEfactory Barber Shop London SE1. Cortes, degradados, barba y servicios VIP sin esperas. Agenda tu cita fácil y rápido." },
      { name: "twitter:description", content: "Reserva online en JuniorFADEfactory Barber Shop London SE1. Cortes, degradados, barba y servicios VIP sin esperas. Agenda tu cita fácil y rápido." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/42ff160b-378a-4dad-9153-2aa741641bda/id-preview-54407ace--71e33015-6d41-47c8-9d77-b59cc8884a31.lovable.app-1782725912392.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/42ff160b-378a-4dad-9153-2aa741641bda/id-preview-54407ace--71e33015-6d41-47c8-9d77-b59cc8884a31.lovable.app-1782725912392.png" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <>
      <HideLovableBadge />
      <Outlet />
    </>
  );
}
