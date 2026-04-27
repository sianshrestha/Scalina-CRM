// src/components/ClientProjects.tsx
import { useEffect, useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { InvoiceDocument } from './InvoicePDF';
import {
    type ClientLead, type Project, type Invoice, InvoiceStatus, type InvoiceItem,
    fetchClientProjects, createProject, fetchClientInvoices, createInvoice
} from '../services/api';

export default function ClientProjects({ client, onBack }: { client: ClientLead, onBack: () => void }) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [newProjectName, setNewProjectName] = useState('');

    // Dynamic Invoice Form State
    const [invoiceNo, setInvoiceNo] = useState('001');
    const [invoiceCost, setInvoiceCost] = useState('');
    const [lineItems, setLineItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, price: 0 }]);

    const loadData = () => {
        fetchClientProjects(client.id!).then(setProjects);
        fetchClientInvoices(client.id!).then(setInvoices);
    };
    useEffect(() => { loadData(); }, [client.id]);

    const handleAddProject = async () => {
        if (!newProjectName) return;
        const p = await createProject(client.id!, { name: newProjectName, status: 'ACTIVE' });
        setProjects([...projects, p]);
        setNewProjectName('');
    };

    const updateLineItem = (index: number, field: keyof InvoiceItem, value: any) => {
        const updated = [...lineItems];
        updated[index] = { ...updated[index], [field]: value };
        setLineItems(updated);
    };

    const handleSaveInvoice = async (status: InvoiceStatus) => {
        if (lineItems.length === 0) return;

        const newInvoice: Invoice = {
            invoiceNo,
            invoiceDate: new Date().toLocaleDateString('en-GB'),
            costOfDelivery: parseFloat(invoiceCost || '0'),
            status,
            items: lineItems
        };

        const saved = await createInvoice(client.id!, newInvoice);
        setInvoices([...invoices, saved]);
        setLineItems([{ description: '', quantity: 1, price: 0 }]); // reset
        setInvoiceNo((parseInt(invoiceNo) + 1).toString().padStart(3, '0'));
    };

    const formatCurrency = (amount: number) => `$${(amount || 0).toFixed(2)}`;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <button onClick={onBack} className="text-indigo-600 hover:text-indigo-800 font-medium mb-6">← Back to Pipeline</button>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                <h2 className="text-3xl font-bold text-gray-800">{client.company}</h2>
                <p className="text-gray-500">{client.name} | {client.email}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* PROJECTS COLUMN */}
                <div>
                    <h3 className="text-xl font-bold mb-4">Projects</h3>
                    <div className="flex gap-2 mb-4">
                        <input type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Project Name" className="border p-2 rounded flex-grow" />
                        <button onClick={handleAddProject} className="bg-indigo-600 text-white px-4 rounded">Add</button>
                    </div>
                    {projects.map(p => (
                        <div key={p.id} className="bg-white p-4 rounded shadow-sm border mb-2 flex justify-between">
                            <span className="font-bold">{p.name}</span>
                            <span className="bg-green-100 text-green-800 px-2 rounded text-sm">{p.status}</span>
                        </div>
                    ))}
                </div>

                {/* INVOICES COLUMN */}
                <div>
                    <h3 className="text-xl font-bold mb-4">Create Invoice</h3>
                    <div className="bg-white p-4 rounded shadow-sm border mb-6">
                        <div className="flex gap-4 mb-4">
                            <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="Inv No." className="border p-2 rounded w-1/3" />
                            <input type="number" value={invoiceCost} onChange={e => setInvoiceCost(e.target.value)} placeholder="Cost of Delivery ($)" className="border p-2 rounded w-2/3" />
                        </div>

                        <label className="text-sm font-bold text-gray-500 uppercase mb-2 block">Line Items</label>
                        {lineItems.map((item, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <input type="text" placeholder="Description" value={item.description} onChange={e => updateLineItem(i, 'description', e.target.value)} className="border p-2 rounded w-1/2" />
                                <input type="number" placeholder="Qty" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', parseFloat(e.target.value))} className="border p-2 rounded w-1/4" />
                                <input type="number" placeholder="Price" value={item.price} onChange={e => updateLineItem(i, 'price', parseFloat(e.target.value))} className="border p-2 rounded w-1/4" />
                            </div>
                        ))}

                        <button onClick={() => setLineItems([...lineItems, { description: '', quantity: 1, price: 0 }])} className="text-indigo-600 text-sm mb-4">+ Add Item</button>

                        <div className="flex gap-2">
                            <button onClick={() => handleSaveInvoice(InvoiceStatus.DRAFT)} className="bg-gray-200 px-4 py-2 rounded flex-grow">Save Draft</button>
                            <button onClick={() => handleSaveInvoice(InvoiceStatus.PAID)} className="bg-emerald-600 text-white px-4 py-2 rounded flex-grow">Mark Paid</button>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold mb-4">Invoice History</h3>
                    {invoices.map(inv => (
                        <div key={inv.id} className="bg-white p-4 rounded shadow-sm border mb-2 flex justify-between items-center">
                            <div>
                                <span className="font-bold text-lg">{formatCurrency(inv.amount || 0)}</span>
                                <span className="text-gray-500 text-sm ml-2">#{inv.invoiceNo}</span>
                            </div>
                            <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-bold ${inv.status === InvoiceStatus.PAID ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200'}`}>
                  {inv.status}
                </span>
                                <PDFDownloadLink document={<InvoiceDocument invoice={inv} client={client} />} fileName={`INV_${inv.invoiceNo}.pdf`} className="bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded text-xs hover:bg-red-100 transition-colors">
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