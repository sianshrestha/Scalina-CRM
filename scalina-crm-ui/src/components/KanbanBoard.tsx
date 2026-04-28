// src/components/KanbanBoard.tsx
import { useEffect, useState } from 'react';
import { type ClientLead, PipelineStage, fetchPipeline, saveClientLead } from '../services/api';

const STAGES = [
    { id: PipelineStage.NEW, title: 'New Leads', color: 'bg-blue-50 border-blue-200' },
    { id: PipelineStage.CONTACTED, title: 'Contacted', color: 'bg-yellow-50 border-yellow-200' },
    { id: PipelineStage.PROPOSAL_SENT, title: 'Proposal Sent', color: 'bg-orange-50 border-orange-200' },
    { id: PipelineStage.ACTIVE, title: 'Active Clients', color: 'bg-green-50 border-green-200' }
];

export default function KanbanBoard({ onSelectClient }: { onSelectClient: (client: ClientLead) => void }) {
    const [leads, setLeads] = useState<ClientLead[]>([]);
    const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
    const [showModal, setShowModal] = useState(false);
    const [newLead, setNewLead] = useState<Partial<ClientLead>>({ pipelineStage: PipelineStage.NEW });

    const loadLeads = () => fetchPipeline().then(setLeads).catch(console.error);
    useEffect(() => { loadLeads(); }, []);

    const handleDragStart = (e: React.DragEvent, id: string) => e.dataTransfer.setData('text/plain', id);

    const handleDrop = async (e: React.DragEvent, newStage: PipelineStage) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('text/plain');
        if (!leadId) return;
        const lead = leads.find(l => l.id === leadId);
        if (lead && lead.pipelineStage !== newStage) {
            const updated = { ...lead, pipelineStage: newStage, client: newStage === PipelineStage.ACTIVE };
            setLeads(prev => prev.map(l => l.id === leadId ? updated : l));
            try { await saveClientLead(updated); } catch (e) { loadLeads(); }
        }
    };

    const handleSaveNewLead = async () => {
        if (!newLead.company || !newLead.name) return alert("Company and Name are required!");
        try {
            const saved = await saveClientLead({ ...newLead, client: false } as ClientLead);
            setLeads(prev => [...prev, saved]);
            setShowModal(false);
            setNewLead({ pipelineStage: PipelineStage.NEW }); // Reset form
        } catch (error) { console.error(error); }
    };

    // Auto-calculate next invoice date as the 1st of next month for MVP
    const getNextInvoiceDate = () => {
        const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(1);
        return d.toLocaleDateString('en-GB');
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-bold text-gray-800">Pipeline</h2>
                    <div className="bg-white border rounded-lg flex overflow-hidden">
                        <button onClick={() => setViewMode('board')} className={`px-4 py-1 text-sm ${viewMode === 'board' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-500'}`}>Board</button>
                        <button onClick={() => setViewMode('list')} className={`px-4 py-1 text-sm border-l ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-500'}`}>Clients List</button>
                    </div>
                </div>
                <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 cursor-pointer">+ Add Lead</button>
            </div>

            {/* KANBAN VIEW */}
            {viewMode === 'board' && (
                <div className="flex gap-6 overflow-x-auto pb-4">
                    {STAGES.map(stage => (
                        <div key={stage.id} className={`min-w-[300px] rounded-xl border-t-4 p-4 shadow-sm ${stage.color}`} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, stage.id)}>
                            <h3 className="font-semibold text-gray-700 mb-4">{stage.title}</h3>
                            <div className="flex flex-col gap-3 min-h-[200px]">
                                {leads.filter(l => l.pipelineStage === stage.id).map(lead => (
                                    <div key={lead.id} draggable onDragStart={e => handleDragStart(e, lead.id!)} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 cursor-grab hover:shadow-md flex flex-col gap-2 relative">
                                        <div>
                                            <h4 className="font-bold text-gray-800">{lead.company}</h4>
                                            <p className="text-sm text-gray-500">{lead.name}</p>
                                        </div>
                                        {lead.tags && <div className="flex flex-wrap gap-1 mt-1">{lead.tags.split(',').map(tag => <span key={tag} className="text-[10px] bg-gray-100 px-1 rounded text-gray-600">{tag.trim()}</span>)}</div>}
                                        {stage.id === PipelineStage.ACTIVE && (
                                            <button onClick={() => onSelectClient(lead)} className="mt-2 text-sm bg-indigo-50 text-indigo-700 py-1 rounded hover:bg-indigo-100 cursor-pointer">Manage Client</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* LIST VIEW */}
            {viewMode === 'list' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 border-b">
                        <tr><th className="p-4">Company</th><th className="p-4">Contact Details</th><th className="p-4">Tags</th><th className="p-4">Next Invoice</th><th className="p-4">Action</th></tr>
                        </thead>
                        <tbody>
                        {leads.filter(l => l.pipelineStage === PipelineStage.ACTIVE).map(l => (
                            <tr key={l.id} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="p-4 font-bold">{l.company}</td>
                                <td className="p-4">{l.name}<br/><span className="text-gray-500 text-xs">{l.email} • {l.phone}</span></td>
                                <td className="p-4">{l.tags?.split(',').map(t => <span key={t} className="bg-gray-200 px-2 py-1 rounded text-xs mr-1">{t.trim()}</span>)}</td>
                                <td className="p-4 text-orange-600 font-semibold">{getNextInvoiceDate()}</td>
                                <td className="p-4"><button onClick={() => onSelectClient(l)} className="text-indigo-600 hover:underline">Manage</button></td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ADD LEAD MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl">
                        <h3 className="text-2xl font-bold mb-4">Add New Lead</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <input className="border p-2 rounded" placeholder="Company Name *" value={newLead.company || ''} onChange={e => setNewLead({...newLead, company: e.target.value})} />
                            <input className="border p-2 rounded" placeholder="Contact Name *" value={newLead.name || ''} onChange={e => setNewLead({...newLead, name: e.target.value})} />
                            <input className="border p-2 rounded" placeholder="Email" value={newLead.email || ''} onChange={e => setNewLead({...newLead, email: e.target.value})} />
                            <input className="border p-2 rounded" placeholder="Phone" value={newLead.phone || ''} onChange={e => setNewLead({...newLead, phone: e.target.value})} />
                            <input className="border p-2 rounded col-span-2" placeholder="Tags (comma separated e.g. VIP, Retail)" value={newLead.tags || ''} onChange={e => setNewLead({...newLead, tags: e.target.value})} />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
                            <button onClick={handleSaveNewLead} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Save Lead</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}