const API_BASE_URL = 'http://localhost:8080/api/crm';

// --- ENUMS ---
// --- ENUMS (Converted for erasableSyntaxOnly compatibility) ---
export const PipelineStage = {
    NEW: 'NEW',
    CONTACTED: 'CONTACTED',
    PROPOSAL_SENT: 'PROPOSAL_SENT',
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE'
} as const;

export type PipelineStage = typeof PipelineStage[keyof typeof PipelineStage];

export const InvoiceStatus = {
    DRAFT: 'DRAFT',
    SENT: 'SENT',
    PAID: 'PAID',
    OVERDUE: 'OVERDUE'
} as const;

export type InvoiceStatus = typeof InvoiceStatus[keyof typeof InvoiceStatus];

export const TaskType = {
    SCRIPT: 'SCRIPT',
    SHOOT: 'SHOOT',
    EDIT: 'EDIT'
} as const;

export type TaskType = typeof TaskType[keyof typeof TaskType];

// --- INTERFACES ---
export interface ClientLead {
    id?: number;
    clientCode?: string;
    name: string;
    company: string;
    email: string;
    phone?: string;
    tags?: string;
    address?: string;
    abn?: string;
    pipelineStage: PipelineStage;
    client: boolean;
    marketer?: TeamMember;
    estimatedWeeklyRevenue?: number;
    marketersCut?: number;
}

export interface Project {
    id?: number;
    projectCode: string;
    weekCode: string;
    numberOfVideos: number;
    scriptStatus: string;
    shootStatus: string;
    overallEditStatus: string;
    overallProjectStatus: string;
    projectDeadline?: string;
    client?: ClientLead;
}

export interface Task {
    id?: number;
    title: string;
    taskType: TaskType;
    assignee: string;
    videoNumber?: number;
    taskDate: string;
    completed: boolean;
    project?: Project;
}

export interface TeamMember {
    id?: number;
    name?: string;
    role: string;
    firstName?: string;
    lastName?: string;
    dob?: string;
    nationality?: string;
    personalEmail?: string;
    phoneNumber?: string;
    residentialCountry?: string;
    residentialState?: string;
    streetAddress?: string;
    postcode?: string;
    bankCountry?: string;
    bankName?: string;
    accountName?: string;
    bsb?: string;
    accountNumber?: string;
    accountPhoneNumber?: string;
    emergencyContactName?: string;
    emergencyContactNumber?: string;
}

export interface InvoiceItem {
    description: string;
    quantity: number;
    price: number;
    total?: number;
}

export interface Invoice {
    id?: number;
    invoiceNo?: string;        // Database uses invoice_no
    clientId?: number;
    client?: ClientLead;       // Backend returns the full client object here!
    amount: number;
    invoiceDate: string;
    dueDate?: string;
    hasGst?: boolean;
    weeksCovered?: number;
    gstAmount?: number;
    status: string;
    items?: InvoiceItem[];
}

export interface Expense {
    id?: number;
    title: string;
    type: string;
    payee?: string;
    amount: number;
    expenseDate: string;
    isPaid: boolean;
    isRecurring?: boolean;
    reference?: string;
    receiptFileName?: string;
    frequency?: string;
}

// --- ACTUAL API CALLS (Connected to Spring Boot/Postgres) ---
const fetcher = async (url: string, options?: RequestInit) => {
    const res = await fetch(`${API_BASE_URL}${url}`, options);
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `API Error: ${res.status} ${res.statusText}`);
    }
    if (res.status === 204) return null;

    const text = await res.text();
    return text ? JSON.parse(text) : null;
};

// Dashboard
export const fetchDashboardMetrics = () => fetcher('/dashboard');

// Pipeline
export const fetchPipeline = () => fetcher('/pipeline');
export const saveClientLead = (lead: ClientLead) => fetcher('/pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) });

// Projects & Tasks
export const fetchClientProjects = (clientId: number) => fetcher(`/clients/${clientId}/projects`);
export const fetchAllProjects = () => fetcher('/projects');
export const createProject = (projectReq: any) => fetcher('/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(projectReq) });
export const updateProject = (projectId: number, projectReq: any) => fetcher(`/projects/${projectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(projectReq) });
export const cancelProject = (projectId: number) => fetcher(`/projects/${projectId}/cancel`, { method: 'PUT' });

export const fetchAllTasks = () => fetcher('/tasks');
export const fetchProjectTasks = (projectId: number) => fetcher(`/projects/${projectId}/tasks`);
export const assignTask = (projectId: number, task: Task) => fetcher(`/projects/${projectId}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) });
export const markTaskAsDone = (taskId: number) => fetcher(`/tasks/${taskId}/done`, { method: 'PUT' });
export const updateTaskDate = (taskId: number, newDate: string) => fetcher(`/tasks/${taskId}/date?newDate=${newDate}`, { method: 'PATCH' });
export const deleteTask = (id: number) => fetcher(`/tasks/${id}`, { method: 'DELETE' });

// Team
export const fetchTeamMembers = () => fetcher('/team');
export const createTeamMember = (member: TeamMember) => fetcher('/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(member) });
export const updateTeamMember = (id: number, member: TeamMember) => fetcher(`/team/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(member) });
export const deleteTeamMember = (id: number) => fetcher(`/team/${id}`, { method: 'DELETE' });

// Invoices (Real Endpoints)
export const fetchInvoices = () => fetcher('/invoices'); // Ensure you add this to CrmController in Java!
export const createInvoice = (clientId: number, invoice: Partial<Invoice>) => fetcher(`/clients/${clientId}/invoices`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(invoice) });
export const updateInvoice = (id: number, invoice: Partial<Invoice>) => fetcher(`/invoices/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(invoice) });
export const updateInvoiceStatus = (id: number, status: string) => fetcher(`/invoices/${id}/status?status=${status}`, { method: 'PATCH' });

// Expenses & Receipts (Real Endpoints)
export const fetchExpenses = () => fetcher('/expenses');
export const createExpense = (expense: Partial<Expense>) => fetcher('/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(expense) });
export const updateExpense = (id: number, expense: Partial<Expense>) => fetcher(`/expenses/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(expense) });
export const updateExpenseStatus = (id: number, status: string) => fetcher(`/expenses/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
export const deleteExpense = (id: number) => fetcher(`/expenses/${id}`, { method: 'DELETE' });

export const uploadExpenseReceipt = async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/expenses/${id}/receipt`, {
        method: 'POST',
        body: formData // No Content-Type header needed for FormData
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
};