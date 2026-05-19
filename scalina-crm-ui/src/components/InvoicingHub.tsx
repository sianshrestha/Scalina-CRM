import React, { useState, useEffect } from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import {
    fetchPipeline,
    fetchAllProjects,
    fetchInvoices,
    createInvoice,
    updateInvoice,
    updateInvoiceStatus,
    type ClientLead,
    type Project,
    type Invoice,
    type InvoiceItem
} from '../services/api';

// --- PDF STYLES & COMPONENT ---
const pdfStyles = StyleSheet.create({
    page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
    headerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
    companyName: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
    tagline: { fontSize: 10, color: '#666', marginTop: 4 },
    invoiceTitle: { fontSize: 28, fontWeight: 'bold', color: '#d32f2f', marginTop: 10 },
    section: { marginBottom: 20 },
    boldText: { fontWeight: 'bold' },
    table: { width: '100%', marginTop: 20 },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 5, marginBottom: 5, fontWeight: 'bold' },
    tableRow: { flexDirection: 'row', marginBottom: 5 },
    colDesc: { width: '55%' },
    colQty: { width: '15%', textAlign: 'center' },
    colPrice: { width: '15%', textAlign: 'right' },
    colTotal: { width: '15%', textAlign: 'right' },
    totalsContainer: { alignSelf: 'flex-end', width: '30%', marginTop: 20 },
    totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    footer: { marginTop: 50, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#ccc', fontSize: 9, color: '#555' }
});

