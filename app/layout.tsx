import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { ToastProvider } from "@/src/shared_components/ui/Toast";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  // Mono is only used on the marketing pages — don't preload its files on every route.
  preload: false,
});

export const metadata: Metadata = {
  title: "Avoeline — Event Management Platform",
  description:
    "Avoeline helps organizers plan, execute, and analyse events — while connecting them with the best vendors in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // The script below stamps data-theme onto this element before React hydrates,
      // so the server HTML and the client DOM legitimately differ by one attribute.
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      {/* children stay a server-rendered slot, so mounting the provider here
          costs nothing -- no page becomes a Client Component because of it. */}
      <body className="min-h-full flex flex-col">
        {/* Theme, resolved before first paint. This has to be a blocking inline
            script: anything deferred — an effect, a module import, even
            next/script — runs after the first paint, and the user sees a white
            flash before dark mode lands. Stored choice wins; the OS preference is
            only the fallback, which is why the toggle can override it in both
            directions. Key is duplicated from ThemeToggle.tsx because this string
            is injected before any module exists to import from. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('avoeline-theme');" +
              "if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}" +
              "document.documentElement.dataset.theme=t}catch(e){}})()",
          }}
        />
        <ToastProvider>{children}</ToastProvider>
      </body>
      <SpeedInsights/>
    </html>
  );
}
