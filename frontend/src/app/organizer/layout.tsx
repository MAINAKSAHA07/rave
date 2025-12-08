import Link from 'next/link';
import { LayoutDashboard, Calendar, MapPin, Users, CreditCard, Settings, LogOut } from 'lucide-react';

export default function OrganizerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div
            className="flex h-screen"
            style={{
                background: 'linear-gradient(180deg, #02060D 0%, #0A1320 50%, #132233 100%)',
            }}
        >
            {/* Sidebar */}
            <aside className="w-64 bg-black/30 backdrop-blur-md border-r border-white/10 hidden md:block">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-white">Powerglide Organizer</h1>
                </div>
                <nav className="mt-6">
                    <Link href="/organizer" className="flex items-center px-6 py-3 text-gray-300 hover:bg-white/10 hover:text-white transition-all">
                        <LayoutDashboard className="w-5 h-5 mr-3" />
                        Dashboard
                    </Link>
                    <Link href="/organizer/events" className="flex items-center px-6 py-3 text-gray-300 hover:bg-white/10 hover:text-white transition-all">
                        <Calendar className="w-5 h-5 mr-3" />
                        Events
                    </Link>
                    <Link href="/organizer/venues" className="flex items-center px-6 py-3 text-gray-300 hover:bg-white/10 hover:text-white transition-all">
                        <MapPin className="w-5 h-5 mr-3" />
                        Venues
                    </Link>
                    <Link href="/organizer/staff" className="flex items-center px-6 py-3 text-gray-300 hover:bg-white/10 hover:text-white transition-all">
                        <Users className="w-5 h-5 mr-3" />
                        Staff
                    </Link>
                    <Link href="/organizer/payouts" className="flex items-center px-6 py-3 text-gray-300 hover:bg-white/10 hover:text-white transition-all">
                        <CreditCard className="w-5 h-5 mr-3" />
                        Payouts
                    </Link>
                    <Link href="/organizer/settings" className="flex items-center px-6 py-3 text-gray-300 hover:bg-white/10 hover:text-white transition-all">
                        <Settings className="w-5 h-5 mr-3" />
                        Settings
                    </Link>
                </nav>
                <div className="absolute bottom-0 w-64 p-6 border-t border-white/10">
                    <button className="flex items-center text-gray-300 hover:text-red-400 transition-colors">
                        <LogOut className="w-5 h-5 mr-3" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8">
                {children}
            </main>
        </div>
    );
}
