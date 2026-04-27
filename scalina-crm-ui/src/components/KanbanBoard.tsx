import { useEffect, useState } from 'react';
import {type ClientLead, PipelineStage, fetchPipeline, saveClientLead } from '../services/api';

const STAGES = [
    { id: PipelineStage.NEW, title: 'New Leads', color: 'bg-blue-50 border-blue-200' },
    { id: PipelineStage.CONTACTED, title: 'Contacted', color: 'bg-yellow-50 border-yellow-200' },
    { id: PipelineStage.PROPOSAL_SENT, title: 'Proposal Sent', color: 'bg-orange-50 border-orange-200' },
    { id: PipelineStage.ACTIVE, title: 'Active Clients', color: 'bg-green-50 border-green-200' }
];

export default function KanbanBoard({ onSelectClient }: { onSelectClient: (client: ClientLead) => void }) {
    const [leads, setLeads] = useState<ClientLead[]>([]);

    const loadLeads = () => fetchPipeline().then(setLeads).catch(console.error);
    useEffect(() => { loadLeads(); }, []);

    const handleDrop = async (e: React.DragEvent, newStage: PipelineStage) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        const lead = leads.find(l => l.id === leadId);

        if (lead && lead.pipelineStage !== newStage) {
            const updated = { ...lead, pipelineStage: newStage, client: newStage === PipelineStage.ACTIVE };
            setLeads(leads.map(l => l.id === leadId ? updated : l)); // Optimistic update
            await saveClientLead(updated);
        }
    };

    const addDemoLead = async () => {
        const saved = await saveClientLead({
            name: `John Doe ${Math.floor(Math.random() * 100)}`,
            company: 'New Business LLC',
            email: 'john@example.com',
            pipelineStage: PipelineStage.NEW,
            client: false
        });
        setLeads([...leads, saved]);
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800">Client Pipeline</h2>
                <button onClick={addDemoLead} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                    + Add Demo Lead
                </button>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-4">
                {STAGES.map(stage => (
                    <div key={stage.id} className={`min-w-[300px] rounded-xl border-t-4 p-4 shadow-sm ${stage.color}`}
                         onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, stage.id)}>
                        <h3 className="font-semibold text-gray-700 mb-4">{stage.title}</h3>
                        <div className="flex flex-col gap-3 min-h-[200px]">
                            {leads.filter(l => l.pipelineStage === stage.id).map(lead => (
                                <div key={lead.id} draggable onDragStart={e => e.dataTransfer.setData('leadId', lead.id!)}
                                     className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 cursor-move hover:shadow-md flex flex-col gap-2">
                                    <div>
                                        <h4 className="font-bold text-gray-800">{lead.company}</h4>
                                        <p className="text-sm text-gray-500">{lead.name}</p>
                                    </div>
                                    {stage.id === PipelineStage.ACTIVE && (
                                        <button onClick={() => onSelectClient(lead)} className="mt-2 text-sm bg-indigo-50 text-indigo-700 py-1 rounded hover:bg-indigo-100">
                                            Manage Client
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}