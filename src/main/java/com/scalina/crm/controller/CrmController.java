package com.scalina.crm.controller;

import com.scalina.crm.dto.DashboardMetricsDTO;
import com.scalina.crm.dto.ProjectCreationRequest;
import com.scalina.crm.model.*;
import com.scalina.crm.model.enums.InvoiceStatus;
import com.scalina.crm.service.CrmService;
import com.scalina.crm.service.ProjectService;
import com.scalina.crm.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/crm")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Allows your React frontend to connect
public class CrmController {

    private final CrmService crmService;
    private final ProjectService projectService;
    private final TaskService taskService;

    // --- DASHBOARD API ---
    @GetMapping("/dashboard")
    public ResponseEntity<DashboardMetricsDTO> getDashboard() {
        return ResponseEntity.ok(crmService.getDashboardMetrics());
    }

    // --- PIPELINE API ---
    @GetMapping("/pipeline")
    public ResponseEntity<List<ClientLead>> getPipeline() {
        return ResponseEntity.ok(crmService.getAllLeadsAndClients());
    }

    @PostMapping("/pipeline")
    public ResponseEntity<ClientLead> saveClientLead(@RequestBody ClientLead clientLead) {
        return ResponseEntity.ok(crmService.saveClientLead(clientLead));
    }

    // --- PROJECTS & TASKS API (ERP INTEGRATED) ---

    @PostMapping("/projects")
    public ResponseEntity<Project> createProject(@RequestBody ProjectCreationRequest request) {
        Project createdProject = projectService.createWeeklyProject(
                request.getClientId(),
                request.getWeekCode(),
                request.getNumberOfVideos(),
                request.getDeadline()
        );
        return ResponseEntity.ok(createdProject);
    }

    @GetMapping("/clients/{clientId}/projects")
    public ResponseEntity<List<Project>> getClientProjects(@PathVariable Long clientId) {
        return ResponseEntity.ok(crmService.getClientProjects(clientId));
    }

    @PutMapping("/projects/{projectId}/cancel")
    public ResponseEntity<Project> cancelProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(projectService.cancelProject(projectId));
    }

    @GetMapping("/projects/{projectId}/tasks")
    public ResponseEntity<List<Task>> getProjectTasks(@PathVariable Long projectId) {
        return ResponseEntity.ok(crmService.getProjectTasks(projectId));
    }

    @PostMapping("/projects/{projectId}/tasks")
    public ResponseEntity<Task> assignTask(@PathVariable Long projectId, @RequestBody Task taskDetails) {
        Task assignedTask = taskService.assignTask(projectId, taskDetails);
        return ResponseEntity.ok(assignedTask);
    }

    @PutMapping("/tasks/{taskId}/done")
    public ResponseEntity<Task> markTaskAsDone(@PathVariable Long taskId) {
        Task completedTask = taskService.markTaskAsDone(taskId);
        return ResponseEntity.ok(completedTask);
    }

    // --- INVOICES API ---
    @GetMapping("/clients/{clientId}/invoices")
    public ResponseEntity<List<Invoice>> getClientInvoices(@PathVariable Long clientId) {
        return ResponseEntity.ok(crmService.getClientInvoices(clientId));
    }

    @PostMapping("/clients/{clientId}/invoices")
    public ResponseEntity<Invoice> createInvoice(@PathVariable Long clientId, @RequestBody Invoice invoice) {
        return ResponseEntity.ok(crmService.createInvoice(clientId, invoice));
    }

    @PatchMapping("/invoices/{invoiceId}/status")
    public ResponseEntity<Invoice> updateInvoiceStatus(@PathVariable Long invoiceId, @RequestParam InvoiceStatus status) {
        return ResponseEntity.ok(crmService.updateInvoiceStatus(invoiceId, status));
    }

    // --- RESOURCE & CALENDAR ENDPOINTS ---
    @GetMapping("/team")
    public ResponseEntity<List<TeamMember>> getTeamMembers() {
        return ResponseEntity.ok(crmService.getTeamMembers());
    }

    @PostMapping("/team")
    public ResponseEntity<TeamMember> createTeamMember(@RequestBody TeamMember member) {
        return ResponseEntity.ok(crmService.createTeamMember(member));
    }

    @GetMapping("/assignments")
    public ResponseEntity<List<WorkAssignment>> getWorkAssignments() {
        return ResponseEntity.ok(crmService.getWorkAssignments());
    }

    @PostMapping("/assignments")
    public ResponseEntity<WorkAssignment> createWorkAssignment(
            @RequestParam Long teamMemberId,
            @RequestParam Long clientId,
            @RequestBody WorkAssignment assignment) {
        return ResponseEntity.ok(crmService.createWorkAssignment(assignment, teamMemberId, clientId));
    }

    // --- EXPENSE ENDPOINTS ---
    @GetMapping("/expenses")
    public ResponseEntity<List<Expense>> getExpenses() {
        return ResponseEntity.ok(crmService.getExpenses());
    }

    @PostMapping("/expenses")
    public ResponseEntity<Expense> createExpense(@RequestBody Expense expense) {
        return ResponseEntity.ok(crmService.createExpense(expense));
    }
}