import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KJV 성경 리더",
  robots: {
    index: false,
    follow: true,
  },
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
