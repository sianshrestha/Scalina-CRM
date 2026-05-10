import { useEffect, useState } from 'react';
import { type Expense, fetchExpenses, createExpense } from '../services/api';

export default function Expenses() {
    const [expenses, setExpenses] = useState<Expense[]>([]);

    // Form state
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('SUBSCRIPTION');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

    const loadExpenses = () => fetchExpenses().then(setExpenses).catch(console.error);

    useEffect(() => {
        loadExpenses();
    }, []);

    const handleSaveExpense = async () => {
        if (!title || !amount || !expenseDate) return alert("Please fill all fields");
        try {
            const saved = await createExpense({
                title,
                amount: parseFloat(amount),
                category,
                expenseDate
            });
            setExpenses([...expenses, saved]);
            setTitle('');
            setAmount('');
        } catch (error) {
            console.error("Error saving expense:", error);
        }
    };

    // Calculate total fixed expenses
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Fixed Expenses & Costs</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* ADD EXPENSE FORM */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 col-span-1 h-fit">
                    <h3 className="text-xl font-bold mb-4">Log New Expense</h3>
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                            <input type="date" className="border p-2 rounded w-full" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                            <input className="border p-2 rounded w-full" placeholder="e.g. Adobe Suite, Dev Salary" value={title} onChange={e => setTitle(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Amount ($)</label>
                            <input type="number" className="border p-2 rounded w-full" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                            <select className="border p-2 rounded w-full bg-gray-50" value={category} onChange={e => setCategory(e.target.value)}>
                                <option value="SUBSCRIPTION">Software Subscription</option>
                                <option value="SALARY">Salary / Retainer</option>
                                <option value="EQUIPMENT">Equipment</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <button onClick={handleSaveExpense} className="w-full bg-red-600 text-white font-bold py-3 rounded hover:bg-red-700 mt-2 shadow-sm">
                            + Add Expense
                        </button>
                    </div>
                </div>

                {/* EXPENSES LIST */}
                <div className="col-span-2">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-600">Total Fixed Expenses Logged</span>
                        <span className="text-3xl font-extrabold text-red-600">${totalExpenses.toFixed(2)}</span>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 border-b">
                            <tr>
                                <th className="p-4">Date</th>
                                <th className="p-4">Title</th>
                                <th className="p-4">Category</th>
                                <th className="p-4 text-right">Amount</th>
                            </tr>
                            </thead>
                            <tbody>
                            {expenses.sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()).map(exp => (
                                <tr key={exp.id} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="p-4 text-gray-500">{new Date(exp.expenseDate).toLocaleDateString('en-GB')}</td>
                                    <td className="p-4 font-bold text-gray-800">{exp.title}</td>
                                    <td className="p-4">
                                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-semibold">
                                                {exp.category}
                                            </span>
                                    </td>
                                    <td className="p-4 text-right font-bold text-red-600">
                                        ${(exp.amount || 0).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            {expenses.length === 0 && (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-500 italic">No expenses logged yet.</td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}