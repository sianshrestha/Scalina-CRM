import React, { useState, useEffect } from 'react';
import {
    fetchPipeline,
    fetchAllProjects,
    fetchAllTasks,
    fetchInvoices,
    fetchExpenses,
    type ClientLead,
    type Project,
    type Task,
    type Invoice,
    type Expense
} from '../services/api';

export const Dashboard: React.FC = () => {
    const [leads, setLeads] = useState<ClientLead[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [analyticsPeriod, setAnalyticsPeriod] = useState<'ALL' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('THIS_MONTH');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                const [leadsData, projectsData, tasksData, invoicesData, expensesData] = await Promise.all([
                    fetchPipeline(),
                    fetchAllProjects(),
                    fetchAllTasks(),
                    fetchInvoices(),
                    fetchExpenses()
                ]);

                setLeads(leadsData);
                setProjects(projectsData);
                setTasks(tasksData);
                setInvoices(invoicesData);
                setExpenses(expensesData);
            } catch (error) {
                console.error("Error loading dashboard data", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    // --- Operational Metrics ---
    const activeClientsCount = leads.filter(l => l.pipelineStage === 'ACTIVE' || l.client).length;
    const newLeadsCount = leads.filter(l => l.pipelineStage === 'NEW').length;
    const activeProjects = projects.filter(p => p.overallProjectStatus !== 'COMPLETED' && p.overallProjectStatus !== 'CANCELLED');
    const upcomingProjects = [...activeProjects]
        .filter(p => p.projectDeadline)
        .sort((a, b) => new Date(a.projectDeadline!).getTime() - new Date(b.projectDeadline!).getTime())
        .slice(0, 5);

    // Sort pending tasks by closest date first
    const pendingTasks = tasks
        .filter(t => !t.completed)
        .sort((a, b) => new Date(a.taskDate || '2099-12-31').getTime() - new Date(b.taskDate || '2099-12-31').getTime());

    const completedTasksCount = tasks.filter(t => t.completed).length;

    // --- Financial Date Filtering Logic ---
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const isDateInPeriod = (dateString: string) => {
        if (analyticsPeriod === 'ALL') return true;

        const d = new Date(dateString);
        if (isNaN(d.getTime())) return true;

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

    const filteredInvoices = invoices.filter(i => isDateInPeriod(i.issueDate));
    const filteredExpenses = expenses.filter(e => isDateInPeriod(e.expenseDate));

    // --- Financial Metrics Calculations ---
    const estimatedRevenue = filteredInvoices.filter(i => i.status !== 'DRAFT').reduce((sum, i) => sum + i.amount, 0);
    const collectedRevenue = filteredInvoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = filteredExpenses.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0);
    const netProfit = collectedRevenue - totalExpenses;

    if (isLoading) {
        return (
            <div className="p-6 h-full flex items-center justify-center bg-gray-50">
                <div className="text-gray-400 font-medium animate-pulse">Loading Agency Overview...</div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col gap-6">

            <div className="flex justify-between items-end shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Agency Overview</h2>
                    <p className="text-sm text-gray-500 mt-1">Here is what's happening at Scalina today.</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>

            {/* FINANCIAL METRICS ROW */}
            <div className="flex flex-col gap-2 shrink-0">
                <div className="flex flex-wrap justify-between items-end gap-4 ml-1">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Financial Health</h3>

                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            className="border-gray-200 border p-1.5 rounded-lg text-xs font-bold outline-none focus:border-blue-400 text-gray-600 bg-white shadow-sm"
                            value={analyticsPeriod}
                            onChange={e => setAnalyticsPeriod(e.target.value as any)}
                        >
                            <option value="ALL">All Time</option>
                            <option value="THIS_MONTH">This Month</option>
                            <option value="THIS_YEAR">This Year</option>
                            <option value="CUSTOM">Custom Range...</option>
                        </select>

                        {analyticsPeriod === 'CUSTOM' && (
                            <div className="flex items-center gap-2 bg-white border border-gray-200 p-1 rounded-lg shadow-sm">
                                <input type="date" className="text-[10px] font-bold text-gray-600 outline-none bg-transparent" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                                <span className="text-gray-400 font-bold text-[9px] uppercase">to</span>
                                <input type="date" className="text-[10px] font-bold text-gray-600 outline-none bg-transparent" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col transition hover:shadow-md">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Estimated Revenue</span>
                        <span className="text-2xl font-black text-gray-800">${estimatedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="bg-green-50 p-5 rounded-xl shadow-sm border border-green-200 flex flex-col transition hover:shadow-md">
                        <span className="text-[11px] font-bold text-green-600 uppercase tracking-widest mb-1">Collected Revenue</span>
                        <span className="text-2xl font-black text-green-700">${collectedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="bg-gray-900 p-5 rounded-xl shadow-sm border border-gray-800 flex flex-col transition hover:shadow-md">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Net Profit</span>
                        <span className={`text-2xl font-black ${netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
                            ${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* OPERATIONAL METRICS ROW */}
            <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Operations</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col transition hover:shadow-md">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Active Clients</span>
                            <span className="bg-blue-50 text-blue-600 p-1.5 rounded-lg">👥</span>
                        </div>
                        <span className="text-3xl font-black text-gray-800">{activeClientsCount}</span>
                        <span className="text-xs font-medium text-green-500 mt-2">+ {newLeadsCount} new leads in pipeline</span>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col transition hover:shadow-md">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Active Projects</span>
                            <span className="bg-purple-50 text-purple-600 p-1.5 rounded-lg">🚀</span>
                        </div>
                        <span className="text-3xl font-black text-gray-800">{activeProjects.length}</span>
                        <span className="text-xs font-medium text-gray-500 mt-2">Across all clients</span>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col transition hover:shadow-md">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Pending Tasks</span>
                            <span className="bg-orange-50 text-orange-600 p-1.5 rounded-lg">✅</span>
                        </div>
                        <span className="text-3xl font-black text-gray-800">{pendingTasks.length}</span>
                        <span className="text-xs font-medium text-green-500 mt-2">{completedTasksCount} completed total</span>
                    </div>
                </div>
            </div>

            {/* LOWER CONTENT AREA */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 mt-2">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-gray-800">Upcoming Deadlines</h3>
                        <span className="text-xs font-bold text-gray-400 uppercase">Next 5</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {upcomingProjects.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">No active project deadlines.</div>
                        ) : (
                            <div className="space-y-2">
                                {upcomingProjects.map(project => (
                                    <div key={project.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg transition border border-transparent hover:border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                            <div>
                                                <p className="font-bold text-sm text-gray-800">{project.projectCode}</p>
                                                <p className="text-[11px] text-gray-500 font-medium">Status: {project.overallProjectStatus}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm text-gray-800">{project.projectDeadline}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-gray-800">Pending Tasks</h3>
                        <span className="text-xs font-bold text-gray-400 uppercase">Closest 5</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {pendingTasks.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">All caught up on tasks!</div>
                        ) : (
                            <div className="space-y-2">
                                {pendingTasks.slice(0, 5).map(task => (
                                    <div key={task.id} className="flex flex-col p-3 hover:bg-gray-50 rounded-lg transition border border-transparent hover:border-gray-100">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-blue-600">{task.project?.projectCode || 'General'}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${new Date(task.taskDate) < new Date() ? 'bg-red-100 text-red-600' : 'text-gray-400 bg-gray-100'}`}>{task.taskDate}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="font-bold text-sm text-gray-800">{task.taskType} {task.videoNumber ? `(Video ${task.videoNumber})` : ''}</p>
                                            </div>
                                            <div className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                                                👤 {task.assignee}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};