import { useState, useEffect } from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import {
    fetchPipeline,
    fetchInvoices,
    createInvoice,
    updateInvoice,
    updateInvoiceStatus,
    type ClientLead,
    type Invoice,
    type InvoiceItem
} from '../services/api';

import logoImg from '../assets/scalina-media.png';
import signatureImg from '../assets/signature.png';

// --- PIXEL-PERFECT PDF STYLES ---
const pdfStyles = StyleSheet.create({
    page: {
        paddingTop: 0, paddingBottom: 50, paddingLeft: 55, paddingRight: 55,
        fontFamily: 'Helvetica', fontSize: 10, color: '#000000', backgroundColor: '#FFFFFF',
    },

    headerDivider: {
        borderBottomWidth: 1.2, borderBottomColor: '#000000', marginBottom: 11,
    },


    // ── HEADER ──────────────────────────────────────────────────────────────
    headerContainer: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
    },
    logoAndTitle: { width: '55%' },
    logo: { width: 210, marginBottom: 0 },
    invoiceTitleMain: {
        fontSize: 30, fontFamily: 'Helvetica-Bold', color: '#000000',
        letterSpacing: 2, textAlign: 'right',
    },

    // ── DIVIDER LINE under header ────────────────────────────────────────────

    // ── INVOICE TO + DETAILS (two-column row) ───────────────────────────────
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    invoiceToBlock: { width: '52%' },
    billToLabel: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginBottom: 10 },
    clientName: { fontSize: 12, fontFamily: 'Helvetica', marginBottom: 5 },
    clientText: { fontSize: 12, marginBottom: 4, color: '#000000', lineHeight: 1.4 },

    invoiceDetailsBox: { width: '40%' },
    detailRow: { flexDirection: 'row', marginBottom: 6 },
    detailLabel: { fontFamily: 'Helvetica-Bold', fontSize: 12, width: '52%', textAlign: 'left' },
    detailValue: { fontSize: 12, width: '48%', textAlign: 'left' },

    // ── TABLE ────────────────────────────────────────────────────────────────
    table: { width: '100%' },
    tableTopLine: { borderTopWidth: 1.2, borderTopColor: '#000000' },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1.2, borderBottomColor: '#000000',
        paddingVertical: 8,
    },
    tableHeaderCol: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: '#000000' },
    tableRow: { flexDirection: 'row', paddingVertical: 10 },
    tableBottomLine: { borderTopWidth: 1, borderTopColor: '#cccccc', marginTop: 4 },

    colSn: { width: '8%', textAlign: 'center' },
    colDesc: { width: '44%' },
    colQty: { width: '16%', textAlign: 'center' },
    colPrice: { width: '16%', textAlign: 'right' },
    colTotal: { width: '16%', textAlign: 'right' },


    // ── BANK DETAILS + TOTALS side-by-side ───────────────────────────────────
    // Outer row: left=bank details, right=totals — both start at the same top edge
    bottomSection: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-start', marginTop: 28,
    },

    // Left half: bank details then signature stacked vertically
    bottomLeft: { width: '52%' },
    bankText: { fontSize: 10, color: '#000000', lineHeight: 1.7 },
    bankEmailGap: { marginBottom: 8 },

    // Signature sits below bank details on the left
    signatureBox: {
        marginTop: 14,
        width: 155, height: 55,
        borderBottomWidth: 1, borderBottomColor: '#000000',
        justifyContent: 'flex-end', alignItems: 'center', marginBottom: 4,
    },
    signatureImage: { width: 135, height: 50, objectFit: 'contain' },
    adminText: { fontSize: 10, textAlign: 'center', width: 155 },

    // Right half: totals block
    totalsWrapper: { width: '44%' },
    totalsTopLine: { borderTopWidth: 1, borderTopColor: '#000000' },
    totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
    totalsBottomLine: { borderTopWidth: 1, borderTopColor: '#000000' },
    totalFinalRow: {
        flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5,
        fontFamily: 'Helvetica-Bold', fontSize: 11,
    },
    totalsEndLine: { borderTopWidth: 1, borderTopColor: '#000000' },

    // THANK YOU — sits to the right, below totals
    thankYouText: {
        fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#000000',
        letterSpacing: 1, marginTop: 64, textAlign: 'center',
    },

    boldText: { fontFamily: 'Helvetica-Bold' },
});

