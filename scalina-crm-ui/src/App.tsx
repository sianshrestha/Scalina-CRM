import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { KanbanBoard } from './components/KanbanBoard';
import { ProjectManagement } from './components/ProjectManagement';
import { ResourceCalendar } from './components/ResourceCalendar';
import { InvoicingHub } from './components/InvoicingHub';
import { Expenses } from './components/Expenses';
import { TeamManagement } from "./components/TeamManagement"; // .tsx extension removed for standard import
import { MarketersAnalytics } from "./components/MarketersAnalytics";

const App: React.FC = () => {
    // --- State ---
    const [currentTab, setCurrentTab] = useState<string>('dashboard');
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

    // --- Navigation Items with Clean Inline SVGs ---
    const navItems = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        },
        {
            id: 'kanban',
            label: 'Leads & Clients',
            icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        },
        {
            id: 'projects',
            label: 'Project Management',
            icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
        },
        {
            id: 'tasks',
            label: 'Resource Calendar',
            icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        },
        {
            id: 'invoices',
            label: 'Invoicing',
            icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        },
        {
            id: 'expenses',
            label: 'Expenses',
            icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        },

        {
            id: 'marketers',
            label: 'Marketers Analytics',
            icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
        },
        // --- ADDED TEAM MANAGEMENT TAB ---
        {
            id: 'team',
            label: 'Team Management',
            icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        }
    ];

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">

            {/* NOTION-STYLE COLLAPSIBLE SIDEBAR */}
            <aside
                className={`bg-[#fbfbfa] border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out relative z-20 ${
                    isSidebarExpanded ? 'w-64' : 'w-[68px]'
                }`}
            >
                {/* Collapse/Expand Toggle Button */}
                <button
                    onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                    className="absolute -right-3 top-6 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:bg-gray-50 z-30 transition-transform text-gray-400 hover:text-gray-600"
                    style={{ transform: isSidebarExpanded ? 'rotate(0deg)' : 'rotate(180deg)' }}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                {/* Header / Logo Area */}
                <div className={`flex items-center h-16 mt-2 mb-2 ${isSidebarExpanded ? 'px-6' : 'px-0 justify-center'}`}>
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                        S
                    </div>
                    {isSidebarExpanded && (
                        <span className="ml-3 font-bold text-gray-800 text-lg tracking-tight whitespace-nowrap overflow-hidden transition-opacity duration-300">
                            Scalina
                        </span>
                    )}
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto overflow-x-hidden">
                    {navItems.map((item) => {
                        const isActive = currentTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setCurrentTab(item.id)}
                                className={`flex items-center w-full rounded-md transition-colors group ${
                                    isSidebarExpanded ? 'px-3 py-2' : 'p-2 justify-center'
                                } ${
                                    isActive
                                        ? 'bg-gray-200 text-gray-900 font-semibold'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                                title={!isSidebarExpanded ? item.label : undefined}
                            >
                                <span className={`${isActive ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                    {item.icon}
                                </span>

                                {isSidebarExpanded && (
                                    <span className="ml-3 text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                                        {item.label}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* User Profile Footer */}
                <div className={`p-4 border-t border-gray-200 transition-all ${isSidebarExpanded ? 'flex items-center' : 'flex justify-center'}`}>
                    <div className="w-8 h-8 rounded-full bg-gray-300 border border-gray-400 shrink-0 flex items-center justify-center overflow-hidden">
                        <svg className="w-5 h-5 text-gray-500 mt-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                    </div>
                    {isSidebarExpanded && (
                        <div className="ml-3 overflow-hidden">
                            <p className="text-sm font-semibold text-gray-700 whitespace-nowrap text-ellipsis">Admin User</p>
                            <p className="text-xs text-gray-500 whitespace-nowrap text-ellipsis">Agency View</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 bg-white">

                {/* Top Header */}
                <header className="bg-white border-b border-gray-200 h-16 flex items-center px-8 shadow-sm shrink-0">
                    <h2 className="text-lg font-bold text-gray-800 capitalize">
                        {navItems.find(item => item.id === currentTab)?.label || 'Overview'}
                    </h2>
                </header>

                {/* Scrollable Content Wrapper */}
                <div className="flex-1 overflow-x-auto overflow-y-auto">
                    {currentTab === 'dashboard' && <Dashboard />}
                    {currentTab === 'kanban' && <KanbanBoard />}
                    {currentTab === 'projects' && <ProjectManagement />}
                    {currentTab === 'tasks' && <ResourceCalendar />}
                    {currentTab === 'invoices' && <InvoicingHub />}
                    {currentTab === 'expenses' && <Expenses />}
                    {currentTab === 'marketers' && <MarketersAnalytics />}

                    {/* ADDED TEAM COMPONENT RENDER BLOCK */}
                    {currentTab === 'team' && <TeamManagement />}

                </div>

            </main>
        </div>
    );
};

export default App;