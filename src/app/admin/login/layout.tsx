export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Bypass admin layout (no sidebar, no auth check)
  return <>{children}</>;
}
