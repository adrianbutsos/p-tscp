import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TSCP Content Strategy Agent",
  description: "No-code administration dashboard for TSCP content planning."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
