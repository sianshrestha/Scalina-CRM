package com.scalina.crm.controller;

import com.scalina.crm.dto.DashboardMetricsDTO;
import com.scalina.crm.dto.ProjectCreationRequest;
import com.scalina.crm.model.*;
import com.scalina.crm.model.enums.InvoiceStatus;
import com.scalina.crm.service.CrmService;
import com.scalina.crm.service.ProjectService;
import com.scalina.crm.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

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

    @GetMapping("/projects")
    public ResponseEntity<List<Project>> getAllProjects() {
        return ResponseEntity.ok(crmService.getAllProjects());
    }

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

    @PutMapping("/projects/{projectId}")
    public ResponseEntity<Project> updateProject(@PathVariable Long projectId, @RequestBody ProjectCreationRequest request) {
        Project updatedProject = projectService.updateWeeklyProject(
                projectId,
                request.getClientId(),
                request.getWeekCode(),
                request.getNumberOfVideos(),
                request.getDeadline()
        );
        return ResponseEntity.ok(updatedProject);
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

    @GetMapping("/tasks")
    public ResponseEntity<List<Task>> getAllTasks() {
        return ResponseEntity.ok(crmService.getAllTasks());
    }

    @PatchMapping("/tasks/{taskId}/date")
    public ResponseEntity<Task> updateTaskDate(@PathVariable Long taskId, @RequestParam String newDate) {
        return ResponseEntity.ok(taskService.updateTaskDate(taskId, java.time.LocalDate.parse(newDate)));
    }

    @DeleteMapping("/tasks/{taskId}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long taskId) {
        taskService.deleteTask(taskId);
        return ResponseEntity.noContent().build();
    }

    // --- INVOICES API ---
    @GetMapping("/clients/{clientId}/invoices")
    public ResponseEntity<List<Invoice>> getClientInvoices(@PathVariable Long clientId) {
        return ResponseEntity.ok(crmService.getClientInvoices(clientId));
    }

    @GetMapping("/invoices")
    public ResponseEntity<List<Invoice>> getAllInvoices() {
        return ResponseEntity.ok(crmService.getAllInvoices());
    }

    // 1. Update your PUT endpoint for editing invoices
    @PutMapping("/invoices/{id}")
    public ResponseEntity<Invoice> updateInvoice(@PathVariable Long id, @RequestBody Invoice invoice) {
        return ResponseEntity.ok(crmService.updateInvoice(id, invoice));
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

    @PutMapping("/team/{teamMemberId}")
    public ResponseEntity<TeamMember> updateTeamMember(@PathVariable Long teamMemberId, @RequestBody TeamMember member) {
        return ResponseEntity.ok(crmService.updateTeamMember(teamMemberId, member));
    }

    @DeleteMapping("/team/{teamMemberId}")
    public ResponseEntity<Void> deleteTeamMember(@PathVariable Long teamMemberId) {
        crmService.deleteTeamMember(teamMemberId);
        return ResponseEntity.noContent().build();
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

    @PostMapping(value = "/expenses/{id}/receipt", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Expense> uploadReceipt(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(crmService.uploadReceipt(id, file));
        } catch (Exception e) {
            e.printStackTrace(); // This will print the exact Java error in your terminal!
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/expenses/{id}/receipt/download")
    public ResponseEntity<byte[]> downloadReceipt(@PathVariable Long id) {
        Expense expense = crmService.getExpenseById(id);

        if (expense.getReceiptData() == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + expense.getReceiptFileName() + "\"")
                .contentType(MediaType.parseMediaType(expense.getReceiptFileType()))
                .body(expense.getReceiptData());
    }

    @PutMapping("/expenses/{id}")
    public ResponseEntity<Expense> updateExpense(@PathVariable Long id, @RequestBody Expense expense) {
        expense.setId(id);
        return ResponseEntity.ok(crmService.updateExpense(expense));
    }

    @PatchMapping("/expenses/{id}/status")
    public ResponseEntity<Expense> updateExpenseStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(crmService.updateExpenseStatus(id, body.get("status")));
    }

    @DeleteMapping("/expenses/{id}")
    public ResponseEntity<Void> deleteExpense(@PathVariable Long id) {
        crmService.deleteExpense(id);
        return ResponseEntity.noContent().build();
    }

}
