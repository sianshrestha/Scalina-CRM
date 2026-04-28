package com.scalina.crm.service;

import com.scalina.crm.dto.DashboardMetricsDTO;
import com.scalina.crm.dto.FinancialMetrics;
import com.scalina.crm.model.*;
import com.scalina.crm.model.enums.PipelineStage;
import com.scalina.crm.repository.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class CrmService {

    private final ClientLeadRepository clientLeadRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final InvoiceRepository invoiceRepository;

    public CrmService(ClientLeadRepository clientLeadRepository, ProjectRepository projectRepository,
                      TaskRepository taskRepository, InvoiceRepository invoiceRepository) {
        this.clientLeadRepository = clientLeadRepository;
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.invoiceRepository = invoiceRepository;
    }

    // --- DASHBOARD ---
    public DashboardMetricsDTO getDashboardMetrics(String agencyId) {
        long activeClients = clientLeadRepository.countByAgencyIdAndPipelineStage(agencyId, PipelineStage.ACTIVE);
        long coldWarmLeads = clientLeadRepository.countByAgencyIdAndPipelineStageIn(
                agencyId, Arrays.asList(PipelineStage.NEW, PipelineStage.CONTACTED));
        long hotLeads = clientLeadRepository.countByAgencyIdAndPipelineStage(agencyId, PipelineStage.PROPOSAL_SENT);

        FinancialMetrics financials = invoiceRepository.getFinancialMetricsByAgency(agencyId);

        return new DashboardMetricsDTO(
                activeClients, coldWarmLeads, hotLeads,
                financials != null ? financials.getTotalRevenue() : null,
                financials != null ? financials.getEstimatedProfit() : null
        );
    }

    // --- PIPELINE (LEADS & CLIENTS) ---
    public List<ClientLead> getAllLeadsAndClients(String agencyId) {
        return clientLeadRepository.findByAgencyId(agencyId);
    }

    // 🔥 THIS IS THE FIXED METHOD 🔥
    public ClientLead saveClientLead(ClientLead clientLead, String agencyId) {
        // If it already has an ID, it's an update from the Kanban board!
        if (clientLead.getId() != null) {
            ClientLead existing = clientLeadRepository.findById(clientLead.getId())
                    .orElseThrow(() -> new RuntimeException("Lead not found"));

            // Safely update only the necessary fields
            existing.setName(clientLead.getName());
            existing.setCompany(clientLead.getCompany());
            existing.setEmail(clientLead.getEmail());
            existing.setPipelineStage(clientLead.getPipelineStage());
            existing.setClient(clientLead.isClient());

            return clientLeadRepository.save(existing);
        }

        // If it has no ID, it's a brand new lead
        clientLead.setAgencyId(agencyId);
        return clientLeadRepository.save(clientLead);
    }

    // --- PROJECTS & TASKS ---
    public List<Project> getClientProjects(UUID clientId, String agencyId) {
        return projectRepository.findByAgencyIdAndClientId(agencyId, clientId);
    }

    public Project createProject(UUID clientId, Project project, String agencyId) {
        ClientLead client = clientLeadRepository.findById(clientId).orElseThrow(() -> new RuntimeException("Client not found"));
        project.setClient(client);
        project.setAgencyId(agencyId);
        return projectRepository.save(project);
    }

    public Task createTask(UUID projectId, Task task, String agencyId) {
        Project project = projectRepository.findById(projectId).orElseThrow(() -> new RuntimeException("Project not found"));
        task.setProject(project);
        task.setAgencyId(agencyId);
        task.setCompleted(false);
        return taskRepository.save(task);
    }

    public Task markTaskCompleted(UUID taskId, String agencyId) {
        Task task = taskRepository.findById(taskId).orElseThrow(() -> new RuntimeException("Task not found"));
        if (!task.getAgencyId().equals(agencyId)) throw new RuntimeException("Unauthorized");
        task.setCompleted(true);
        return taskRepository.save(task);
    }

    // --- INVOICING ---
    public List<Invoice> getClientInvoices(UUID clientId, String agencyId) {
        return invoiceRepository.findByAgencyIdAndClientId(agencyId, clientId);
    }

    public Invoice createInvoice(UUID clientId, Invoice invoice, String agencyId) {
        ClientLead client = clientLeadRepository.findById(clientId).orElseThrow(() -> new RuntimeException("Client not found"));
        invoice.setClient(client);
        invoice.setAgencyId(agencyId);

        BigDecimal grandTotal = BigDecimal.ZERO;

        // Ensure all line items are linked properly and calculate the grand total
        if (invoice.getItems() != null) {
            for (InvoiceItem item : invoice.getItems()) {
                item.setAgencyId(agencyId); // Every entity needs the agencyId!
                item.setInvoice(invoice);

                // Calculate item total: price * quantity
                if (item.getPrice() != null) {
                    BigDecimal itemTotal = item.getPrice().multiply(new BigDecimal(item.getQuantity()));
                    item.setTotal(itemTotal);
                    grandTotal = grandTotal.add(itemTotal);
                }
            }
        }

        // Set the final calculated total to the invoice amount
        invoice.setAmount(grandTotal);

        return invoiceRepository.save(invoice);
    }
}