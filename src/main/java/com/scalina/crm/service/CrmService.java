package com.scalina.crm.service;

import com.scalina.crm.dto.DashboardMetricsDTO;
import com.scalina.crm.model.*;
import com.scalina.crm.model.enums.InvoiceStatus;
import com.scalina.crm.model.enums.PipelineStage;
import com.scalina.crm.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
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

    public List<Project> getAllProjects() { return projectRepository.findAll(); }
    public List<Task> getAllTasks() { return taskRepository.findAll(); }

    // ADDED THIS SO THE CONTROLLER CAN DOWNLOAD RECEIPTS
    public Expense getExpenseById(Long id) {
        return expenseRepository.findById(id).orElseThrow(() -> new RuntimeException("Expense not found"));
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

    @Transactional
    public ClientLead saveClientLead(ClientLead clientLead) {
        // --- THE FIX: Convert empty strings to null to prevent Unique Constraint crashes ---
        if (clientLead.getClientCode() != null && clientLead.getClientCode().trim().isEmpty()) {
            clientLead.setClientCode(null);
        }

        if (clientLead.getId() != null) {
            ClientLead existing = clientLeadRepository.findById(clientLead.getId())
                    .orElseThrow(() -> new RuntimeException("Lead not found"));

            existing.setName(clientLead.getName());
            existing.setCompany(clientLead.getCompany());
            existing.setEmail(clientLead.getEmail());
            existing.setPhone(clientLead.getPhone());
            existing.setTags(clientLead.getTags());
            existing.setAddress(clientLead.getAddress());
            existing.setAbn(clientLead.getAbn());
            existing.setPipelineStage(clientLead.getPipelineStage());
            existing.setClient(clientLead.isClient());

            if (clientLead.getClientCode() != null) existing.setClientCode(clientLead.getClientCode());
            if (clientLead.getMarketer() != null) existing.setMarketer(clientLead.getMarketer());
            if (clientLead.getEstimatedWeeklyRevenue() != null) existing.setEstimatedWeeklyRevenue(clientLead.getEstimatedWeeklyRevenue());
            if (clientLead.getMarketersCut() != null) existing.setMarketersCut(clientLead.getMarketersCut());

            return clientLeadRepository.save(existing);
        }
        return clientLeadRepository.save(clientLead);
    }

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

    @Transactional
    public Invoice createInvoice(Long clientId, Invoice invoice) {
        ClientLead client = clientLeadRepository.findById(clientId).orElseThrow();

        // Auto-number logic
        long count = invoiceRepository.countByClientId(clientId);
        invoice.setInvoiceNo(String.format("%03d", count + 1));
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

        // FIX 3: Backend must respect GST and add it to the final total
        if (invoice.getHasGst() != null && invoice.getHasGst()) {
            BigDecimal gstAmount = grandTotal.multiply(new BigDecimal("0.10"));
            invoice.setGstAmount(gstAmount);
            grandTotal = grandTotal.add(gstAmount);
        } else {
            invoice.setGstAmount(BigDecimal.ZERO);
            invoice.setHasGst(false);
        }

        invoice.setAmount(grandTotal);
        return invoiceRepository.save(invoice);
    }

    @Transactional
    public List<Invoice> getAllInvoices() {
        List<Invoice> invoices = invoiceRepository.findAll();
        String today = LocalDate.now().toString(); // Gets today's date in "YYYY-MM-DD" format
        boolean requiresUpdate = false;

        for (Invoice invoice : invoices) {
            // FIX 1: ONLY apply overdue checks if the invoice has been SENT
            if (invoice.getStatus() == InvoiceStatus.SENT) {
                // If a due date exists, and today's date is strictly GREATER than the due date
                if (invoice.getDueDate() != null && !invoice.getDueDate().isEmpty()) {
                    if (invoice.getDueDate().compareTo(today) < 0) {
                        invoice.setStatus(InvoiceStatus.OVERDUE);
                        requiresUpdate = true;
                    }
                }
            }
        }

        // If we found and modified any overdue invoices, save the changes to the database
        if (requiresUpdate) {
            invoiceRepository.saveAll(invoices);
        }

        return invoices;
    }

    @Transactional
    public Invoice updateInvoice(Long id, Invoice details) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));

        invoice.setInvoiceDate(details.getInvoiceDate());
        invoice.setStatus(details.getStatus());

        // FIX 2: We must actually tell the database to update these fields!
        invoice.setDueDate(details.getDueDate());
        invoice.setWeeksCovered(details.getWeeksCovered());
        invoice.setHasGst(details.getHasGst());

        invoice.getItems().clear();

        BigDecimal grandTotal = BigDecimal.ZERO;

        if (details.getItems() != null) {
            for (InvoiceItem item : details.getItems()) {
                item.setInvoice(invoice);

                if (item.getPrice() != null) {
                    BigDecimal itemTotal = item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                    item.setTotal(itemTotal);
                    grandTotal = grandTotal.add(itemTotal);
                }

                invoice.getItems().add(item);
            }
        }

        // Re-apply GST on updates
        if (details.getHasGst() != null && details.getHasGst()) {
            BigDecimal gstAmount = grandTotal.multiply(new BigDecimal("0.10"));
            invoice.setGstAmount(gstAmount);
            grandTotal = grandTotal.add(gstAmount);
        } else {
            invoice.setGstAmount(BigDecimal.ZERO);
            invoice.setHasGst(false);
        }

        invoice.setAmount(grandTotal);
        return invoiceRepository.save(invoice);
    }



    public List<TeamMember> getTeamMembers() {
        return teamMemberRepository.findAll();
    }

    public TeamMember createTeamMember(TeamMember member) {
        if (member.getName() == null || member.getName().isBlank()) {
            String fullName = ((member.getFirstName() == null ? "" : member.getFirstName()) + " " +
                    (member.getLastName() == null ? "" : member.getLastName())).trim();
            member.setName(fullName);
        }
        return teamMemberRepository.save(member);
    }

    public TeamMember updateTeamMember(Long id, TeamMember details) {
        TeamMember member = teamMemberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team member not found"));

        member.setRole(details.getRole());
        member.setFirstName(details.getFirstName());
        member.setLastName(details.getLastName());
        member.setDob(details.getDob());
        member.setNationality(details.getNationality());
        member.setPersonalEmail(details.getPersonalEmail());
        member.setPhoneNumber(details.getPhoneNumber());
        member.setResidentialCountry(details.getResidentialCountry());
        member.setResidentialState(details.getResidentialState());
        member.setStreetAddress(details.getStreetAddress());
        member.setPostcode(details.getPostcode());
        member.setBankCountry(details.getBankCountry());
        member.setBankName(details.getBankName());
        member.setAccountName(details.getAccountName());
        member.setBsb(details.getBsb());
        member.setAccountNumber(details.getAccountNumber());
        member.setAccountPhoneNumber(details.getAccountPhoneNumber());
        member.setEmergencyContactName(details.getEmergencyContactName());
        member.setEmergencyContactNumber(details.getEmergencyContactNumber());

        String fullName = ((details.getFirstName() == null ? "" : details.getFirstName()) + " " +
                (details.getLastName() == null ? "" : details.getLastName())).trim();
        member.setName(fullName);

        return teamMemberRepository.save(member);
    }

    @Transactional
    public void deleteTeamMember(Long id) {
        TeamMember member = teamMemberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team member not found"));
        workAssignmentRepository.deleteByTeamMemberId(id);
        teamMemberRepository.delete(member);
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

    // --- EXPENSES & RECEIPTS ---
    public List<Expense> getExpenses() {
        return expenseRepository.findAll();
    }

    public Expense createExpense(Expense expense) {
        System.out.println("💾 Creating expense: title=" + expense.getTitle() + ", isPaid=" + expense.isPaid());

        // Force isPaid to false when creating new expense
        expense.setPaid(false);

        Expense saved = expenseRepository.save(expense);
        System.out.println("✅ Created expense: id=" + saved.getId() + ", isPaid=" + saved.isPaid());

        return saved;
    }


    public Expense updateExpense(Expense expense) {
        return expenseRepository.save(expense);
    }

    @Transactional
    public Expense uploadReceipt(Long expenseId, MultipartFile file) throws IOException {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found"));

        expense.setReceiptFileName(file.getOriginalFilename());
        expense.setReceiptFileType(file.getContentType());
        expense.setReceiptData(file.getBytes()); // Saves the image to Postgres

        return expenseRepository.save(expense);
    }

    @Transactional
    public Expense updateExpenseStatus(Long id, String status) {
        System.out.println("🔄 updateExpenseStatus called with id=" + id + ", status=" + status);

        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Expense not found"));

        System.out.println("📦 Found expense: id=" + expense.getId() + ", currentIsPaid=" + expense.isPaid());

        boolean shouldBePaid = "PAID".equalsIgnoreCase(status);
        expense.setPaid(shouldBePaid);

        System.out.println("✏️  Setting isPaid to: " + shouldBePaid);

        Expense saved = expenseRepository.save(expense);

        System.out.println("💾 Saved expense: id=" + saved.getId() + ", newIsPaid=" + saved.isPaid());

        return saved;
    }


    @Transactional
    public void deleteExpense(Long id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Expense not found"));
        expenseRepository.delete(expense);
    }

}