const InvoiceDocument = ({ invoice, client }: { invoice: any, client: any }) => {
    const formatMoney = (amount: number) => `$${(amount || 0).toFixed(2)}`;
    return (
        <Document>
            <Page size="A4" style={pdfStyles.page}>
                <View style={pdfStyles.headerContainer}>
                    <View>
                        <Text style={pdfStyles.companyName}>Scalina Media</Text>
                        <Text style={pdfStyles.tagline}>Go Digital, or Go Invisible.</Text>
                        <Text style={pdfStyles.invoiceTitle}>INVOICE</Text>
                    </View>
                    <View>
                        <Text><Text style={pdfStyles.boldText}>Client ID: </Text>{client.clientCode || 'N/A'}</Text>
                        <Text><Text style={pdfStyles.boldText}>Invoice No: </Text>{invoice.invoiceNumber || '001'}</Text>
                        <Text><Text style={pdfStyles.boldText}>Invoice Date: </Text>{invoice.issueDate}</Text>
                    </View>
                </View>
                <View style={pdfStyles.section}>
                    <Text style={pdfStyles.boldText}>INVOICE TO :</Text>
                    <Text>{client.company || client.name || 'Unknown Client'}</Text>
                    <Text>ABN: {client.abn || 'N/A'}</Text>
                    <Text>Address: {client.address || 'N/A'}</Text>
                </View>
                <View style={pdfStyles.table}>
                    <View style={pdfStyles.tableHeader}>
                        <Text style={pdfStyles.colDesc}>DESCRIPTION</Text>
                        <Text style={pdfStyles.colQty}>QTY</Text>
                        <Text style={pdfStyles.colPrice}>PRICE</Text>
                        <Text style={pdfStyles.colTotal}>TOTAL</Text>
                    </View>
                    {invoice.items && invoice.items.map((item: any, index: number) => (
                        <View key={index} style={pdfStyles.tableRow}>
                            <Text style={pdfStyles.colDesc}>{item.description}</Text>
                            <Text style={pdfStyles.colQty}>{item.quantity}</Text>
                            <Text style={pdfStyles.colPrice}>{formatMoney(item.price)}</Text>
                            <Text style={pdfStyles.colTotal}>{formatMoney(item.quantity * item.price)}</Text>
                        </View>
                    ))}
                </View>
                <View style={pdfStyles.totalsContainer}>
                    <View style={pdfStyles.totalsRow}>
                        <Text style={pdfStyles.boldText}>Sub-total:</Text>
                        <Text>{formatMoney(invoice.amount)}</Text>
                    </View>
                    <View style={pdfStyles.totalsRow}>
                        <Text style={pdfStyles.boldText}>Total:</Text>
                        <Text style={pdfStyles.boldText}>{formatMoney(invoice.amount)}</Text>
                    </View>
                </View>
                <View style={pdfStyles.footer}>
                    <Text>info@scalinamedia.com</Text>
                    <Text>  </Text>
                    <Text>ABN: 81821315775</Text>
                    <Text>Account Name: Suhan Shanker</Text>
                    <Text>BSB: 062-235</Text>
                    <Text>Account Number: 11067512</Text>
                    <Text style={{ marginTop: 20, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>THANK YOU!</Text>
                </View>
            </Page>
        </Document>
    );
};

// --- MAIN HUB COMPONENT ---
const getTodayString = () => {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
};

export const InvoicingHub: React.FC = () => {
    const [clients, setClients] = useState<ClientLead[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);

    // --- UI State ---
    const [showModal, setShowModal] = useState(false);
    const [statusFilters, setStatusFilters] = useState<string[]>([]);
    const [clientFilter, setClientFilter] = useState<number | ''>('');
    const [sortConfig, setSortConfig] = useState<{ field: 'date' | 'amount', order: 'asc' | 'desc' }>({ field: 'date', order: 'desc' });

    // --- Analytics Timeframe State ---
    const [analyticsPeriod, setAnalyticsPeriod] = useState<'ALL' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('THIS_YEAR');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // --- Form State ---
    const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
    const [modalClientId, setModalClientId] = useState<number | ''>('');
    const [modalProjectId, setModalProjectId] = useState<number | ''>('');
    const [issueDate, setIssueDate] = useState(getTodayString());
    const [dueDate, setDueDate] = useState('');
    const [billingDetails, setBillingDetails] = useState('');
    const [lineItems, setLineItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, price: 0 }]);

    useEffect(() => {
        fetchPipeline().then(data => setClients(data.filter((c: ClientLead) => c.clientCode)));
        fetchAllProjects().then(setProjects);
        loadInvoices();
    }, []);

    const loadInvoices = async () => {
        const data = await fetchInvoices();
        setInvoices(data);
    };

    useEffect(() => {
        if (modalClientId) {
            const selectedClient = clients.find(c => c.id === modalClientId);
            if (selectedClient) {
                setBillingDetails(`ABN: ${selectedClient.abn || 'N/A'}\nAddress: ${selectedClient.address || 'N/A'}`);
            }
        } else {
            setBillingDetails('');
        }
    }, [modalClientId, clients]);

    const filteredModalProjects = modalClientId
        ? projects.filter((p: Project) => p.client?.id === Number(modalClientId))
        : [];

    const calculateTotal = () => lineItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    const addLineItem = () => setLineItems([...lineItems, { description: '', quantity: 1, price: 0 }]);
    const removeLineItem = (index: number) => setLineItems(lineItems.filter((_, i) => i !== index));
    const handleLineItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...lineItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setLineItems(newItems);
    };

    const handleSaveInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        const client = clients.find(c => c.id === modalClientId);
        const invNum = `INV-${client?.clientCode || 'XXX'}-${Math.floor(1000 + Math.random() * 9000)}`;

        const payload = {
            invoiceNumber: editingInvoiceId ? invoices.find(i=>i.id===editingInvoiceId)?.invoiceNumber : invNum,
            clientId: Number(modalClientId),
            clientName: client?.name,
            projectId: modalProjectId ? Number(modalProjectId) : undefined,
            amount: calculateTotal(),
            issueDate,
            dueDate,
            status: 'DRAFT',
            items: lineItems
        };

        if (editingInvoiceId) {
            await updateInvoice(editingInvoiceId, payload as Partial<Invoice>);
        } else {
            await createInvoice(payload as Partial<Invoice>);
        }

        closeModal();
        loadInvoices();
    };

    const openEditModal = (inv: Invoice) => {
        setEditingInvoiceId(inv.id!);
        setModalClientId(inv.clientId);
        setModalProjectId(inv.projectId || '');
        setIssueDate(inv.issueDate);
        setDueDate(inv.dueDate);
        setLineItems(inv.items && inv.items.length > 0 ? inv.items : [{ description: '', quantity: 1, price: 0 }]);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingInvoiceId(null);
        setModalClientId(''); setModalProjectId(''); setIssueDate(getTodayString()); setDueDate('');
        setLineItems([{ description: '', quantity: 1, price: 0 }]);
    };

    const handleSort = (field: 'date' | 'amount') => {
        setSortConfig({
            field,
            order: sortConfig.field === field && sortConfig.order === 'asc' ? 'desc' : 'asc'
        });
    };

    const toggleStatusFilter = (status: string) => {
        if (statusFilters.includes(status)) {
            setStatusFilters(statusFilters.filter(s => s !== status));
        } else {
            setStatusFilters([...statusFilters, status]);
        }
    };

    const generatePDF = async (inv: Invoice) => {
        const client = clients.find(c => c.id === inv.clientId) || {};
        try {
            const blob = await pdf(<InvoiceDocument invoice={inv} client={client} />).toBlob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF.");
        }
    };

    const statusColors: Record<string, string> = {
        'DRAFT': 'bg-gray-100 text-gray-600',
        'SENT': 'bg-blue-50 text-blue-700',
        'PAID': 'bg-green-50 text-green-700',
        'OVERDUE': 'bg-red-50 text-red-700',
    };

    // --- UPDATED ANALYTICS DATE FILTERING LOGIC ---
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const analyticsInvoices = invoices.filter(inv => {
        if (analyticsPeriod === 'ALL') return true;

        const invDate = new Date(inv.issueDate);
        if (isNaN(invDate.getTime())) return true; // Safe fallback if date is broken

        if (analyticsPeriod === 'THIS_MONTH') {
            return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
        }
        if (analyticsPeriod === 'THIS_YEAR') {
            return invDate.getFullYear() === currentYear;
        }
        if (analyticsPeriod === 'CUSTOM') {
            if (customStart && inv.issueDate < customStart) return false;
            if (customEnd && inv.issueDate > customEnd) return false;
            return true;
        }
        return true;
    });

    const collectedRevenue = analyticsInvoices.filter(i => i.status === 'PAID').reduce((acc, curr) => acc + curr.amount, 0);

    // FIX: Estimated Revenue completely ignores DRAFT invoices now
    const estimatedRevenue = analyticsInvoices
        .filter(i => i.status !== 'DRAFT')
        .reduce((acc, curr) => acc + curr.amount, 0);

    // --- TABLE FILTERING LOGIC ---
    const filteredAndSortedInvoices = invoices
        .filter(inv => {
            const matchesStatus = statusFilters.length === 0 || statusFilters.includes(inv.status);
            const matchesClient = clientFilter === '' || inv.clientId === Number(clientFilter);
            return matchesStatus && matchesClient;
        })
        .sort((a, b) => {
            if (sortConfig.field === 'amount') {
                return sortConfig.order === 'asc' ? a.amount - b.amount : b.amount - a.amount;
            } else {
                return sortConfig.order === 'asc'
                    ? new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime()
                    : new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
            }
        });

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col gap-6">

            <div className="flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-bold text-gray-800">Invoicing Hub</h2>
                <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 font-medium transition">
                    + Create Draft
                </button>
            </div>

            {/* DYNAMIC REVENUE ANALYTICS */}
            <div className="flex flex-col gap-3 shrink-0">
                <div className="flex flex-wrap justify-between items-end gap-4">
                    <h3 className="text-sm font-bold text-gray-600 uppercase tracking-widest">Revenue Analytics</h3>

                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            className="border-gray-200 border p-2 rounded-lg text-xs font-bold outline-none focus:border-blue-400 text-gray-600 bg-white shadow-sm"
                            value={analyticsPeriod}
                            onChange={e => setAnalyticsPeriod(e.target.value as any)}
                        >
                            <option value="ALL">All Time</option>
                            <option value="THIS_MONTH">This Month</option>
                            <option value="THIS_YEAR">This Year</option>
                            <option value="CUSTOM">Custom Range...</option>
                        </select>

                        {analyticsPeriod === 'CUSTOM' && (
                            <div className="flex items-center gap-2 bg-white border border-gray-200 p-1.5 rounded-lg shadow-sm">
                                <input type="date" className="text-xs text-gray-600 outline-none bg-transparent" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                                <span className="text-gray-400 font-bold text-[10px] uppercase">to</span>
                                <input type="date" className="text-xs text-gray-600 outline-none bg-transparent" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center items-center transition">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Estimated Revenue</span>
                        <span className="text-3xl font-black text-gray-800">${estimatedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-green-200 bg-green-50/30 flex flex-col justify-center items-center transition">
                        <span className="text-[11px] font-bold text-green-500 uppercase tracking-widest mb-1">Collected Revenue</span>
                        <span className="text-3xl font-black text-green-700">${collectedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* FILTERS TOP BAR */}
            <div className="flex flex-wrap gap-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 shrink-0 items-center">
                <div className="w-[250px]">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Client Filter</label>
                    <select className="w-full border-gray-200 border p-2.5 rounded-lg text-sm outline-none focus:border-blue-400 transition" value={clientFilter} onChange={e => setClientFilter(e.target.value === '' ? '' : Number(e.target.value))}>
                        <option value="">All Clients</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Status Filter (Multi-select)</label>
                    <div className="flex flex-wrap items-center gap-2">
                        {['DRAFT', 'SENT', 'PAID', 'OVERDUE'].map(status => (
                            <button
                                key={status}
                                onClick={() => toggleStatusFilter(status)}
                                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border transition ${statusFilters.includes(status) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 min-w-0 bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full w-full">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr className="text-gray-500 text-[10px] uppercase font-bold tracking-widest text-left">
                            <th className="px-6 py-4">Invoice #</th>
                            <th className="px-6 py-4">Client</th>
                            <th className="px-6 py-4 cursor-pointer hover:text-blue-600" onClick={() => handleSort('date')}>
                                Issue Date {sortConfig.field === 'date' ? (sortConfig.order === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:text-blue-600 text-right" onClick={() => handleSort('amount')}>
                                Amount {sortConfig.field === 'amount' ? (sortConfig.order === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {filteredAndSortedInvoices.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">No invoices match your filters.</td></tr>
                        ) : (
                            filteredAndSortedInvoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-mono font-bold text-sm text-gray-900 whitespace-nowrap">{inv.invoiceNumber}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-700 whitespace-nowrap">{inv.clientName || 'Unknown'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{inv.issueDate}</td>
                                    <td className="px-6 py-4 text-sm font-black text-gray-900 text-right whitespace-nowrap">
                                        ${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <select
                                            value={inv.status}
                                            onChange={(e) => updateInvoiceStatus(inv.id!, e.target.value).then(loadInvoices)}
                                            className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer border border-transparent hover:border-gray-300 ${statusColors[inv.status] || statusColors['DRAFT']}`}
                                        >
                                            <option value="DRAFT">Draft</option>
                                            <option value="SENT">Sent</option>
                                            <option value="OVERDUE">Overdue</option>
                                            <option value="PAID">Paid</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap space-x-3">
                                        <button onClick={() => openEditModal(inv)} className="text-[10px] font-bold text-gray-600 hover:text-blue-600 transition">Edit</button>

                                        {inv.status !== 'PAID' && (
                                            <button onClick={() => updateInvoiceStatus(inv.id!, 'PAID').then(loadInvoices)} className="text-[10px] font-bold bg-green-50 text-green-700 px-3 py-1.5 rounded border border-green-200 hover:bg-green-100 transition">Mark Paid</button>
                                        )}

                                        <button onClick={() => generatePDF(inv)} className="text-[10px] font-bold text-red-600 hover:text-red-800 transition">📄 PDF</button>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>



            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-2xl w-[600px] shadow-2xl max-h-[90vh] flex flex-col">
                        <h3 className="text-xl font-bold text-gray-800 mb-6 shrink-0">{editingInvoiceId ? 'Edit Invoice' : 'Create Draft'}</h3>

                        <form onSubmit={handleSaveInvoice} className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Client</label>
                                    <select required className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition" value={modalClientId} onChange={e => { setModalClientId(Number(e.target.value)); setModalProjectId(''); }}>
                                        <option value="">Select Client...</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.clientCode})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Project <span className="font-normal opacity-70">(Optional)</span></label>
                                    <select className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition disabled:bg-gray-50" value={modalProjectId} onChange={e => setModalProjectId(Number(e.target.value))} disabled={!modalClientId}>
                                        <option value="">General Billing</option>
                                        {filteredModalProjects.map((p: Project) => <option key={p.id} value={p.id}>{p.projectCode}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* CRM Billing Details Display */}
                            {modalClientId && (
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">CRM Billing Details</span>
                                    <p className="text-xs text-gray-600 whitespace-pre-line">{billingDetails}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Issue Date</label>
                                    <input required type="date" className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Due Date</label>
                                    <input required type="date" className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Services / Particulars</label>
                                <div className="space-y-2">
                                    {lineItems.map((item, index) => (
                                        <div key={index} className="flex gap-2 items-start">
                                            <div className="flex-1">
                                                <input required type="text" placeholder="Description" className="w-full border-gray-200 border p-2 rounded-lg text-sm outline-none focus:border-blue-400" value={item.description} onChange={e => handleLineItemChange(index, 'description', e.target.value)} />
                                            </div>
                                            <div className="w-20">
                                                <input required type="number" min="1" placeholder="Qty" className="w-full border-gray-200 border p-2 rounded-lg text-sm outline-none focus:border-blue-400" value={item.quantity} onChange={e => handleLineItemChange(index, 'quantity', Number(e.target.value))} />
                                            </div>
                                            <div className="w-28">
                                                <input required type="number" step="0.01" min="0" placeholder="Price" className="w-full border-gray-200 border p-2 rounded-lg text-sm outline-none focus:border-blue-400" value={item.price} onChange={e => handleLineItemChange(index, 'price', Number(e.target.value))} />
                                            </div>
                                            {lineItems.length > 1 && <button type="button" onClick={() => removeLineItem(index)} className="p-2 text-red-400 hover:text-red-600 bg-red-50 rounded-lg shrink-0">✕</button>}
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={addLineItem} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 mt-2 ml-1">+ Add line item</button>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center mt-4 border border-gray-100">
                                <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Invoice Amount</span>
                                <span className="text-2xl font-black text-gray-900">${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>

                            <div className="flex gap-3 pt-4 mt-2 border-t border-gray-100">
                                <button type="button" onClick={closeModal} className="flex-1 bg-gray-100 p-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition">Cancel</button>
                                <button type="submit" disabled={!modalClientId || calculateTotal() === 0} className="flex-1 bg-blue-600 p-3 rounded-xl font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-50">Save Invoice</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};