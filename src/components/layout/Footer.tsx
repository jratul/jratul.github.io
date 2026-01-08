export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark-bg/50 backdrop-blur-sm mt-20 border-dark-border border-t">
      <div className="mx-auto px-4 py-8 max-w-7xl">
        {/* Copyright */}

        <p className="text-gray-500 text-sm text-center">
          © {currentYear} jratul.github.io.
        </p>
      </div>
    </footer>
  );
}
