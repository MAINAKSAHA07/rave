import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-auto">
      {/* Dark section with "List your event with us" */}
      <div className="bg-black text-gray-400 border-t border-gray-800">
        <div className="container mx-auto px-4 max-w-[428px] py-4">
          <div className="flex justify-center">
            <Link
              href="/become-organizer"
              className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
            >
              List your event with us
            </Link>
          </div>
        </div>
      </div>

      {/* Light grey section with copyright - positioned above bottom nav */}
      <div className="bg-gray-100 text-gray-600 pb-24">
        <div className="container mx-auto px-4 max-w-[428px] py-4">
          <div className="text-sm text-center">
            © 2025 Powerglide. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