const formatToAustralianDate = (dateString?: string) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateString;
};



// --- PDF RENDERER COMPONENT ---
const InvoiceDocument = ({ invoice, client }: { invoice: any, client: any }) => {
    const formatMoney = (amount: number) => `$${(amount || 0).toFixed(2)}`;

    // Reverse math for the PDF subtotal if GST was applied
    const subTotal = invoice.hasGst ? (invoice.amount - invoice.gstAmount) : invoice.amount;

    return (
        <Document>
            <Page size="A4" style={pdfStyles.page}>

                {/* ── HEADER: Logo (left) + "INVOICE" title (right) ── */}
                <View style={pdfStyles.headerContainer}>
                    <View style={pdfStyles.logoAndTitle}>
                        <Image src={logoImg} style={pdfStyles.logo} />
                    </View>
                    <Text style={pdfStyles.invoiceTitleMain}>INVOICE</Text>
                </View>

                {/* ── FULL-WIDTH DIVIDER ── */}
                <View style={pdfStyles.headerDivider} />

                {/* ── "INVOICE TO" (left) + Details grid (right) ── */}
                <View style={pdfStyles.infoRow}>
                    <View style={pdfStyles.invoiceToBlock}>
                        <Text style={pdfStyles.billToLabel}>INVOICE TO :</Text>
                        <Text style={pdfStyles.clientName}>{client?.company || client?.name}</Text>
                        {client?.abn && <Text style={pdfStyles.clientText}>ABN: {client.abn}</Text>}
                        {client?.address && <Text style={pdfStyles.clientText}>Address: {client.address}</Text>}
                    </View>

                    <View style={pdfStyles.invoiceDetailsBox}>
                        <View style={pdfStyles.detailRow}>
                            <Text style={pdfStyles.detailLabel}>Client ID:</Text>
                            <Text style={pdfStyles.detailValue}>{'SM'+client?.clientCode || '___'}</Text>
                        </View>
                        <View style={pdfStyles.detailRow}>
                            <Text style={pdfStyles.detailLabel}>Invoice No:</Text>
                            <Text style={pdfStyles.detailValue}>{invoice.invoiceNo || '001'}</Text>
                        </View>
                        <View style={pdfStyles.detailRow}>
                            <Text style={pdfStyles.detailLabel}>Invoice Date:</Text>
                            <Text style={pdfStyles.detailValue}>{formatToAustralianDate(invoice.invoiceDate)}</Text>
                        </View>
                    </View>
                </View>

                {/* ── LINE ITEMS TABLE ── */}
                <View style={pdfStyles.table}>


                    {/* Header row */}
                    <View style={pdfStyles.tableHeader}>
                        <Text style={[pdfStyles.colSn, pdfStyles.tableHeaderCol]}>S/N</Text>
                        <Text style={[pdfStyles.colDesc, pdfStyles.tableHeaderCol]}>DESCRIPTION</Text>
                        <Text style={[pdfStyles.colQty, pdfStyles.tableHeaderCol]}>QTY</Text>
                        <Text style={[pdfStyles.colPrice, pdfStyles.tableHeaderCol]}>PRICE</Text>
                        <Text style={[pdfStyles.colTotal, pdfStyles.tableHeaderCol]}>TOTAL</Text>
                    </View>


                    {/* Data rows */}
                    {invoice.items && invoice.items.map((item: any, index: number) => (
                        <View key={index} style={pdfStyles.tableRow}>
                            <Text style={pdfStyles.colSn}>{index + 1}</Text>
                            <Text style={pdfStyles.colDesc}>{item.description}</Text>
                            <Text style={pdfStyles.colQty}>{item.quantity}</Text>
                            <Text style={pdfStyles.colPrice}>{formatMoney(item.price)}</Text>
                            <Text style={pdfStyles.colTotal}>{formatMoney(item.quantity * item.price)}</Text>
                        </View>
                    ))}


                    {/* Bottom border line */}
                    <View style={pdfStyles.tableBottomLine} />
                </View>

                {/* ── BANK DETAILS (left) + TOTALS (right) — same row, flush to table bottom ── */}
                <View style={pdfStyles.bottomSection}>

                    {/* LEFT: email, bank details, then signature */}
                    <View style={pdfStyles.bottomLeft}>
                        <Text style={[pdfStyles.bankText, pdfStyles.bankEmailGap]}>info@scalinamedia.com</Text>
                        <Text style={pdfStyles.bankText}>ABN: 81821315775</Text>
                        <Text style={pdfStyles.bankText}>Account Name: Suhan Shanker</Text>
                        <Text style={pdfStyles.bankText}>BSB: 062-235</Text>
                        <Text style={pdfStyles.bankText}>Account Number: 11067512</Text>

                        {/* Signature below bank details, left-aligned */}
                        <View style={pdfStyles.signatureBox}>
                            <Image src={signatureImg} style={pdfStyles.signatureImage} />
                        </View>
                        <Text style={pdfStyles.adminText}>Administrator</Text>
                    </View>

                    {/* RIGHT: totals block + THANK YOU below */}
                    <View style={pdfStyles.totalsWrapper}>
                        <View style={pdfStyles.totalsRow}>
                            <Text style={pdfStyles.boldText}>Sub-total :</Text>
                            <Text>{formatMoney(subTotal)}</Text>
                        </View>

                        {invoice.hasGst && (
                            <View style={pdfStyles.totalsRow}>
                                <Text style={pdfStyles.boldText}>GST (10%) :</Text>
                                <Text>{formatMoney(invoice.gstAmount)}</Text>
                            </View>
                        )}

                        <View style={pdfStyles.totalsBottomLine} />
                        <View style={pdfStyles.totalFinalRow}>
                            <Text>Total :</Text>
                            <Text>{formatMoney(invoice.amount)}</Text>
                        </View>
                        <View style={pdfStyles.totalsEndLine} />

                        {/* THANK YOU right-aligned below totals */}
                        <Text style={pdfStyles.thankYouText}>THANK YOU!</Text>
                    </View>

                </View>

            </Page>
        </Document>
    );
};

