import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

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
      { rel: "icon", type: "image/png", href: "/favicon.png" },
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
  return <Outlet />;
}
