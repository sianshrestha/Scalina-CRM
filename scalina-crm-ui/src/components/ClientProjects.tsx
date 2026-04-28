// src/components/ClientProjects.tsx
import { useEffect, useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { InvoiceDocument } from './InvoicePDF';
import {
    type ClientLead, type Project, type Invoice, InvoiceStatus, type InvoiceItem, type Task,
    fetchClientProjects, createProject, fetchClientInvoices, createInvoice,
    updateProject, fetchProjectTasks, createTask, updateTask, updateInvoiceStatus
} from '../services/api';

// --- NEW SUB-COMPONENT FOR TASKS ---
const ProjectCard = ({ project }: { project: Project }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [title, setTitle] = useState('');
    const [assignee, setAssignee] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [projectName, setProjectName] = useState(project.name);

    useEffect(() => { fetchProjectTasks(project.id!).then(setTasks); }, [project.id]);

    const handleAddTask = async () => {
        if (!title) return;
        const t = await createTask(project.id!, { title, assignee, completed: false });
        setTasks([...tasks, t]); setTitle(''); setAssignee('');
    };

    const handleToggleTask = async (task: Task) => {
        const updated = await updateTask(task.id!, { ...task, completed: !task.completed });
        setTasks(tasks.map(t => t.id === task.id ? updated : t));
    };

    const handleSaveProjectName = async () => {
        await updateProject(project.id!, { ...project, name: projectName });
        setIsEditingName(false);
    };

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                {isEditingName ? (
                    <div className="flex gap-2">
                        <input className="border p-1 rounded text-sm font-bold" value={projectName} onChange={e => setProjectName(e.target.value)} />
                        <button onClick={handleSaveProjectName} className="bg-green-600 text-white px-2 py-1 text-xs rounded">Save</button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{projectName}</span>
                        <button onClick={() => setIsEditingName(true)} className="text-gray-400 hover:text-indigo-600 text-xs">✎ Rename</button>
                    </div>
                )}
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">{project.status}</span>
            </div>

            <div className="mb-4">
                {tasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 mb-2 bg-gray-50 p-2 rounded">
                        <input type="checkbox" className="w-4 h-4 cursor-pointer" checked={t.completed} onChange={() => handleToggleTask(t)} />
                        <span className={`text-sm ${t.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{t.title}</span>
                        {t.assignee && <span className="ml-auto text-xs bg-indigo-100 text-indigo-800 px-2 rounded-full font-semibold">{t.assignee}</span>}
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <input placeholder="New Task..." className="border p-1 text-sm rounded flex-grow" value={title} onChange={e => setTitle(e.target.value)} />
                <input placeholder="Assign To" className="border p-1 text-sm rounded w-1/4" value={assignee} onChange={e => setAssignee(e.target.value)} />
                <button onClick={handleAddTask} className="bg-gray-800 text-white px-3 text-sm rounded hover:bg-gray-900 cursor-pointer">Add</button>
            </div>
        </div>
    );
};


export default function ClientProjects({ client, onBack }: { client: ClientLead, onBack: () => void }) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [newProjectName, setNewProjectName] = useState('');

    const [invoiceNo, setInvoiceNo] = useState('001');
    const [invoiceCost, setInvoiceCost] = useState('');
    const [lineItems, setLineItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, price: 0 }]);

    useEffect(() => {
        fetchClientProjects(client.id!).then(setProjects);
        fetchClientInvoices(client.id!).then(setInvoices);
    }, [client.id]);

    const handleAddProject = async () => {
        if (!newProjectName) return;
        const p = await createProject(client.id!, { name: newProjectName, status: 'ACTIVE' });
        setProjects([...projects, p]); setNewProjectName('');
    };

    const handleStatusChange = async (invoiceId: string, status: InvoiceStatus) => {
        const updated = await updateInvoiceStatus(invoiceId, status);
        setInvoices(invoices.map(i => i.id === invoiceId ? updated : i));
    };

    const handleSaveInvoice = async (status: InvoiceStatus) => {
        if (lineItems.length === 0) return;
        const newInvoice: Invoice = { invoiceNo, invoiceDate: new Date().toLocaleDateString('en-GB'), costOfDelivery: parseFloat(invoiceCost || '0'), status, items: lineItems };
        const saved = await createInvoice(client.id!, newInvoice);
        setInvoices([...invoices, saved]);
        setLineItems([{ description: '', quantity: 1, price: 0 }]); setInvoiceNo((parseInt(invoiceNo) + 1).toString().padStart(3, '0'));
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <button onClick={onBack} className="text-indigo-600 hover:underline font-medium mb-6 cursor-pointer">← Back to Pipeline</button>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8 flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">{client.company}</h2>
                    <p className="text-gray-500">{client.name} | {client.email} | {client.phone}</p>
                </div>
                {client.tags && <div className="flex gap-2">{client.tags.split(',').map(t => <span key={t} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-bold">{t}</span>)}</div>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-2xl font-bold mb-4">Projects & Tasks</h3>
                    <div className="flex gap-2 mb-6">
                        <input type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="New Project Name" className="border p-2 rounded-lg flex-grow shadow-sm" />
                        <button onClick={handleAddProject} className="bg-indigo-600 text-white px-6 rounded-lg cursor-pointer hover:bg-indigo-700 font-bold">Create</button>
                    </div>
                    {projects.map(p => <ProjectCard key={p.id} project={p} />)}
                </div>

                <div>
                    <h3 className="text-2xl font-bold mb-4">Financials</h3>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                        <div className="flex gap-4 mb-4">
                            <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="Inv No." className="border p-2 rounded w-1/3" />
                            <input type="number" value={invoiceCost} onChange={e => setInvoiceCost(e.target.value)} placeholder="Cost of Delivery ($)" className="border p-2 rounded w-2/3" />
                        </div>
                        {lineItems.map((item, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <input type="text" placeholder="Service" value={item.description} onChange={e => { const l = [...lineItems]; l[i].description = e.target.value; setLineItems(l); }} className="border p-2 rounded w-1/2 text-sm" />
                                <input type="number" placeholder="Qty" value={item.quantity} onChange={e => { const l = [...lineItems]; l[i].quantity = parseFloat(e.target.value); setLineItems(l); }} className="border p-2 rounded w-1/4 text-sm" />
                                <input type="number" placeholder="Price" value={item.price} onChange={e => { const l = [...lineItems]; l[i].price = parseFloat(e.target.value); setLineItems(l); }} className="border p-2 rounded w-1/4 text-sm" />
                            </div>
                        ))}
                        <button onClick={() => setLineItems([...lineItems, { description: '', quantity: 1, price: 0 }])} className="text-indigo-600 text-sm mb-4 font-bold cursor-pointer">+ Add Row</button>
                        <div className="flex gap-2">
                            <button onClick={() => handleSaveInvoice(InvoiceStatus.DRAFT)} className="bg-gray-200 px-4 py-2 rounded-lg flex-grow font-bold cursor-pointer hover:bg-gray-300">Save Draft</button>
                            <button onClick={() => handleSaveInvoice(InvoiceStatus.PAID)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex-grow font-bold cursor-pointer hover:bg-emerald-700">Mark Paid</button>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold mb-4">Invoice History</h3>
                    {invoices.map(inv => (
                        <div key={inv.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-2 flex justify-between items-center">
                            <div>
                                <span className="font-bold text-xl">${(inv.amount || 0).toFixed(2)}</span>
                                <span className="text-gray-500 text-sm ml-2">#{inv.invoiceNo}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* 🚀 NEW INTERACTIVE STATUS DROPDOWN */}
                                <select
                                    value={inv.status}
                                    onChange={(e) => handleStatusChange(inv.id!, e.target.value as InvoiceStatus)}
                                    className={`border rounded px-2 py-1 text-xs font-bold cursor-pointer outline-none ${
                                        inv.status === InvoiceStatus.PAID ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                            inv.status === InvoiceStatus.OVERDUE ? 'bg-red-100 text-red-800 border-red-200' :
                                                'bg-gray-100 text-gray-800 border-gray-200'
                                    }`}
                                >
                                    {Object.values(InvoiceStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>

                                <PDFDownloadLink document={<InvoiceDocument invoice={inv} client={client} />} fileName={`INV_${inv.invoiceNo}.pdf`} className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer">
                                    {({ loading }) => (loading ? '...' : 'PDF')}
                                </PDFDownloadLink>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}