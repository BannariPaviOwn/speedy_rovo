import type { Metadata } from "next";
import { DM_Sans, Syne, Geist } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "@/components/providers/role-provider";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Rovo Court Admin — Elite Management",
  description:
    "Badminton court operations: schedule, bookings, courts, and admin roles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "dark",
        "h-full",
        "antialiased",
        dmSans.variable,
        syne.variable,
        "font-sans",
        geist.variable,
      )}
    >
      <body className="min-h-full">
        <RoleProvider>{children}</RoleProvider>
      </body>
    </html>
  );
}
