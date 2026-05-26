import React, { useState, useEffect } from 'react';
import { fetchPipeline, saveClientLead, fetchTeamMembers, type ClientLead, type TeamMember, PipelineStage } from '../services/api';

const AVAILABLE_TAGS = ['Hospitality', 'VIP', 'Basic', 'Event', 'Business'];

interface DynamicEmail {
    address: string;
    isBilling: boolean;
}

export const KanbanBoard: React.FC = () => {
    const [leads, setLeads] = useState<ClientLead[]>([]);
    const [marketers, setMarketers] = useState<TeamMember[]>([]);

    // --- Global Search & Sort State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // --- Modals State ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingLead, setViewingLead] = useState<ClientLead | null>(null);
    const [editingLead, setEditingLead] = useState<Partial<ClientLead>>({});

    // --- Form UI State ---
    const [clientType, setClientType] = useState<string>('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [emailList, setEmailList] = useState<DynamicEmail[]>([{ address: '', isBilling: true }]);
    const [phoneList, setPhoneList] = useState<string[]>(['']);
    const [selectedMarketerId, setSelectedMarketerId] = useState<number | ''>('');

    const columns = [
        { id: PipelineStage.NEW, title: 'Cold Leads', dotColor: 'bg-gray-400', countColor: 'text-gray-500 bg-gray-200' },
        { id: PipelineStage.CONTACTED, title: 'Contacted', dotColor: 'bg-blue-400', countColor: 'text-blue-600 bg-blue-100' },
        { id: PipelineStage.PROPOSAL_SENT, title: 'Proposal Sent', dotColor: 'bg-orange-400', countColor: 'text-orange-600 bg-orange-100' },
        { id: PipelineStage.ACTIVE, title: 'Active Clients', dotColor: 'bg-green-500', countColor: 'text-green-700 bg-green-100' }
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const leadsData = await fetchPipeline();
            setLeads(leadsData);

            const teamData = await fetchTeamMembers();
            setMarketers(teamData.filter((m: TeamMember) => m.role === 'Marketer'));
        } catch (error) {
            console.error("Failed to load pipeline data", error);
        }
    };

    // --- Drag and Drop Logic ---
    const handleDragStart = (e: React.DragEvent, leadId: number) => {
        e.dataTransfer.setData('leadId', leadId.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, stage: PipelineStage) => {
        e.preventDefault();
        const leadId = Number(e.dataTransfer.getData('leadId'));
        const lead = leads.find(l => l.id === leadId);

        if (lead && lead.pipelineStage !== stage) {
            if (stage === PipelineStage.ACTIVE) {
                let hasValidEmail = false;
                if (lead.email && lead.email.trim()) {
                    if (lead.email.startsWith('[')) {
                        try {
                            const parsedEmails = JSON.parse(lead.email);
                            hasValidEmail = Array.isArray(parsedEmails) && parsedEmails.some(em => em.address && em.address.trim());
                        } catch {
                            hasValidEmail = false;
                        }
                    } else {
                        hasValidEmail = lead.email.includes('@');
                    }
                }

                const hasClientType = lead.tags?.includes('One-Time') || lead.tags?.includes('Recurring');

                if (!lead.clientCode || !lead.clientCode.trim() || !lead.company || !lead.company.trim() || !hasValidEmail || !hasClientType) {
                    alert("Cannot activate account via drag-and-drop. Crucial account information is missing.\n\nPlease click the card to enter the required onboarding metrics:\n• Unique Client Code\n• Company Name\n• Client Type (One-Time or Recurring Retainer)\n• Valid Email Address");
                    return;
                }
            }

            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, pipelineStage: stage, client: stage === PipelineStage.ACTIVE } : l));
            await saveClientLead({ ...lead, pipelineStage: stage, client: stage === PipelineStage.ACTIVE });
            loadData();
        }
    };

    const toggleInactiveStatus = async (e: React.MouseEvent, lead: ClientLead) => {
        e.stopPropagation();
        const isCurrentlyInactive = lead.pipelineStage === PipelineStage.INACTIVE;
        const newStage = isCurrentlyInactive ? PipelineStage.ACTIVE : PipelineStage.INACTIVE;
        const confirmMsg = isCurrentlyInactive ? "Restore this client to Active status?" : "Move this client to Past Clients (Inactive)?";

        if (window.confirm(confirmMsg)) {
            setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, pipelineStage: newStage } : l));
            await saveClientLead({ ...lead, pipelineStage: newStage });
            loadData();
        }
    };

    // --- Modal Logic ---
    const openModal = (lead?: ClientLead) => {
        if (lead) {
            setEditingLead(lead);
            const tagsArr = lead.tags ? lead.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
            const cType = tagsArr.find(t => t === 'One-Time' || t === 'Recurring') || '';
            setClientType(cType);
            setSelectedTags(tagsArr.filter(t => t !== 'One-Time' && t !== 'Recurring'));
            setSelectedMarketerId(lead.marketer?.id || '');

            try {
                if (lead.email && (lead.email.startsWith('[') || lead.email.startsWith('{'))) {
                    setEmailList(JSON.parse(lead.email));
                } else {
                    setEmailList([{ address: lead.email || '', isBilling: true }]);
                }
            } catch {
                setEmailList([{ address: lead.email || '', isBilling: true }]);
            }

            try {
                if (lead.phone && lead.phone.startsWith('[')) {
                    setPhoneList(JSON.parse(lead.phone));
                } else {
                    setPhoneList([lead.phone || '']);
                }
            } catch {
                setPhoneList([lead.phone || '']);
            }
        } else {
            setEditingLead({ name: '', company: '', email: '', pipelineStage: PipelineStage.NEW, client: false, clientCode: '', tags: '', address: '', abn: '', phone: '' });
            setClientType('');
            setSelectedTags([]);
            setEmailList([{ address: '', isBilling: true }]);
            setPhoneList(['']);
            setSelectedMarketerId('');
        }
        setIsModalOpen(true);
    };

    // --- Dynamic Inputs Arrays Operations ---
    const handleAddEmail = () => {
        // If it's the only email being added, force it to be the billing email
        setEmailList([...emailList, { address: '', isBilling: emailList.length === 0 }]);
    };

    const handleRemoveEmail = (index: number) => {
        const updated = emailList.filter((_, i) => i !== index);
        // SAFETY NET: If they just deleted the specific email marked as 'Billing',
        // automatically assign the new first email to be the billing email.
        if (emailList[index].isBilling && updated.length > 0) {
            updated[0].isBilling = true;
        }
        setEmailList(updated);
    };

    const handleEmailChange = (index: number, value: string) => {
        const updated = [...emailList];
        updated[index].address = value;
        setEmailList(updated);
    };

    const toggleBillingEmail = (index: number) => {
        const updated = [...emailList];
        updated[index].isBilling = !updated[index].isBilling; // Toggle the selected email's billing status
        setEmailList(updated);
    };


    const handleAddPhone = () => setPhoneList([...phoneList, '']);
    const handleRemovePhone = (index: number) => setPhoneList(phoneList.filter((_, i) => i !== index));
    const handlePhoneChange = (index: number, value: string) => {
        const updated = [...phoneList];
        updated[index] = value;
        setPhoneList(updated);
    };

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingLead.name || !editingLead.name.trim()) {
            alert("Client Name is strictly required across all stages of the pipeline.");
            return;
        }

        const targetStage = editingLead.pipelineStage || PipelineStage.NEW;

        if (targetStage === PipelineStage.ACTIVE) {
            if (!clientType) return alert("Account activation blocked: Please select a valid Client Type.");
            if (!editingLead.clientCode || !editingLead.clientCode.trim()) return alert("Account activation blocked: A unique Client Code is mandatory.");
            if (!editingLead.company || !editingLead.company.trim()) return alert("Account activation blocked: Company Name must be filled out.");
            if (emailList.filter(em => em.address.trim()).length === 0) return alert("Account activation blocked: At least one primary contact Email Address is required.");
        }

        const finalTags = [clientType, ...selectedTags].filter(Boolean).join(', ');

        // Clean up empty fields before saving
        const finalEmailsJson = JSON.stringify(emailList.filter(em => em.address.trim()));
        const finalPhonesJson = JSON.stringify(phoneList.filter(ph => ph.trim()));

        const payload = {
            ...editingLead,
            tags: finalTags,
            email: finalEmailsJson,
            phone: finalPhonesJson,
            pipelineStage: targetStage,
            client: targetStage === PipelineStage.ACTIVE,
            marketer: selectedMarketerId ? { id: Number(selectedMarketerId) } : null
        };

        await saveClientLead(payload as ClientLead);
        setIsModalOpen(false);
        loadData();
    };

    const displayFirstValue = (jsonOrRaw: string | undefined, defaultText: string = '') => {
        if (!jsonOrRaw) return defaultText;
        try {
            if (jsonOrRaw.startsWith('[')) {
                const parsed = JSON.parse(jsonOrRaw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return typeof parsed[0] === 'object' ? parsed[0].address : parsed[0];
                }
            }
        } catch {}
        return jsonOrRaw;
    };

    const getParsedEmails = (emailStr: string | undefined): DynamicEmail[] => {
        if (!emailStr) return [];
        try {
            return emailStr.startsWith('[') ? JSON.parse(emailStr) : [{ address: emailStr, isBilling: false }];
        } catch {
            return [{ address: emailStr, isBilling: false }];
        }
    };

    const getParsedPhones = (phoneStr: string | undefined): string[] => {
        if (!phoneStr) return [];
        try {
            return phoneStr.startsWith('[') ? JSON.parse(phoneStr) : [phoneStr];
        } catch {
            return [phoneStr];
        }
    };

    // --- Search Filtering & Sorting Logic ---
    const filteredLeads = leads.filter(lead => {
        if (!searchQuery.trim()) return true;

        const q = searchQuery.toLowerCase();
        const matchesName = lead.name?.toLowerCase().includes(q);
        const matchesCompany = lead.company?.toLowerCase().includes(q);
        const matchesCode = lead.clientCode?.toLowerCase().includes(q);
        const matchesEmail = lead.email?.toLowerCase().includes(q);

        return matchesName || matchesCompany || matchesCode || matchesEmail;
    });

    const inactiveLeads = filteredLeads.filter(l => l.pipelineStage === PipelineStage.INACTIVE);

    // Process the All Clients list and apply the sorting
    const allClientsList = filteredLeads
        .filter(l => l.client || l.pipelineStage === PipelineStage.ACTIVE || l.pipelineStage === PipelineStage.INACTIVE)
        .sort((a, b) => {
            const nameA = a.name?.toLowerCase() || '';
            const nameB = b.name?.toLowerCase() || '';
            return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 min-h-screen">

            {/* UPDATED: Sticky Header Wrapper - Title removed, aligned to the right */}
            <div className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm pt-4 pb-4 -mt-6 -mx-6 px-6 flex justify-end items-center mb-6 shadow-sm border-b border-gray-200/60">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 w-full md:w-80 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 transition shadow-sm bg-white"
                        />
                        <svg className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <button onClick={() => openModal()} className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 font-medium transition shrink-0">
                        + Add Lead
                    </button>
                </div>
            </div>

            {/* Kanban Columns Wrapper */}
            <div className="flex flex-1 gap-5 pb-4 min-w-0 overflow-x-auto shrink-0 min-h-[400px]">
                {columns.map(column => {
                    const columnLeads = filteredLeads.filter(l => l.pipelineStage === column.id);

                    return (
                        <div
                            key={column.id}
                            className="flex flex-col flex-1 min-w-[260px] bg-gray-100/70 rounded-xl p-3 border border-gray-200/60"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, column.id)}
                        >
                            <div className="flex items-center justify-between mb-3 px-1 shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${column.dotColor}`}></div>
                                    <h3 className="text-sm font-bold text-gray-700">{column.title}</h3>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${column.countColor}`}>
                                    {columnLeads.length}
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                                {columnLeads.map(lead => (
                                    <div
                                        key={lead.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, lead.id!)}
                                        onClick={() => openModal(lead)}
                                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow hover:border-blue-300 transition-all flex flex-col gap-1.5"
                                    >
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-gray-800 text-sm leading-tight pr-2">{lead.name}</h4>
                                            {lead.clientCode && (
                                                <span className="shrink-0 bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded text-[10px] tracking-wide border border-blue-100">
                                                    {lead.clientCode}
                                                </span>
                                            )}
                                        </div>


                                        {lead.company && (
                                            <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                <span className="truncate">{lead.company}</span>
                                            </div>
                                        )}

                                        {lead.email && (
                                            <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                <span className="truncate">{displayFirstValue(lead.email)}</span>
                                            </div>
                                        )}

                                        {lead.tags && (
                                            <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-gray-50">
                                                {lead.tags.split(',').map((tag, idx) => {
                                                    const trimmed = tag.trim();
                                                    if (!trimmed) return null;
                                                    const isType = trimmed === 'One-Time' || trimmed === 'Recurring';
                                                    return (
                                                        <span key={idx} className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${isType ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-gray-100 text-gray-500'}`}>
                                                            {trimmed}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* PAST CLIENTS (INACTIVE) SECTION */}
            {inactiveLeads.length > 0 && (
                <div className="mt-8 shrink-0">
                    <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-lg font-bold text-gray-500 flex items-center gap-2">
                            <span className="text-gray-400">📦</span> Past Clients
                        </h3>
                        <div className="h-px bg-gray-200 flex-1"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {inactiveLeads.map(lead => (
                            <div key={lead.id} onClick={() => setViewingLead(lead)} className="bg-white/60 p-4 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:bg-white hover:shadow transition-all grayscale hover:grayscale-0 opacity-70 hover:opacity-100 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-gray-600 text-sm leading-tight pr-2 line-through decoration-gray-300">{lead.name}</h4>
                                    {lead.clientCode && <span className="shrink-0 bg-gray-100 text-gray-400 font-bold px-1.5 py-0.5 rounded text-[10px] tracking-wide border border-gray-200">{lead.clientCode}</span>}
                                </div>
                                {lead.company && <span className="text-xs font-medium text-gray-400 truncate">{lead.company}</span>}

                                <button
                                    onClick={(e) => toggleInactiveStatus(e, lead)}
                                    className="mt-2 w-full bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700 hover:border-green-200 text-[10px] font-bold py-1.5 rounded border border-gray-200 transition"
                                >
                                    Restore to Active
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ALL CLIENTS DIRECTORY */}
            <div className="mt-10 shrink-0 pb-10">
                <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-lg font-bold text-gray-500 flex items-center gap-2">
                        <span className="text-gray-400">👥</span> All Clients Directory
                    </h3>
                    <div className="h-px bg-gray-200 flex-1"></div>
                </div>

                <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden flex-1">
                    <table className="min-w-full w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                        <tr className="text-gray-500 text-[10px] uppercase font-bold tracking-widest text-left">

                            {/* Clickable Sortable Header */}
                            <th
                                className="px-6 py-4 cursor-pointer hover:text-blue-600 hover:bg-gray-100 transition flex items-center gap-2 group select-none"
                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                            >
                                Client Name
                                <span className="text-[14px] bg-white border border-gray-200 rounded px-1 group-hover:border-blue-300 text-gray-400 group-hover:text-blue-500 shadow-sm transition">
                                    {sortOrder === 'asc' ? '↑' : '↓'}
                                </span>
                            </th>

                            <th className="px-6 py-4">Company / Code</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {allClientsList.length === 0 ? (
                            <tr><td colSpan={4} className="text-center py-10 text-gray-400 text-sm">No clients match your search.</td></tr>
                        ) : (
                            allClientsList.map((client) => (
                                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap font-bold text-sm text-gray-900">{client.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-medium text-gray-700 block">{client.company || '-'}</span>
                                        <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">{client.clientCode || 'NO CODE'}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${client.pipelineStage === PipelineStage.ACTIVE ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                            {client.pipelineStage}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <button onClick={() => setViewingLead(client)} className="text-[10px] font-bold text-gray-500 hover:text-white hover:bg-gray-500 border border-transparent hover:border-gray-600 px-3 py-1.5 rounded transition mr-2">View</button>
                                        <button onClick={() => openModal(client)} className="text-[10px] font-bold text-blue-500 hover:text-white hover:bg-blue-500 border border-transparent hover:border-blue-600 px-3 py-1.5 rounded transition">Edit</button>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* VIEW LEAD/CLIENT MODAL */}
            {viewingLead && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-2xl w-[600px] max-h-[90vh] shadow-2xl flex flex-col">
                        <div className="flex justify-between items-start mb-6 shrink-0">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800">{viewingLead.name}</h3>
                                <span className={`inline-block mt-2 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${viewingLead.pipelineStage === PipelineStage.ACTIVE ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                    {viewingLead.pipelineStage}
                                </span>
                            </div>
                            <button onClick={() => setViewingLead(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
                        </div>

                        <div className="overflow-y-auto pr-2 space-y-6">
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div><span className="block text-[10px] font-bold text-gray-400 uppercase">Company Name</span><span className="text-sm font-bold text-gray-700">{viewingLead.company || '—'}</span></div>
                                <div><span className="block text-[10px] font-bold text-gray-400 uppercase">Client Code</span><span className="text-sm font-mono tracking-widest text-gray-700">{viewingLead.clientCode || '—'}</span></div>
                                <div><span className="block text-[10px] font-bold text-gray-400 uppercase">ABN</span><span className="text-sm font-mono text-gray-700">{viewingLead.abn || '—'}</span></div>
                                <div><span className="block text-[10px] font-bold text-gray-400 uppercase">Marketer / Referrer</span><span className="text-sm font-bold text-emerald-600">{viewingLead.marketer?.firstName ? `${viewingLead.marketer.firstName} ${viewingLead.marketer.lastName || ''}` : 'In-House'}</span></div>
                                <div><span className="block text-[10px] font-bold text-gray-400 uppercase">Estimated Weekly Revenue</span><span className="text-sm font-mono text-gray-700">{viewingLead.estimatedWeeklyRevenue || '—'}</span></div>
                                <div><span className="block text-[10px] font-bold text-gray-400 uppercase">Marketer's Commission</span><span className="text-sm font-mono text-gray-700">{viewingLead.marketersCut || '—'}</span></div>
                            </div>

                            <div>
                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-1">Contact Methods</h4>
                                <div className="space-y-4">
                                    <div>
                                        <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Standard Emails</span>
                                        {getParsedEmails(viewingLead.email).filter(e => !e.isBilling).map((e, i) => (
                                            <div key={i} className="text-sm text-gray-700">{e.address || '—'}</div>
                                        ))}
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold text-green-500 uppercase mb-1">Invoice / Billing Emails</span>
                                        {getParsedEmails(viewingLead.email).filter(e => e.isBilling).map((e, i) => (
                                            <div key={i} className="text-sm font-bold text-green-700">{e.address || '—'}</div>
                                        ))}
                                        {getParsedEmails(viewingLead.email).filter(e => e.isBilling).length === 0 && <span className="text-sm text-gray-400 italic">No specific billing email assigned.</span>}
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Phone Numbers</span>
                                        {getParsedPhones(viewingLead.phone).map((p, i) => (
                                            <div key={i} className="text-sm text-gray-700">{p || '—'}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-1">Location Details</h4>
                                <div className="text-sm text-gray-700 whitespace-pre-line">{viewingLead.address || '—'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD / EDIT LEAD MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-2xl w-[520px] shadow-2xl max-h-[90vh] flex flex-col">
                        <h3 className="text-xl font-bold text-gray-800 mb-6 shrink-0">{editingLead.id ? 'Edit Client Details' : 'New Lead'}</h3>

                        <form onSubmit={handleSave} className="space-y-4 overflow-y-auto pr-2 flex-1 custom-scrollbar">

                            <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                                <label className="block text-[10px] font-bold text-purple-700 uppercase mb-1.5 ml-1 tracking-wider">Client Onboarding Type</label>
                                <select className="w-full bg-white border-gray-200 border p-3 rounded-xl outline-none focus:border-purple-400 transition text-sm font-bold text-gray-700" value={clientType} onChange={e => setClientType(e.target.value)}>
                                    <option value="">Select Type...</option>
                                    <option value="One-Time">One-Time Project</option>
                                    <option value="Recurring">Recurring Retainer</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Client Name <span className="text-red-500 font-bold">*</span></label>
                                    <input required className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 font-medium transition" value={editingLead.name || ''} onChange={e => setEditingLead({...editingLead, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-emerald-500 uppercase mb-1 ml-1">Marketer / Referrer</label>
                                    <select className="w-full border-emerald-200 border p-3 rounded-xl outline-none focus:border-emerald-400 transition font-medium text-sm bg-emerald-50/30 text-emerald-800" value={selectedMarketerId} onChange={e => setSelectedMarketerId(e.target.value === '' ? '' : Number(e.target.value))}>
                                        <option value="">None</option>
                                        {marketers.map((m: TeamMember) => (
                                            <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Company Name</label>
                                    <input className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition" value={editingLead.company || ''} onChange={e => setEditingLead({...editingLead, company: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Client Code</label>
                                    <input className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition font-mono uppercase tracking-widest text-center placeholder:font-sans" value={editingLead.clientCode || ''} onChange={e => setEditingLead({...editingLead, clientCode: e.target.value.toUpperCase()})} />
                                </div>

                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Est. Weekly Revenue ($)</label>
                                    <input type="number" step="0.01" className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition" value={editingLead.estimatedWeeklyRevenue || ''} onChange={e => setEditingLead({...editingLead, estimatedWeeklyRevenue: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-emerald-500 uppercase mb-1 ml-1">Marketer's Weekly Cut ($)</label>
                                    <input type="number" step="0.01" className="w-full border-emerald-200 bg-emerald-50/30 border p-3 rounded-xl outline-none focus:border-emerald-400 transition" value={editingLead.marketersCut || ''} onChange={e => setEditingLead({...editingLead, marketersCut: Number(e.target.value)})} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase ml-1">Email Addresses</label>
                                {emailList.map((email, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <input type="email" className="flex-1 border-gray-200 border p-2.5 rounded-xl text-sm outline-none focus:border-blue-400 transition" value={email.address} onChange={e => handleEmailChange(idx, e.target.value)} />

                                        {/* THE FIX IS HERE: toggleBillingEmail completely updates the state array. */}
                                        <button
                                            type="button"
                                            onClick={() => toggleBillingEmail(idx)}
                                            className={`px-3 py-2 text-[10px] font-bold uppercase rounded-lg border transition ${email.isBilling ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}
                                            title="Toggle for Billing / Invoicing"
                                        >
                                            Invoicing
                                        </button>

                                        {emailList.length > 1 && (
                                            <button type="button" onClick={() => handleRemoveEmail(idx)} className="p-2.5 text-red-400 bg-red-50 hover:text-red-600 rounded-xl transition">✕</button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={handleAddEmail} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 ml-1">+ Add Email Address</button>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase ml-1">Phone Numbers</label>
                                {phoneList.map((phone, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <input type="text" placeholder="+61 ..." className="flex-1 border-gray-200 border p-2.5 rounded-xl text-sm outline-none focus:border-blue-400 transition" value={phone} onChange={e => handlePhoneChange(idx, e.target.value)} />
                                        {phoneList.length > 1 && (
                                            <button type="button" onClick={() => handleRemovePhone(idx)} className="p-2.5 text-red-400 bg-red-50 hover:text-red-600 rounded-xl transition">✕</button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={handleAddPhone} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 ml-1">+ Add Phone Number</button>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Address</label>
                                    <input className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition" value={editingLead.address || ''} onChange={e => setEditingLead({...editingLead, address: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">ABN</label>
                                    <input className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition font-mono" value={editingLead.abn || ''} onChange={e => setEditingLead({...editingLead, abn: e.target.value})} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Multi-Select Tags</label>
                                <div className="flex flex-wrap gap-2">
                                    {AVAILABLE_TAGS.map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => toggleTag(tag)}
                                            className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${selectedTags.includes(tag) ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {editingLead.id && (
                                <div className="mt-4 bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-600">Pipeline Column</span>
                                    <select
                                        className="border-gray-200 border p-1.5 rounded-md text-xs font-bold outline-none bg-white text-gray-700 shadow-sm"
                                        value={editingLead.pipelineStage}
                                        onChange={e => setEditingLead({...editingLead, pipelineStage: e.target.value as PipelineStage, client: e.target.value === PipelineStage.ACTIVE})}
                                    >
                                        <option value={PipelineStage.NEW}>Cold Lead</option>
                                        <option value={PipelineStage.CONTACTED}>Contacted</option>
                                        <option value={PipelineStage.PROPOSAL_SENT}>Proposal Sent</option>
                                        <option value={PipelineStage.ACTIVE}>Active Client</option>
                                        <option value={PipelineStage.INACTIVE}>Past Client (Inactive)</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 mt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 p-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition">Cancel</button>
                                <button type="submit" className="flex-1 bg-blue-600 p-3 rounded-xl font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition">Save Lead</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};