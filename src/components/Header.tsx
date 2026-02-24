const Header = () => (
  <header
    className="w-full py-3"
    style={{ background: 'hsl(var(--navy))' }}
  >
    <div className="mx-auto flex max-w-[1200px] items-center gap-4 px-6">
      <img
        src="/images/logo.png"
        alt="नाशिक शहर पोलीस लोगो"
        className="h-12 w-12 rounded-full bg-white/10 object-contain"
      />
      <div>
        <h1 className="text-[28px] font-bold leading-tight text-primary-foreground">
          नाशिक FIR चेकर
        </h1>
        <p className="text-sm text-primary-foreground/80">
          नाशिक शहर पोलीस
        </p>
      </div>
    </div>
  </header>
);

export default Header;
