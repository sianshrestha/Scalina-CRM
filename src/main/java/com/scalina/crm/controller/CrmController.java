package com.scalina.crm.controller;

import com.scalina.crm.dto.DashboardMetricsDTO;
import com.scalina.crm.model.*;
import com.scalina.crm.service.CrmService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/crm")
@CrossOrigin(origins = "*") // Allows your React frontend to connect
public class CrmController {

    private final CrmService crmService;

    // MVP Hardcoded Agency ID (For future SaaS, this comes from a login token)
    private final String LOCAL_AGENCY_ID = "local-mvp-agency-001";

    public CrmController(CrmService crmService) {
        this.crmService = crmService;
    }

    // --- DASHBOARD API ---
    @GetMapping("/dashboard")
    public ResponseEntity<DashboardMetricsDTO> getDashboard() {
        return ResponseEntity.ok(crmService.getDashboardMetrics(LOCAL_AGENCY_ID));
    }

    // --- PIPELINE API ---
    @GetMapping("/pipeline")
    public ResponseEntity<List<ClientLead>> getPipeline() {
        return ResponseEntity.ok(crmService.getAllLeadsAndClients(LOCAL_AGENCY_ID));
    }

    @PostMapping("/pipeline")
    public ResponseEntity<ClientLead> saveClientLead(@RequestBody ClientLead clientLead) {
        return ResponseEntity.ok(crmService.saveClientLead(clientLead, LOCAL_AGENCY_ID));
    }

    // --- PROJECTS & TASKS API ---
    @GetMapping("/clients/{clientId}/projects")
    public ResponseEntity<List<Project>> getClientProjects(@PathVariable UUID clientId) {
        return ResponseEntity.ok(crmService.getClientProjects(clientId, LOCAL_AGENCY_ID));
    }

    @PostMapping("/clients/{clientId}/projects")
    public ResponseEntity<Project> createProject(@PathVariable UUID clientId, @RequestBody Project project) {
        return ResponseEntity.ok(crmService.createProject(clientId, project, LOCAL_AGENCY_ID));
    }

    @PostMapping("/projects/{projectId}/tasks")
    public ResponseEntity<Task> createTask(@PathVariable UUID projectId, @RequestBody Task task) {
        return ResponseEntity.ok(crmService.createTask(projectId, task, LOCAL_AGENCY_ID));
    }

    @PatchMapping("/tasks/{taskId}/complete")
    public ResponseEntity<Task> completeTask(@PathVariable UUID taskId) {
        return ResponseEntity.ok(crmService.markTaskCompleted(taskId, LOCAL_AGENCY_ID));
    }

    // --- INVOICES API ---
    @GetMapping("/clients/{clientId}/invoices")
    public ResponseEntity<List<Invoice>> getClientInvoices(@PathVariable UUID clientId) {
        return ResponseEntity.ok(crmService.getClientInvoices(clientId, LOCAL_AGENCY_ID));
    }

    @PostMapping("/clients/{clientId}/invoices")
    public ResponseEntity<Invoice> createInvoice(@PathVariable UUID clientId, @RequestBody Invoice invoice) {
        return ResponseEntity.ok(crmService.createInvoice(clientId, invoice, LOCAL_AGENCY_ID));
    }
}