const getTodayString = () => {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
};

const calculateAutoDueDate = (issueDateStr: string) => {
    if (!issueDateStr) return '';
    const d = new Date(issueDateStr);
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
};

// --- MAIN DASHBOARD COMPONENT ---
export const InvoicingHub = () => {
    const [clients, setClients] = useState<ClientLead[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);

    const [showModal, setShowModal] = useState(false);
    const [statusFilters, setStatusFilters] = useState<string[]>([]);
    const [clientFilter, setClientFilter] = useState<number | ''>('');
    const [sortConfig, setSortConfig] = useState<{ field: 'date' | 'amount' | 'invoiceNo', order: 'asc' | 'desc' }>({ field: 'date', order: 'desc' });

    const [analyticsPeriod, setAnalyticsPeriod] = useState<'ALL' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('THIS_YEAR');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
    const [modalClientId, setModalClientId] = useState<number | ''>('');
    const [issueDate, setIssueDate] = useState(getTodayString());
    const [dueDate, setDueDate] = useState(calculateAutoDueDate(getTodayString()));
    const [hasGst, setHasGst] = useState(false);

    const [weeksCovered, setWeeksCovered] = useState<number>(1);

    const [billingDetails, setBillingDetails] = useState('');
    const [lineItems, setLineItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, price: 0 }]);

    useEffect(() => {
        fetchPipeline().then(data => setClients(data.filter((c: ClientLead) => c.clientCode)));
        loadInvoices();
    }, []);

    const loadInvoices = async () => {
        try {
            const data = await fetchInvoices();
            setInvoices(data || []);
        } catch (error) {
            console.error("Could not load invoices", error);
        }
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

    const calculateSubTotal = () => lineItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    const addLineItem = () => setLineItems([...lineItems, { description: '', quantity: 1, price: 0 }]);
    const removeLineItem = (index: number) => setLineItems(lineItems.filter((_, i) => i !== index));
    const handleLineItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...lineItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setLineItems(newItems);
    };

    const handleSaveInvoice = async (e: React.FormEvent) => {
        e.preventDefault();

        const subTotal = calculateSubTotal();
        const calculatedGst = hasGst ? subTotal * 0.10 : 0;
        const grandTotal = subTotal + calculatedGst;

        const existingInvoice = editingInvoiceId
            ? invoices.find(i => i.id === editingInvoiceId)
            : null;

        const payload = {
            clientId: Number(modalClientId),
            amount: grandTotal,
            invoiceDate: issueDate,
            dueDate: dueDate,
            hasGst: hasGst,
            weeksCovered: weeksCovered,
            gstAmount: calculatedGst,
            status: existingInvoice?.status || 'DRAFT',
            items: lineItems
        };

        try {
            if (editingInvoiceId) {
                await updateInvoice(editingInvoiceId, payload as Partial<Invoice>);
            } else {
                await createInvoice(Number(modalClientId), payload as Partial<Invoice>);
            }
            closeModal();
            loadInvoices();
        } catch (error) {
            console.error("Failed to save invoice:", error);
            alert("Error saving invoice!");
        }
    };

    const openEditModal = (inv: Invoice) => {
        setEditingInvoiceId(inv.id!);
        // @ts-ignore
        setModalClientId(inv.clientId || inv.client?.id || '');
        setIssueDate(inv.invoiceDate || getTodayString());
        setDueDate(inv.dueDate || calculateAutoDueDate(inv.invoiceDate || getTodayString()));
        setWeeksCovered(inv.weeksCovered || 1);
        setHasGst(inv.hasGst || false);
        setLineItems(inv.items && inv.items.length > 0 ? inv.items : [{ description: '', quantity: 1, price: 0 }]);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingInvoiceId(null);
        setModalClientId('');
        setIssueDate(getTodayString());
        setDueDate(calculateAutoDueDate(getTodayString()));
        setWeeksCovered(1)
        setHasGst(false);
        setLineItems([{ description: '', quantity: 1, price: 0 }]);
    };

    const handleSort = (field: 'date' | 'amount' | 'invoiceNo') => {
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
        const matchedClient = inv.client || clients.find(c => c.id === inv.clientId);
        try {
            const blob = await pdf(<InvoiceDocument invoice={inv} client={matchedClient || {}} />).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Inv${inv.invoiceNo}_${matchedClient?.clientCode || 'UNKNOWN'}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
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

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const analyticsInvoices = invoices.filter(inv => {
        if (analyticsPeriod === 'ALL') return true;
        const invDate = new Date(inv.invoiceDate || '');
        if (isNaN(invDate.getTime())) return true;

        if (analyticsPeriod === 'THIS_MONTH') {
            return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
        }
        if (analyticsPeriod === 'THIS_YEAR') {
            return invDate.getFullYear() === currentYear;
        }
        if (analyticsPeriod === 'CUSTOM') {
            if (customStart && inv.invoiceDate! < customStart) return false;
            if (customEnd && inv.invoiceDate! > customEnd) return false;
            return true;
        }
        return true;
    });

    const collectedRevenue = analyticsInvoices.filter(i => i.status === 'PAID').reduce((acc, curr) => acc + curr.amount, 0);
    const estimatedRevenue = analyticsInvoices.filter(i => i.status !== 'DRAFT').reduce((acc, curr) => acc + curr.amount, 0);

    const filteredAndSortedInvoices = invoices
        .filter(inv => {
            const matchesStatus = statusFilters.length === 0 || statusFilters.includes(inv.status);
            const resolvedClientId = inv.client?.id || inv.clientId;
            const matchesClient = clientFilter === '' || resolvedClientId === Number(clientFilter);
            return matchesStatus && matchesClient;
        })
        .sort((a, b) => {
            if (sortConfig.field === 'amount') {
                return sortConfig.order === 'asc' ? a.amount - b.amount : b.amount - a.amount;
            } else if (sortConfig.field === 'invoiceNo') {
                // Alphabetical string comparison for Invoice Numbers
                return sortConfig.order === 'asc'
                    ? (a.invoiceNo || '').localeCompare(b.invoiceNo || '')
                    : (b.invoiceNo || '').localeCompare(a.invoiceNo || '');
            } else {
                return sortConfig.order === 'asc'
                    ? new Date(a.invoiceDate || '').getTime() - new Date(b.invoiceDate || '').getTime()
                    : new Date(b.invoiceDate || '').getTime() - new Date(a.invoiceDate || '').getTime();
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
                            <th className="px-6 py-4 cursor-pointer hover:text-blue-600" onClick={() => handleSort('invoiceNo')}>
                                Invoice No {sortConfig.field === 'invoiceNo' ? (sortConfig.order === 'asc' ? '↑' : '↓') : ''}
                            </th>
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
                            filteredAndSortedInvoices.map((inv) => {
                                const displayedClientName = inv.client?.name || clients.find(c => c.id === inv.clientId)?.name || 'Unknown';

                                return (
                                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-sm text-gray-900 whitespace-nowrap">{inv.invoiceNo}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-700 whitespace-nowrap">{displayedClientName}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatToAustralianDate(inv.invoiceDate)}</td>
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
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-[600px] shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
                        <div className="p-6 border-b border-gray-100 shrink-0">
                            <h3 className="text-xl font-bold text-gray-800">{editingInvoiceId ? 'Edit Invoice' : 'Create Draft'}</h3>
                        </div>

                        <form onSubmit={handleSaveInvoice} className="flex flex-col flex-1 min-h-0">
                            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Client</label>
                                    <select required className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition" value={modalClientId} onChange={e => setModalClientId(Number(e.target.value))}>
                                        <option value="">Select Client...</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.clientCode})</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Issue Date</label>
                                        <input required type="date" className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition" value={issueDate} onChange={e => {
                                            setIssueDate(e.target.value);
                                            setDueDate(calculateAutoDueDate(e.target.value));
                                        }} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Due Date</label>
                                        <input required type="date" className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Weeks Covered</label>
                                        <input required type="number" min="1" className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition" value={weeksCovered} onChange={e => setWeeksCovered(Number(e.target.value))} />
                                    </div>
                                </div>


                                {modalClientId && (
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">CRM Billing Details</span>
                                        <p className="text-xs text-gray-600 whitespace-pre-line">{billingDetails}</p>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-gray-100">
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

                                <div className="flex items-center gap-3 mt-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                    <input type="checkbox" id="gstToggle" checked={hasGst} onChange={e => setHasGst(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" />
                                    <label htmlFor="gstToggle" className="text-sm font-bold text-blue-800 cursor-pointer select-none">Apply 10% GST to this Invoice</label>
                                </div>
                            </div>

                            <div className="p-6 pt-4 bg-white border-t border-gray-100 shrink-0">
                                {hasGst && (
                                    <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-x border-t border-gray-100 rounded-t-xl">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">GST (10%)</span>
                                        <span className="text-sm font-bold text-gray-600">+ ${(calculateSubTotal() * 0.10).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className={`bg-gray-50 p-4 flex justify-between items-center border border-gray-100 ${hasGst ? 'rounded-b-xl border-t-0' : 'rounded-xl'}`}>
                                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Grand Total</span>
                                    <span className="text-2xl font-black text-gray-900">${(calculateSubTotal() * (hasGst ? 1.1 : 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>

                                <div className="flex gap-3 pt-4 mt-4">
                                    <button type="button" onClick={closeModal} className="flex-1 bg-gray-100 p-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition">Cancel</button>
                                    <button type="submit" disabled={!modalClientId} className="flex-1 bg-blue-600 p-3 rounded-xl font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-50">Save Invoice</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};