import Link from 'next/link';
import { LayoutDashboard, Calendar, MapPin, Users, CreditCard, Settings, LogOut } from 'lucide-react';

export default function OrganizerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-md hidden md:block">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-primary">Powerglide Organizer</h1>
                </div>
                <nav className="mt-6">
                    <Link href="/organizer" className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-primary">
                        <LayoutDashboard className="w-5 h-5 mr-3" />
                        Dashboard
                    </Link>
                    <Link href="/organizer/events" className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-primary">
                        <Calendar className="w-5 h-5 mr-3" />
                        Events
                    </Link>
                    <Link href="/organizer/venues" className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-primary">
                        <MapPin className="w-5 h-5 mr-3" />
                        Venues
                    </Link>
                    <Link href="/organizer/staff" className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-primary">
                        <Users className="w-5 h-5 mr-3" />
                        Staff
                    </Link>
                    <Link href="/organizer/payouts" className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-primary">
                        <CreditCard className="w-5 h-5 mr-3" />
                        Payouts
                    </Link>
                    <Link href="/organizer/settings" className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-primary">
                        <Settings className="w-5 h-5 mr-3" />
                        Settings
                    </Link>
                </nav>
                <div className="absolute bottom-0 w-64 p-6 border-t">
                    <button className="flex items-center text-gray-700 hover:text-red-600">
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
