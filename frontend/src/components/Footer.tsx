import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-black text-gray-400 mt-auto border-t border-gray-800 pb-20 md:pb-6">
      <div className="container mx-auto px-4 max-w-7xl py-6">
        <div className="flex flex-col gap-4">
          {/* "List your event with us" link - above copyright */}
          <div className="flex justify-center md:justify-start">
            <Link 
              href="/become-organizer"
              className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
            >
              List your event with us
            </Link>
          </div>
          {/* Copyright - below the link */}
          <div className="text-sm text-gray-400 text-center md:text-left">
            © 2025 Powerglide. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

