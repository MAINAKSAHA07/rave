import Link from 'next/link';
import { LayoutDashboard, Users, FileText, Settings, LogOut } from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white shadow-md hidden md:block">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-white">Rave Admin</h1>
                </div>
                <nav className="mt-6">
                    <Link href="/admin" className="flex items-center px-6 py-3 text-gray-300 hover:bg-slate-800 hover:text-white">
                        <LayoutDashboard className="w-5 h-5 mr-3" />
                        Dashboard
                    </Link>
                    <Link href="/admin/organizers" className="flex items-center px-6 py-3 text-gray-300 hover:bg-slate-800 hover:text-white">
                        <Users className="w-5 h-5 mr-3" />
                        Organizers
                    </Link>
                    <Link href="/admin/events" className="flex items-center px-6 py-3 text-gray-300 hover:bg-slate-800 hover:text-white">
                        <FileText className="w-5 h-5 mr-3" />
                        All Events
                    </Link>
                    <Link href="/admin/settings" className="flex items-center px-6 py-3 text-gray-300 hover:bg-slate-800 hover:text-white">
                        <Settings className="w-5 h-5 mr-3" />
                        Settings
                    </Link>
                </nav>
                <div className="absolute bottom-0 w-64 p-6 border-t border-slate-800">
                    <button className="flex items-center text-gray-300 hover:text-red-400">
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
