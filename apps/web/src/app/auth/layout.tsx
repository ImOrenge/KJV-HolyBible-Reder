import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "계정",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
