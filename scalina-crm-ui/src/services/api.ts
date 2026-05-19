// src/services/api.ts
const API_BASE_URL = 'http://localhost:8080/api/crm';

// @ts-ignore
export enum PipelineStage { NEW = 'NEW', CONTACTED = 'CONTACTED', PROPOSAL_SENT = 'PROPOSAL_SENT', ACTIVE = 'ACTIVE' , INACTIVE = 'INACTIVE' }
// @ts-ignore
export enum InvoiceStatus { DRAFT = 'DRAFT', DUE = 'DUE', PAID = 'PAID', OVERDUE = 'OVERDUE' }
// @ts-ignore
export enum TaskType { SCRIPT = 'SCRIPT', SHOOT = 'SHOOT', EDIT = 'EDIT' }

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

export interface DashboardMetrics {
    totalLeads?: number;
    activeClients?: number;
    activeProjects?: number;
    pendingTasks?: number;
    completedTasks?: number;
    totalRevenue?: number;
    [key: string]: any;
}

// --- ACTUAL API CALLS ---
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

export const fetchDashboardMetrics = () => fetcher('/dashboard');
export const fetchPipeline = () => fetcher('/pipeline');
export const saveClientLead = (lead: ClientLead) => fetcher('/pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) });

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
export const fetchTeamMembers = () => fetcher('/team');
export const updateTeamMember = (id: number, member: TeamMember) => fetcher(`/team/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(member) });


// ==========================================
// TEMPORARY IN-MEMORY MOCK APIS
// (Replace these with standard fetcher calls once Spring Boot is ready)
// ==========================================

export interface InvoiceItem {
    description: string;
    quantity: number;
    price: number;
}

export interface Invoice {
    id?: number;
    invoiceNumber: string;
    clientId: number;
    clientName?: string;
    projectId?: number;
    projectCode?: string;
    amount: number;
    issueDate: string;
    dueDate: string;
    status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';
    items?: InvoiceItem[]; // Added for line items
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
    receiptUrl?: string;
}

// In-Memory Databases
let mockInvoices: Invoice[] = [];
let mockExpenses: Expense[] = [];
let invoiceIdCounter = 1;
let expenseIdCounter = 1;

// Invoice Mocks
export const fetchInvoices = async (): Promise<Invoice[]> => {
    return [...mockInvoices];
};
export const createInvoice = async (invoice: Partial<Invoice>) => {
    const newInvoice = { ...invoice, id: invoiceIdCounter++ } as Invoice;
    mockInvoices.push(newInvoice);
    return newInvoice;
};
export const updateInvoiceStatus = async (id: number, status: string) => {
    const inv = mockInvoices.find(i => i.id === id);
    if (inv) inv.status = status as 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';
};

// Expense Mocks
export const fetchExpenses = async (): Promise<Expense[]> => {
    return [...mockExpenses];
};
export const createExpense = async (expense: Partial<Expense>) => {
    const newExp = { ...expense, id: expenseIdCounter++ } as Expense;
    mockExpenses.push(newExp);
    return newExp;
};
export const updateExpenseStatus = async (id: number, status: string) => {
    const exp = mockExpenses.find(e => e.id === id);
    if (exp) exp.isPaid = (status === 'PAID');
};
export const updateExpense = async (id: number, expense: Partial<Expense>) => {
    const expIndex = mockExpenses.findIndex(e => e.id === id);
    if (expIndex > -1) mockExpenses[expIndex] = { ...mockExpenses[expIndex], ...expense };
};

export const updateInvoice = async (id: number, invoice: Partial<Invoice>) => {
    const invIndex = mockInvoices.findIndex(i => i.id === id);
    if (invIndex > -1) mockInvoices[invIndex] = { ...mockInvoices[invIndex], ...invoice };
};

export const createTeamMember = (member: TeamMember) => fetcher('/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(member) });
export const deleteTeamMember = (id: number) => fetcher(`/team/${id}`, { method: 'DELETE' });

export const deleteTask = (id: number) => fetcher(`/tasks/${id}`, { method: 'DELETE' });
export const deleteExpense = async (id: number) => {
    mockExpenses = mockExpenses.filter(exp => exp.id !== id);
};
