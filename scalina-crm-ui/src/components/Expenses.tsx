import React, { useState, useEffect } from 'react';
import {
    fetchTeamMembers,
    fetchExpenses,
    createExpense,
    updateExpense,
    updateExpenseStatus,
    deleteExpense, // Make sure you added this to api.ts
    type TeamMember,
    type Expense
} from '../services/api';

// Helper to turn uploaded images into usable Data URLs (Base64)
const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const Expenses: React.FC = () => {
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);

    // --- UI State ---
    const [modalStep, setModalStep] = useState<'NONE' | 'CHOOSE_TYPE' | 'FORM'>('NONE');
    const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);

    // --- Filter, Sort & Analytics State ---
    const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'RECURRING' | 'ONE_TIME'>('ALL');
    const [sortConfig, setSortConfig] = useState<{ field: 'date' | 'amount', order: 'asc' | 'desc' }>({ field: 'date', order: 'desc' });

    // Analytics Dropdown
    const [analyticsPeriod, setAnalyticsPeriod] = useState<'ALL' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('THIS_MONTH');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // --- Form State ---
    const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState<'MONTHLY' | 'WEEKLY'>('MONTHLY');
    const [category, setCategory] = useState<string>('Salary');
    const [title, setTitle] = useState('');
    const [payee, setPayee] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [expenseDate, setExpenseDate] = useState('');
    const [reference, setReference] = useState('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | undefined>(undefined);

    async function loadExpenses() {
        const data = await fetchExpenses();
        setExpenses(data);
    }

    useEffect(() => {
        fetchTeamMembers().then(setTeamMembers);
        fetchExpenses().then(setExpenses);
    }, []);

    const handleSaveExpense = async (e: React.FormEvent) => {
        e.preventDefault();

        let finalReceiptUrl = existingReceiptUrl;
        if (receiptFile) {
            finalReceiptUrl = await convertFileToBase64(receiptFile);
        }

        const payload = {
            title: title,
            type: category,
            expenseDate: expenseDate,
            payee: category === 'Salary' ? payee : title,
            amount: Number(amount),
            isPaid: false,
            isRecurring: isRecurring,
            frequency: isRecurring ? frequency : undefined, // Include frequency
            reference: reference,
            receiptUrl: finalReceiptUrl
        };

        if (editingExpenseId) {
            await updateExpense(editingExpenseId, payload as Partial<Expense>);
        } else {
            await createExpense(payload as unknown as Expense);
        }

        closeModal();
        loadExpenses();
    };

    const handleDeleteExpense = async (id: number) => {
        if (window.confirm("Are you sure you want to delete this expense? This cannot be undone.")) {
            await deleteExpense(id);
            setExpenses(currentExpenses => currentExpenses.filter(exp => exp.id !== id));
        }
    };

    const getNextMonthDate = (currentDateStr: string) => {
        const [year, month, day] = currentDateStr.split('-').map(Number);
        let nextMonth = month + 1;
        let nextYear = year;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear += 1;
        }
        const daysInNextMonth = new Date(nextYear, nextMonth, 0).getDate();
        const nextDay = Math.min(day, daysInNextMonth);
        return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
    };

    const getNextWeekDate = (currentDateStr: string) => {
        const date = new Date(currentDateStr);
        date.setDate(date.getDate() + 7);
        return date.toISOString().split('T')[0];
    };

    const handleMakePayment = async (exp: any) => {
        if (exp.amount === 0) {
            alert("This expense is currently $0.00. Please enter the pay amount before making the payment.");
            openEditModal(exp);
            return;
        }

        if (window.confirm("Confirm payment? This will move the expense to History and affect Profit/Loss.")) {
            await updateExpenseStatus(exp.id!, 'PAID');

            if (exp.isRecurring) {
                // Generate next date based on Weekly or Monthly frequency
                const nextDateStr = exp.frequency === 'WEEKLY' ? getNextWeekDate(exp.expenseDate) : getNextMonthDate(exp.expenseDate);

                await createExpense({
                    title: exp.title,
                    type: exp.type,
                    payee: exp.payee,
                    amount: exp.amount,
                    expenseDate: nextDateStr,
                    isPaid: false,
                    isRecurring: true,
                    frequency: exp.frequency, // Carry forward the frequency
                    reference: exp.reference
                } as Expense);
            }

            loadExpenses();
        }
    };

    const openEditModal = (exp: any) => {
        setEditingExpenseId(exp.id!);
        setIsRecurring(exp.isRecurring || false);
        setFrequency(exp.frequency || 'MONTHLY');
        setCategory(exp.type);
        setTitle(exp.title);
        setPayee(exp.payee || '');
        setAmount(exp.amount === 0 ? '' : exp.amount);
        setExpenseDate(exp.expenseDate);
        setReference(exp.reference || '');
        setExistingReceiptUrl(exp.receiptUrl);
        setModalStep('FORM');
    };

    const closeModal = () => {
        setModalStep('NONE');
        setEditingExpenseId(null);
        setIsRecurring(false);
        setFrequency('MONTHLY');
        setCategory('Salary');
        setTitle('');
        setPayee('');
        setAmount('');
        setExpenseDate('');
        setReference('');
        setReceiptFile(null);
        setExistingReceiptUrl(undefined);
    };

    const handleSort = (field: 'date' | 'amount') => {
        setSortConfig({
            field,
            order: sortConfig.field === field && sortConfig.order === 'asc' ? 'desc' : 'asc'
        });
    };

    const toggleCategoryFilter = (cat: string) => {
        if (categoryFilters.includes(cat)) {
            setCategoryFilters(categoryFilters.filter(c => c !== cat));
        } else {
            setCategoryFilters([...categoryFilters, cat]);
        }
    };

    // --- ANALYTICS FILTERING LOGIC ---
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Pull ALL expenses for the period (Paid + Unpaid) for the Estimated Total
    const periodExpenses = expenses.filter(exp => {
        if (analyticsPeriod === 'ALL') return true;

        const expDate = new Date(exp.expenseDate);
        if (isNaN(expDate.getTime())) return true;

        if (analyticsPeriod === 'THIS_MONTH') {
            return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        }
        if (analyticsPeriod === 'THIS_YEAR') {
            return expDate.getFullYear() === currentYear;
        }
        if (analyticsPeriod === 'CUSTOM') {
            if (customStart && exp.expenseDate < customStart) return false;
            if (customEnd && exp.expenseDate > customEnd) return false;
            return true;
        }
        return true;
    });

    const totalPaid = periodExpenses.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
    // Estimated Expenses includes what has been paid PLUS what is coming up in the selected timeframe
    const estimatedExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryBreakdown = periodExpenses.filter(e => e.isPaid).reduce((acc, curr) => {
        acc[curr.type] = (acc[curr.type] || 0) + curr.amount;
        return acc;
    }, {} as Record<string, number>);

    // --- TABLE FILTERING LOGIC ---
    // SORTED: Closest deadline first (ascending order)
    const upcomingPayments = expenses
        .filter(e => !e.isPaid)
        .sort((a, b) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime());

    const expenseHistory = expenses
        .filter(e => e.isPaid)
        .filter(e => categoryFilters.length === 0 || categoryFilters.includes(e.type))
        .filter(e => typeFilter === 'ALL' || (typeFilter === 'RECURRING' && e.isRecurring) || (typeFilter === 'ONE_TIME' && !e.isRecurring))
        .sort((a, b) => {
            if (sortConfig.field === 'amount') {
                return sortConfig.order === 'asc' ? a.amount - b.amount : b.amount - a.amount;
            } else {
                return sortConfig.order === 'asc'
                    ? new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime()
                    : new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime();
            }
        });

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col gap-8 relative">

            {/* HEADER */}
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Expenses & Payroll</h2>
                </div>
                <button onClick={() => setModalStep('CHOOSE_TYPE')} className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 font-medium transition">
                    + Log Expense
                </button>
            </div>

            {/* UPCOMING PAYMENTS */}
            <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Upcoming Payments (Pending)</h3>

                {upcomingPayments.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm shadow-sm">
                        No pending payments. You are all caught up!
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {upcomingPayments.map((exp: any) => (
                            <div key={exp.id} className={`bg-white p-5 rounded-xl shadow-sm border flex flex-col gap-3 transition-all ${exp.amount === 0 ? 'border-red-300 bg-red-50/20' : 'border-yellow-200 hover:shadow-md'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-gray-800">{exp.title}</h4>
                                        <div className="flex gap-2 mt-1">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wider ${exp.isRecurring ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                                                {exp.isRecurring ? `Recurring (${exp.frequency || 'Monthly'})` : 'One-Time'}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase text-gray-600 bg-gray-100 px-2 py-0.5 rounded tracking-wider">
                                                {exp.type}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`text-lg font-black ${exp.amount === 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                        ${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>

                                <div className="text-xs text-gray-500 font-medium flex justify-between items-end">
                                    <span>Due: <span className="text-gray-800 font-bold">{exp.expenseDate}</span></span>
                                    {exp.receiptUrl && <span className="text-blue-500 text-[10px] uppercase font-bold">🖼️ Receipt Attached</span>}
                                </div>

                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={() => handleDeleteExpense(exp.id!)}
                                        className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold rounded-lg transition text-xs border border-red-100"
                                        title="Delete Expense"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                    <button onClick={() => openEditModal(exp)} className={`flex-1 font-bold py-2 rounded-lg transition text-xs ${exp.amount === 0 ? 'bg-red-500 text-white hover:bg-red-600 shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                        {exp.amount === 0 ? 'Set Amount' : 'Edit Details'}
                                    </button>
                                    <button onClick={() => handleMakePayment(exp)} className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-bold py-2 rounded-lg transition text-xs">
                                        Make Payment
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* DYNAMIC EXPENSE OVERVIEW MINI-DASHBOARD */}
            <div className="flex flex-col gap-3 shrink-0">
                <div className="flex flex-wrap justify-between items-end gap-4">
                    <h3 className="text-sm font-bold text-gray-600 uppercase tracking-widest">Expense Analytics</h3>

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

                {/* Updated Analytics Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* Total Paid Card */}
                    <div className="bg-red-50 p-5 rounded-xl shadow-sm border border-red-200 flex flex-col justify-center items-start">
                        <span className="text-[11px] font-bold text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            Total Paid
                        </span>
                        <span className="text-3xl font-black text-red-700">${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    {/* Estimated Expenses Card (Includes Upcoming) */}
                    <div className="bg-orange-50 p-5 rounded-xl shadow-sm border border-orange-200 flex flex-col justify-center items-start">
                        <span className="text-[11px] font-bold text-orange-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            Estimated Expenses
                        </span>
                        <span className="text-3xl font-black text-orange-700">${estimatedExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <span className="text-[10px] font-medium text-orange-600 mt-1">Includes unpaid upcoming</span>
                    </div>

                    {/* Category Breakdown */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col col-span-1 lg:col-span-2">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Category Breakdown (Paid)</span>
                        {Object.keys(categoryBreakdown).length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 font-medium">No expenses recorded for this period.</div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 flex-1 items-center">
                                {Object.entries(categoryBreakdown).map(([cat, amt]) => (
                                    <div key={cat} className="p-3 rounded-xl border border-gray-200 bg-gray-50 flex flex-col justify-center shadow-sm">
                                        <span className="text-[10px] font-bold uppercase tracking-widest mb-1 truncate text-gray-500">{cat}</span>
                                        <span className="text-lg font-black text-gray-800">${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* EXPENSE HISTORY */}
            <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-4 justify-between items-center">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2">Filter Categories:</span>
                        {['Salary', 'Software Subscription', 'Equipment', 'Travel', 'Others'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => toggleCategoryFilter(cat)}
                                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border transition ${categoryFilters.includes(cat) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1">Type:</span>
                        <select className="border-gray-200 border p-1.5 rounded-lg text-xs font-bold outline-none focus:border-blue-400 text-gray-600 bg-white" value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}>
                            <option value="ALL">All</option>
                            <option value="RECURRING">Recurring</option>
                            <option value="ONE_TIME">One-Time</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full w-full">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                        <tr className="text-gray-500 text-[10px] uppercase font-bold tracking-widest text-left">
                            <th className="px-6 py-4 cursor-pointer hover:text-blue-600" onClick={() => handleSort('date')}>
                                Date Paid {sortConfig.field === 'date' ? (sortConfig.order === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th className="px-6 py-4">Title / Payee</th>
                            <th className="px-6 py-4">Category</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Ref / Receipt</th>
                            <th className="px-6 py-4 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort('amount')}>
                                Amount {sortConfig.field === 'amount' ? (sortConfig.order === 'asc' ? '↑' : '↓') : ''}
                            </th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {expenseHistory.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">No expenses match your filters.</td></tr>
                        ) : (
                            expenseHistory.map((exp: any) => (
                                <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-gray-600 font-medium whitespace-nowrap">{exp.expenseDate}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <p className="font-bold text-sm text-gray-900">{exp.title}</p>
                                        {exp.payee && exp.payee !== exp.title && <p className="text-[10px] text-gray-500 uppercase">{exp.payee}</p>}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-gray-600 whitespace-nowrap">
                                        <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 font-bold text-[10px] uppercase tracking-widest border border-gray-200">
                                            {exp.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-gray-500 whitespace-nowrap">{exp.isRecurring ? '🔄 Recurring' : 'One-Time'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col items-start gap-1">
                                            {exp.reference && <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Ref: {exp.reference}</span>}

                                            {exp.receiptUrl && (
                                                <button onClick={() => setViewReceiptUrl(exp.receiptUrl!)} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 transition">
                                                    🖼️ View Receipt
                                                </button>
                                            )}

                                            {!exp.reference && !exp.receiptUrl && <span className="text-gray-300 text-xs">-</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-black text-gray-900 text-right whitespace-nowrap">
                                        ${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RECEIPT VIEWER (LIGHTBOX) */}
            {viewReceiptUrl && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={() => setViewReceiptUrl(null)}>
                    <div className="bg-white p-2 rounded-xl shadow-2xl max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-3 border-b border-gray-100">
                            <h3 className="font-bold text-gray-800">Receipt Viewer</h3>
                            <button onClick={() => setViewReceiptUrl(null)} className="text-gray-400 hover:text-gray-800 font-bold bg-gray-100 px-3 py-1 rounded-md text-sm transition">✕ Close</button>
                        </div>
                        <div className="p-4 overflow-auto flex justify-center items-center flex-1">
                            {viewReceiptUrl.startsWith('data:image') ? (
                                <img src={viewReceiptUrl} alt="Receipt" className="max-w-full max-h-[75vh] object-contain rounded-lg border border-gray-200" />
                            ) : (
                                <p className="text-gray-500 text-sm">Cannot display this file type directly.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 1: CHOOSE TYPE */}
            {modalStep === 'CHOOSE_TYPE' && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-2xl w-[400px] shadow-2xl text-center">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Log Expense</h3>
                        <p className="text-sm text-gray-500 mb-6">What type of expense is this?</p>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <button onClick={() => { setIsRecurring(false); setModalStep('FORM'); }} className="p-6 border-2 border-gray-100 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition flex flex-col items-center gap-2">
                                <span className="text-2xl">💵</span>
                                <span className="font-bold text-gray-800 text-sm">One-Time</span>
                                <span className="text-[10px] text-gray-500">Equipment, Shoots</span>
                            </button>
                            <button onClick={() => { setIsRecurring(true); setModalStep('FORM'); }} className="p-6 border-2 border-gray-100 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition flex flex-col items-center gap-2">
                                <span className="text-2xl">🔄</span>
                                <span className="font-bold text-gray-800 text-sm">Recurring</span>
                                <span className="text-[10px] text-gray-500">Salaries, Software</span>
                            </button>
                        </div>

                        <button onClick={closeModal} className="text-sm font-bold text-gray-400 hover:text-gray-600">Cancel</button>
                    </div>
                </div>
            )}

            {/* MODAL 2: EXPENSE FORM */}
            {modalStep === 'FORM' && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-2xl w-[450px] shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800 shrink-0">
                                {editingExpenseId ? 'Edit Details' : (isRecurring ? 'New Recurring Expense' : 'New One-Time Expense')}
                            </h3>
                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${isRecurring ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                                {isRecurring ? 'Recurring' : 'One-Time'}
                            </span>
                        </div>

                        <form onSubmit={handleSaveExpense} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Category</label>
                                    <select required className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition" value={category} onChange={e => setCategory(e.target.value)}>
                                        <option value="Salary">Salary</option>
                                        <option value="Software Subscription">Software Subscription</option>
                                        <option value="Equipment">Equipment</option>
                                        <option value="Travel">Travel</option>
                                        <option value="Others">Others</option>
                                    </select>
                                </div>
                                {isRecurring && (
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Frequency</label>
                                        <select required className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-purple-400 transition" value={frequency} onChange={e => setFrequency(e.target.value as any)}>
                                            <option value="MONTHLY">Monthly</option>
                                            <option value="WEEKLY">Weekly</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">
                                    {category === 'Salary' ? 'Team Member' : 'Title / Description'}
                                </label>
                                {category === 'Salary' ? (
                                    <select required className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition" value={payee} onChange={e => { setPayee(e.target.value); setTitle(`${e.target.value} - Base Pay`); }}>
                                        <option value="">Select Team Member...</option>
                                        {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                    </select>
                                ) : (
                                    <input required type="text" placeholder="e.g. Adobe Creative Cloud" className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition" value={title} onChange={e => setTitle(e.target.value)} />
                                )}
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Date</label>
                                    <input required type="date" className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Amount ($)</label>
                                    <input required type="number" step="0.01" min="0" placeholder="0.00" className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition text-lg font-medium" value={amount} onChange={e => setAmount(Number(e.target.value))} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Reference (Optional)</label>
                                <input type="text" placeholder="e.g. INV-123" className="w-full border-gray-200 border p-3 rounded-xl outline-none focus:border-blue-400 transition" value={reference} onChange={e => setReference(e.target.value)} />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Receipt Photo Upload</label>
                                {existingReceiptUrl && !receiptFile && (
                                    <div className="mb-2 text-xs font-bold text-green-600 bg-green-50 p-2 rounded flex items-center gap-2">
                                        <span>✓ Receipt already attached</span>
                                    </div>
                                )}
                                <input type="file" accept="image/*" className="w-full border-gray-200 border p-2 rounded-xl text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer" onChange={e => setReceiptFile(e.target.files ? e.target.files[0] : null)} />
                            </div>

                            <div className="flex gap-3 pt-4 mt-2 border-t border-gray-100">
                                <button type="button" onClick={closeModal} className="flex-1 bg-gray-100 p-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition">Cancel</button>
                                <button type="submit" className="flex-1 bg-blue-600 p-3 rounded-xl font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition">Save Details</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
