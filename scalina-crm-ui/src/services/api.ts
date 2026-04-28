
const API_BASE_URL = 'http://localhost:8080/api/v1/crm';

// --- TYPES ---
export interface DashboardMetrics {
    activeClients: number;
    coldWarmLeads: number;
    hotLeads: number;
    totalRevenue: number;
    estimatedProfit: number;
}

// @ts-ignore
export enum PipelineStage { NEW = 'NEW', CONTACTED = 'CONTACTED', PROPOSAL_SENT = 'PROPOSAL_SENT', ACTIVE = 'ACTIVE' }
// @ts-ignore
export enum InvoiceStatus { DRAFT = 'DRAFT', DUE = 'DUE', PAID = 'PAID', OVERDUE = 'OVERDUE' }

export interface ClientLead {
    id?: string;
    name: string;
    company: string;
    email: string;
    phone?: string;  // NEW
    tags?: string;
    address?: string;
    abn?: string;
    pipelineStage: PipelineStage;
    client: boolean;
}

export interface Project { id?: string; name: string; status: string; }
export interface Task { id?: string; title: string; assignee?: string; completed: boolean; }
export interface InvoiceItem {
    id?: string;
    description: string;
    quantity: number;
    price: number;
    total?: number;
}

export interface Invoice {
    id?: string;
    invoiceNo: string;
    invoiceDate: string;
    amount?: number;
    costOfDelivery: number;
    status: InvoiceStatus;
    items: InvoiceItem[];
}

// --- API CALLS ---
export const fetchDashboardMetrics = async (): Promise<DashboardMetrics> => {
    const res = await fetch(`${API_BASE_URL}/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch dashboard');
    return res.json();
};

export const fetchPipeline = async (): Promise<ClientLead[]> => {
    const res = await fetch(`${API_BASE_URL}/pipeline`);
    if (!res.ok) throw new Error('Failed to fetch pipeline');
    return res.json();
};

export const saveClientLead = async (lead: ClientLead): Promise<ClientLead> => {
    const res = await fetch(`${API_BASE_URL}/pipeline`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead),
    });
    if (!res.ok) throw new Error('Failed to save lead');
    return res.json();
};

export const fetchClientProjects = async (clientId: string): Promise<Project[]> => {
    const res = await fetch(`${API_BASE_URL}/clients/${clientId}/projects`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
};

export const createProject = async (clientId: string, project: Project): Promise<Project> => {
    const res = await fetch(`${API_BASE_URL}/clients/${clientId}/projects`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project),
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
};

export const fetchClientInvoices = async (clientId: string): Promise<Invoice[]> => {
    const res = await fetch(`${API_BASE_URL}/clients/${clientId}/invoices`);
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return res.json();
};

export const createInvoice = async (clientId: string, invoice: Invoice): Promise<Invoice> => {
    const res = await fetch(`${API_BASE_URL}/clients/${clientId}/invoices`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(invoice),
    });
    if (!res.ok) throw new Error('Failed to create invoice');
    return res.json();
};


// Add these to the VERY BOTTOM of api.ts
export const updateProject = async (projectId: string, project: Project): Promise<Project> => {
    const res = await fetch(`${API_BASE_URL}/projects/${projectId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project) });
    if (!res.ok) throw new Error('Failed to update project'); return res.json();
};
export const fetchProjectTasks = async (projectId: string): Promise<Task[]> => {
    const res = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks`);
    if (!res.ok) throw new Error('Failed to fetch tasks'); return res.json();
};
export const createTask = async (projectId: string, task: Task): Promise<Task> => {
    const res = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) });
    if (!res.ok) throw new Error('Failed to create task'); return res.json();
};
export const updateTask = async (taskId: string, task: Task): Promise<Task> => {
    const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) });
    if (!res.ok) throw new Error('Failed to update task'); return res.json();
};
export const updateInvoiceStatus = async (invoiceId: string, status: InvoiceStatus): Promise<Invoice> => {
    const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/status?status=${status}`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Failed to update status'); return res.json();
};