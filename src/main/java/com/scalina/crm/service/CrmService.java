package com.scalina.crm.service;

import com.scalina.crm.dto.DashboardMetricsDTO;
import com.scalina.crm.model.*;
import com.scalina.crm.model.enums.InvoiceStatus;
import com.scalina.crm.model.enums.PipelineStage;
import com.scalina.crm.repository.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

@Service
public class CrmService {

    private final ClientLeadRepository clientLeadRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final InvoiceRepository invoiceRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final WorkAssignmentRepository workAssignmentRepository;
    private final ExpenseRepository expenseRepository;

    public CrmService(ClientLeadRepository clientLeadRepository, ProjectRepository projectRepository,
                      TaskRepository taskRepository, InvoiceRepository invoiceRepository,
                      TeamMemberRepository teamMemberRepository, WorkAssignmentRepository workAssignmentRepository,
                      ExpenseRepository expenseRepository) {
        this.clientLeadRepository = clientLeadRepository;
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.invoiceRepository = invoiceRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.workAssignmentRepository = workAssignmentRepository;
        this.expenseRepository = expenseRepository;
    }

    // --- DASHBOARD ---
    public DashboardMetricsDTO getDashboardMetrics() {
        long activeClients = clientLeadRepository.countByPipelineStage(PipelineStage.ACTIVE);
        long coldWarmLeads = clientLeadRepository.countByPipelineStageIn(
                Arrays.asList(PipelineStage.NEW, PipelineStage.CONTACTED));
        long hotLeads = clientLeadRepository.countByPipelineStage(PipelineStage.PROPOSAL_SENT);

        BigDecimal collectedRevenue = invoiceRepository.getCollectedRevenue();
        BigDecimal estimatedRevenue = invoiceRepository.getEstimatedRevenue();

        BigDecimal totalVariableCosts = workAssignmentRepository.getTotalVariableCosts();
        BigDecimal totalFixedExpenses = expenseRepository.getTotalExpenses();
        BigDecimal totalCosts = totalVariableCosts.add(totalFixedExpenses);

        BigDecimal estimatedProfit = collectedRevenue.subtract(totalCosts);

        return new DashboardMetricsDTO(
                activeClients, coldWarmLeads, hotLeads,
                collectedRevenue,
                estimatedRevenue,
                estimatedProfit
        );
    }

    // --- PIPELINE (LEADS & CLIENTS) ---
    public List<ClientLead> getAllLeadsAndClients() {
        return clientLeadRepository.findAll();
    }

    public ClientLead saveClientLead(ClientLead clientLead) {
        if (clientLead.getId() != null) {
            ClientLead existing = clientLeadRepository.findById(clientLead.getId())
                    .orElseThrow(() -> new RuntimeException("Lead not found"));

            if (clientLead.getName() != null) existing.setName(clientLead.getName());
            if (clientLead.getCompany() != null) existing.setCompany(clientLead.getCompany());
            if (clientLead.getEmail() != null) existing.setEmail(clientLead.getEmail());
            if (clientLead.getAddress() != null) existing.setAddress(clientLead.getAddress());
            if (clientLead.getAbn() != null) existing.setAbn(clientLead.getAbn());
            if (clientLead.getPhone() != null) existing.setPhone(clientLead.getPhone());
            if (clientLead.getTags() != null) existing.setTags(clientLead.getTags());
            if (clientLead.getClientCode() != null) existing.setClientCode(clientLead.getClientCode());
            if (clientLead.getPipelineStage() != null) existing.setPipelineStage(clientLead.getPipelineStage());
            existing.setClient(clientLead.isClient());

            return clientLeadRepository.save(existing);
        }

        return clientLeadRepository.save(clientLead);
    }

    // --- PROJECTS & TASKS (READ-ONLY) ---
    public List<Project> getClientProjects(Long clientId) {
        return projectRepository.findByClientId(clientId);
    }

    public List<Task> getProjectTasks(Long projectId) {
        return taskRepository.findByProjectId(projectId);
    }

    // --- INVOICING ---
    public List<Invoice> getClientInvoices(Long clientId) {
        return invoiceRepository.findByClientId(clientId);
    }

    public Invoice updateInvoiceStatus(Long invoiceId, InvoiceStatus status) {
        Invoice invoice = invoiceRepository.findById(invoiceId).orElseThrow(() -> new RuntimeException("Invoice not found"));
        invoice.setStatus(status);
        return invoiceRepository.save(invoice);
    }

    public Invoice createInvoice(Long clientId, Invoice invoice) {
        ClientLead client = clientLeadRepository.findById(clientId).orElseThrow(() -> new RuntimeException("Client not found"));
        invoice.setClient(client);

        BigDecimal grandTotal = BigDecimal.ZERO;

        if (invoice.getItems() != null) {
            for (InvoiceItem item : invoice.getItems()) {
                item.setInvoice(invoice);

                if (item.getPrice() != null) {
                    BigDecimal itemTotal = item.getPrice().multiply(new BigDecimal(item.getQuantity()));
                    item.setTotal(itemTotal);
                    grandTotal = grandTotal.add(itemTotal);
                }
            }
        }

        invoice.setAmount(grandTotal);
        return invoiceRepository.save(invoice);
    }

    // --- RESOURCE MANAGEMENT (TEAM & CALENDAR) ---
    public List<TeamMember> getTeamMembers() {
        return teamMemberRepository.findAll();
    }

    public TeamMember createTeamMember(TeamMember member) {
        return teamMemberRepository.save(member);
    }

    public List<WorkAssignment> getWorkAssignments() {
        return workAssignmentRepository.findAll();
    }

    public WorkAssignment createWorkAssignment(WorkAssignment assignment, Long teamMemberId, Long clientId) {
        TeamMember member = teamMemberRepository.findById(teamMemberId)
                .orElseThrow(() -> new RuntimeException("Team member not found"));
        ClientLead client = clientLeadRepository.findById(clientId)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        assignment.setTeamMember(member);
        assignment.setClient(client);

        return workAssignmentRepository.save(assignment);
    }

    // --- EXPENSES ---
    public List<Expense> getExpenses() {
        return expenseRepository.findAll();
    }

    public Expense createExpense(Expense expense) {
        return expenseRepository.save(expense);
    }
}