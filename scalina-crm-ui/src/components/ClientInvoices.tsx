import { useEffect, useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { InvoiceDocument } from './InvoicePDF';
import { type ClientLead, type Invoice, InvoiceStatus, type InvoiceItem, fetchClientInvoices, createInvoice, updateInvoiceStatus, fetchPipeline } from '../services/api';

export default function ClientInvoices({ clientId }: { clientId: string }) {
    const [client, setClient] = useState<ClientLead | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);

    // Invoice form states
    const [invoiceNo, setInvoiceNo] = useState('001');
    const [invoiceCost, setInvoiceCost] = useState('');
    const [lineItems, setLineItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, price: 0 }]);

    useEffect(() => {
        // Fetch the client data
        fetchPipeline().then(leads => {
            const foundClient = leads.find(l => l.id === clientId);
            if (foundClient) setClient(foundClient);
        });
        // Fetch the invoices
        fetchClientInvoices(clientId).then(setInvoices);
    }, [clientId]);

    if (!client) return <div className="p-8">Loading Invoices...</div>;

    const handleStatusChange = async (invoiceId: string, status: InvoiceStatus) => {
        const updated = await updateInvoiceStatus(invoiceId, status);
        setInvoices(invoices.map(i => i.id === invoiceId ? updated : i));
    };

    const handleSaveInvoice = async (status: InvoiceStatus) => {
        if (lineItems.length === 0) return;
        const newInvoice: Invoice = { invoiceNo, invoiceDate: new Date().toLocaleDateString('en-GB'), costOfDelivery: parseFloat(invoiceCost || '0'), status, items: lineItems };
        const saved = await createInvoice(client.id!, newInvoice);
        setInvoices([...invoices, saved]);
        setLineItems([{ description: '', quantity: 1, price: 0 }]);
        setInvoiceNo((parseInt(invoiceNo) + 1).toString().padStart(3, '0'));
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-2">Invoice Management</h2>
            <p className="text-gray-500 mb-8">{client.company} {client.clientIdCode ? `(${client.clientIdCode})` : ''}</p>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                {/* INVOICE FORM (Same as your old one) */}
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
                        <PDFDownloadLink document={<InvoiceDocument invoice={inv} client={client} />} fileName={`INV_${inv.invoiceNo}.pdf`} className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded text-xs font-bold cursor-pointer">
                            {({ loading }) => (loading ? '...' : 'PDF')}
                        </PDFDownloadLink>
                    </div>
                </div>
            ))}
        </div>
    );
}