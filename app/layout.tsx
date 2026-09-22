import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dynamic Highlights Inspector · Independent Exa Evaluation",
  description: "Explore paired Standard and Dynamic Highlights evaluations with score-versus-token plots and question-level evidence traces.",
  openGraph: {
    title: "Dynamic Highlights Inspector",
    description: "An independent paired evaluation of search evidence, answer quality, and agent token usage.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
