type WithNavbarLayoutProps = {
  children: React.ReactNode;
};

export default function WithNavbarLayout({ children }: WithNavbarLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <div>Navbar</div>
      {children}
    </div>
  );
}
