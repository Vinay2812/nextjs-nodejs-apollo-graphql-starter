export default function WithNavbarAndFooterLayout({
  children,
}: React.PropsWithChildren) {
  return (
    <div>
      {children}
      <div>Footer</div>
    </div>
  );
}
