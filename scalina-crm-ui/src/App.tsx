import { useState } from 'react';
import Dashboard from './components/Dashboard';
import KanbanBoard from './components/KanbanBoard';
import ClientProjects from './components/ClientProjects';
import ClientInvoices from './components/ClientInvoices';
import ResourceCalendar from './components/ResourceCalendar'; // NEW
import Expenses from './components/Expenses'; // NEW
import type {ClientLead} from './services/api';

function App() {
    // Check if we are meant to be showing just the standalone Invoices window
    const urlParams = new URLSearchParams(window.location.search);
    const invoiceForId = urlParams.get('invoiceFor');

    if (invoiceForId) {
        return <ClientInvoices clientId={invoiceForId} />;
    }

    // UPDATE: Added 'calendar' and 'expenses' to the activeTab state types
    const [activeTab, setActiveTab] = useState<'dashboard' | 'pipeline' | 'calendar' | 'expenses'>('pipeline');
    const [selectedClient, setSelectedClient] = useState<ClientLead | null>(null);

    if (selectedClient) {
        return <ClientProjects client={selectedClient} onBack={() => setSelectedClient(null)} />;
    }

    return (
        <div className="font-sans flex flex-col min-h-screen bg-gray-50">
            <nav className="bg-white border-b border-gray-200 px-8 py-4 flex gap-4 shadow-sm overflow-x-auto">
                <h1 className="text-xl font-bold text-gray-800 mr-8 self-center">Scalina ERP</h1>

                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                        activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                >
                    Dashboard
                </button>
                <button
                    onClick={() => setActiveTab('pipeline')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                        activeTab === 'pipeline' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                >
                    Pipeline
                </button>
                <button
                    onClick={() => setActiveTab('calendar')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                        activeTab === 'calendar' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                >
                    Team Calendar
                </button>
                <button
                    onClick={() => setActiveTab('expenses')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                        activeTab === 'expenses' ? 'bg-red-50 text-red-700' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                >
                    Expenses
                </button>
            </nav>

            <main className="flex-grow">
                {activeTab === 'dashboard' && <Dashboard />}
                {activeTab === 'pipeline' && <KanbanBoard onSelectClient={setSelectedClient} />}
                {activeTab === 'calendar' && <ResourceCalendar />}
                {activeTab === 'expenses' && <Expenses />}
            </main>
        </div>
    );
}

export default App;