import { useState } from 'react';
import Dashboard from './components/Dashboard.tsx';
import KanbanBoard from './components/KanbanBoard';
import ClientProjects from './components/ClientProjects';
import type {ClientLead} from './services/api';

function App() {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'pipeline'>('pipeline');
    const [selectedClient, setSelectedClient] = useState<ClientLead | null>(null);

    if (selectedClient) {
        return <ClientProjects client={selectedClient} onBack={() => setSelectedClient(null)} />;
    }

    return (
        <div className="font-sans flex flex-col min-h-screen bg-gray-50">
            <nav className="bg-white border-b border-gray-200 px-8 py-4 flex gap-4 shadow-sm">
                <h1 className="text-xl font-bold text-gray-800 mr-8 self-center">Scalina CRM</h1>
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                >
                    Dashboard
                </button>
                <button
                    onClick={() => setActiveTab('pipeline')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === 'pipeline' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                >
                    Pipeline
                </button>
            </nav>

            <main className="flex-grow">
                {activeTab === 'dashboard' && <Dashboard />}
                {activeTab === 'pipeline' && <KanbanBoard onSelectClient={setSelectedClient} />}
            </main>
        </div>
    );
}

export default App;