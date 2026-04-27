import { useEffect, useState } from 'react';
import { fetchDashboardMetrics, type DashboardMetrics } from '../services/api';

const Dashboard = () => {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

    useEffect(() => {
        fetchDashboardMetrics().then(setMetrics).catch(console.error);
    }, []);

    if (!metrics) return <div className="p-8 text-gray-500">Loading metrics...</div>;

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Executive Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <MetricCard title="Active Clients" value={metrics.activeClients} color="bg-green-100 text-green-800" />
                <MetricCard title="Hot Leads" value={metrics.hotLeads} color="bg-orange-100 text-orange-800" />
                <MetricCard title="Cold / Warm Leads" value={metrics.coldWarmLeads} color="bg-blue-100 text-blue-800" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetricCard title="Total Revenue" value={formatCurrency(metrics.totalRevenue)} color="bg-emerald-100 text-emerald-800" />
                <MetricCard title="Estimated Profit" value={formatCurrency(metrics.estimatedProfit)} color="bg-indigo-100 text-indigo-800" />
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, color }: { title: string, value: string | number, color: string }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
        <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">{title}</h3>
        <span className={`text-4xl font-extrabold px-4 py-2 rounded-lg ${color}`}>{value}</span>
    </div>
);

export default Dashboard;