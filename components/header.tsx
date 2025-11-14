import Image from "next/image";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background ">
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo and Brand */}
          <div className="flex items-center gap-2 md:gap-3">
            <Image
              alt="InstantOTP Logo"
              src="/images/logo.svg"
              width={32}
              height={32}
              priority={true}
              quality={100}
              className="h-8 w-8 rounded-sm md:h-10 md:w-10"
            />
            <h2 className="text-lg font-semibold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent md:text-xl">
              InstantOTP
            </h2>
          </div>

          {/* Auth/User Section */}
        </div>
      </div>
    </header>
  );
}
