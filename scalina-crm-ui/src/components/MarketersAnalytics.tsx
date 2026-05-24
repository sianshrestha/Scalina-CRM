import React, { useState, useEffect } from 'react';
import {
    fetchTeamMembers,
    fetchPipeline,
    fetchInvoices,
    fetchExpenses,
    createExpense,
    type TeamMember,
    type ClientLead,
    type Invoice,
    type Expense
} from '../services/api';

export const MarketersAnalytics: React.FC = () => {
    const [marketers, setMarketers] = useState<TeamMember[]>([]);
    const [clients, setClients] = useState<ClientLead[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);

    const [selectedMarketer, setSelectedMarketer] = useState<TeamMember | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [analyticsPeriod, setAnalyticsPeriod] = useState<'ALL' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('ALL');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [teamData, clientsData, invoicesData, expensesData] = await Promise.all([
                fetchTeamMembers(),
                fetchPipeline(),
                fetchInvoices(),
                fetchExpenses()
            ]);

            const marketersOnly = teamData.filter((m: TeamMember) => m.role === 'Marketer');
            setMarketers(marketersOnly);
            setClients(clientsData);
            setInvoices(invoicesData);
            setExpenses(expensesData);

            if (marketersOnly.length > 0 && !selectedMarketer) {
                setSelectedMarketer(marketersOnly[0]);
            }
        } catch (error) {
            console.error("Failed to load analytics data", error);
        }
        setIsLoading(false);
    };

    const handlePayCommission = async (projectedAmount: number) => {
        if (!selectedMarketer) return;

        const safeFirstName = selectedMarketer.firstName || '';
        const safeLastName = selectedMarketer.lastName || '';
        const marketerFullName = `${safeFirstName} ${safeLastName}`.trim() || selectedMarketer.name || 'Unknown Marketer';

        if (window.confirm(`Projected Pending Commission is $${projectedAmount.toFixed(2)}.\n\nCreate a new pending Expense to pay ${safeFirstName || 'this marketer'}? You can adjust the final payout amount in the Expenses tab.`)) {
            const today = new Date();
            const offset = today.getTimezoneOffset();
            const localDateStr = new Date(today.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];

            const newExpense = {
                title: `Commission - ${marketerFullName}`,
                type: 'Commission',
                payee: marketerFullName,
                amount: 0, // Leaves it at 0 so it flashes red in the Upcoming grid to remind you to set it!
                expenseDate: localDateStr,
                isPaid: false,
                isRecurring: false,
                reference: 'Auto-generated from Marketer Analytics Tracker'
            };

            try {
                await createExpense(newExpense as any);
                alert("✅ Pending commission expense created! Head over to the Expenses & Payroll tab to finalize the payment.");
                loadData();
            } catch (error) {
                console.error("Error creating commission:", error);
                alert("Failed to create commission payment.");
            }
        }
    };

    // --- CALCULATIONS, FILTERING & PROJECTIONS ---
    const getMarketerStats = () => {
        if (!selectedMarketer) return { broughtClients: [], totalEstimatedRevenue: 0, commissionsPaid: 0, profit: 0, projectedCommissions: 0, filteredClientRevenue: {} as Record<number, { estimated: number, collected: number }> };

        const safeFirstName = selectedMarketer.firstName || '';
        const fallbackName = selectedMarketer.name || '';

        const broughtClients = clients.filter(c => {
            const mId = c.marketer?.id || (c.marketer as any);
            return mId === selectedMarketer.id;
        });

        const broughtClientIds = broughtClients
            .map(c => c.id)
            .filter((id): id is number => id !== undefined);

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const isDateInPeriod = (dateString?: string) => {
            if (analyticsPeriod === 'ALL') return true;
            if (!dateString) return false;

            const d = new Date(dateString);
            if (isNaN(d.getTime())) return false;

            if (analyticsPeriod === 'THIS_MONTH') {
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            }
            if (analyticsPeriod === 'THIS_YEAR') {
                return d.getFullYear() === currentYear;
            }
            if (analyticsPeriod === 'CUSTOM') {
                if (customStart && dateString < customStart) return false;
                if (customEnd && dateString > customEnd) return false;
                return true;
            }
            return true;
        };

        let totalEstimatedRevenue = 0;
        let projectedCommissions = 0;
        const filteredClientRevenue: Record<number, { estimated: number, collected: number }> = {};

        invoices.forEach(i => {
            const resolvedClientId = i.client?.id || i.clientId;

            if (resolvedClientId !== undefined && broughtClientIds.includes(resolvedClientId) && isDateInPeriod(i.invoiceDate)) {

                if (!filteredClientRevenue[resolvedClientId]) {
                    filteredClientRevenue[resolvedClientId] = { estimated: 0, collected: 0 };
                }

                // Any active invoice counts toward Estimated Revenue
                if (i.status === 'SENT' || i.status === 'PAID' || i.status === 'OVERDUE') {
                    totalEstimatedRevenue += i.amount;
                    filteredClientRevenue[resolvedClientId].estimated += i.amount;

                    if (i.status === 'PAID') {
                        filteredClientRevenue[resolvedClientId].collected += i.amount;
                    }
                }

                // PROJECTION TRACKER LOGIC: Only look at SENT or OVERDUE invoices
                if (i.status === 'SENT' || i.status === 'OVERDUE') {
                    const matchedClient = broughtClients.find(c => c.id === resolvedClientId);
                    if (matchedClient && matchedClient.marketersCut) {
                        const weeks = i.weeksCovered || 1;
                        projectedCommissions += (matchedClient.marketersCut * weeks);
                    }
                }
            }
        });

        const commissionsPaid = expenses
            .filter(e => {
                const isPaid = e.isPaid;
                const isComm = e.type === 'Commission';
                const matchesPayee = (e.payee && safeFirstName && e.payee.includes(safeFirstName)) ||
                    (e.title && safeFirstName && e.title.includes(safeFirstName)) ||
                    (e.payee === fallbackName);

                return isPaid && isComm && matchesPayee && isDateInPeriod(e.expenseDate);
            })
            .reduce((sum, exp) => sum + exp.amount, 0);

        const profit = totalEstimatedRevenue - commissionsPaid;

        return { broughtClients, totalEstimatedRevenue, commissionsPaid, profit, projectedCommissions, filteredClientRevenue };
    };

    const stats = getMarketerStats();

    if (isLoading) {
        return <div className="p-6 flex justify-center text-gray-400 font-bold tracking-widest mt-20">GATHERING ANALYTICS...</div>;
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col gap-6">
            <div className="flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-bold text-gray-800">Marketer Analytics</h2>
                <p className="text-sm text-gray-500 font-medium bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hidden md:block">
                    Track performance, revenue, and commissions.
                </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">

                {/* LEFT SIDEBAR: Marketer List */}
                <div className="w-full lg:w-1/4 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden shrink-0 sticky top-6">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Active Marketers</h3>
                    </div>
                    <div className="flex flex-col">
                        {marketers.length === 0 ? (
                            <div className="p-6 text-center text-sm text-gray-400">No marketers found on the team.</div>
                        ) : (
                            marketers.map(m => {
                                const safeFirstName = m.firstName || '';
                                const safeLastName = m.lastName || '';
                                const fallbackInitials = m.name ? m.name.substring(0, 2).toUpperCase() : 'M';
                                const initials = safeFirstName ? `${safeFirstName.substring(0, 1)}${safeLastName ? safeLastName.substring(0, 1) : ''}` : fallbackInitials;

                                return (
                                    <button
                                        key={m.id}
                                        onClick={() => setSelectedMarketer(m)}
                                        className={`p-4 text-left border-l-4 transition-all flex items-center gap-3 ${selectedMarketer?.id === m.id ? 'border-emerald-500 bg-emerald-50/30' : 'border-transparent hover:bg-gray-50'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase ${selectedMarketer?.id === m.id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {initials}
                                        </div>
                                        <div>
                                            <div className={`font-bold text-sm ${selectedMarketer?.id === m.id ? 'text-emerald-900' : 'text-gray-800'}`}>
                                                {safeFirstName} {safeLastName}
                                                {(!safeFirstName && !safeLastName) && m.name}
                                            </div>
                                            <div className="text-[10px] text-gray-400 tracking-wider">MARKETER</div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL: Analytics Dashboard */}
                {selectedMarketer ? (
                    <div className="w-full lg:w-3/4 flex flex-col gap-6">

                        <div className="flex flex-wrap justify-between items-end gap-4">
                            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-widest">Performance Metrics</h3>
                            <div className="flex flex-wrap items-center gap-3">
                                <select
                                    className="border-gray-200 border p-2 rounded-lg text-xs font-bold outline-none focus:border-emerald-400 text-gray-600 bg-white shadow-sm"
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

                        {/* 4-COLUMN TOP METRICS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Estimated Revenue</span>
                                <span className="text-2xl font-black text-gray-900">${stats.totalEstimatedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>

                            <div className="bg-emerald-50 p-5 rounded-xl shadow-sm border border-emerald-200 flex flex-col justify-center">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Net Profit</span>
                                <span className="text-2xl font-black text-emerald-800">${stats.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>

                            {/* THE PROJECTION TRACKER BLOCK */}
                            <div className="bg-amber-50 p-5 rounded-xl shadow-sm border border-amber-200 flex flex-col justify-center">
                                <div>
                                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block mb-1">Pending Commissions</span>
                                    <span className="text-2xl font-black text-amber-800">${stats.projectedCommissions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-5 rounded-xl shadow-sm border border-blue-200 flex flex-col justify-between">
                                <div>
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-1">Commissions Paid</span>
                                    <span className="text-2xl font-black text-blue-800">${stats.commissionsPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <button
                                    onClick={() => handlePayCommission(stats.projectedCommissions)}
                                    className="mt-3 w-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest py-2 rounded shadow-sm hover:bg-blue-700 transition"
                                >
                                    Make Payment
                                </button>
                            </div>


                        </div>

                        {/* CLIENTS LIST */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1">
                            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    🤝 Clients Brought by {selectedMarketer.firstName || selectedMarketer.name || 'this Marketer'}
                                </h3>
                                <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded">
                                    {stats.broughtClients.length} Total
                                </span>
                            </div>

                            <table className="min-w-full w-full">
                                <thead className="bg-white border-b border-gray-100">
                                <tr className="text-gray-400 text-[10px] uppercase font-bold tracking-widest text-left">
                                    <th className="px-6 py-4">Client / Company</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Estimated Revenue</th>
                                    <th className="px-6 py-4 text-right">Collected Revenue</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                {stats.broughtClients.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-10 text-gray-400 text-sm">This marketer hasn't brought any clients yet.</td></tr>
                                ) : (
                                    stats.broughtClients.map(client => {
                                        const revenues = client.id !== undefined ? (stats.filteredClientRevenue[client.id] || { estimated: 0, collected: 0 }) : { estimated: 0, collected: 0 };

                                        return (
                                            <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-sm text-gray-900">{client.name}</div>
                                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{client.company || client.clientCode || '-'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded uppercase tracking-widest">
                                                            {client.pipelineStage}
                                                        </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-gray-800">
                                                    ${revenues.estimated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-emerald-700">
                                                    ${revenues.collected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                                </tbody>
                            </table>
                        </div>

                    </div>
                ) : (
                    <div className="w-full lg:w-3/4 flex flex-col items-center justify-center bg-white border border-gray-200 rounded-xl p-10 text-gray-400">
                        <span className="text-4xl mb-4">📊</span>
                        <p className="font-medium">Select a marketer from the left to view their analytics.</p>
                    </div>
                )}
            </div>
        </div>
    );
};