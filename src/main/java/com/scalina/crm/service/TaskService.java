package com.scalina.crm.service;

import com.scalina.crm.model.Expense;
import com.scalina.crm.model.Project;
import com.scalina.crm.model.Task;
import com.scalina.crm.model.enums.TaskType;
import com.scalina.crm.repository.ExpenseRepository;
import com.scalina.crm.repository.ProjectRepository;
import com.scalina.crm.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final ExpenseRepository expenseRepository;

    @Transactional
    public Task assignTask(Long projectId, Task taskDetails) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (taskDetails.getTaskType() == TaskType.EDIT) {
            if (taskDetails.getVideoNumber() == null || taskDetails.getVideoNumber() > project.getNumberOfVideos()) {
                throw new IllegalArgumentException("Invalid video number for this project.");
            }
        }

        taskDetails.setProject(project);
        updateProjectStatusToInitiated(project, taskDetails.getTaskType());

        return taskRepository.save(taskDetails);
    }

    @Transactional
    public Task markTaskAsDone(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if (task.isCompleted()) {
            return task;
        }

        task.setCompleted(true);
        taskRepository.save(task);

        // 1. Trigger Project Status Roll-up Automation
        rollUpProjectStatuses(task.getProject());

        // 2. Trigger Financial Automation (Daily Salary)
        handleFinancialAutomation(task);

        return task;
    }

    // --- AUTOMATION HELPERS ---

    private void updateProjectStatusToInitiated(Project project, TaskType type) {
        boolean updated = false;
        if (type == TaskType.SCRIPT && "PENDING".equals(project.getScriptStatus())) {
            project.setScriptStatus("INITIATED");
            updated = true;
        } else if (type == TaskType.SHOOT && "PENDING".equals(project.getShootStatus())) {
            project.setShootStatus("INITIATED");
            updated = true;
        } else if (type == TaskType.EDIT && "PENDING".equals(project.getOverallEditStatus())) {
            project.setOverallEditStatus("INITIATED");
            updated = true;
        }

        if(updated) projectRepository.save(project);
    }

    @Transactional
    public Task updateTaskDate(Long taskId, LocalDate newDate) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        task.setTaskDate(newDate);
        return taskRepository.save(task);
    }

    @Transactional
    public void deleteTask(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        taskRepository.delete(task);
    }

    // FIXED: Added missing method header and parameters
    private void rollUpProjectStatuses(Project project) {
        List<Task> projectTasks = project.getTasks();

        boolean scriptDone = false;
        boolean shootDone = false;
        long completedEditTasks = 0;
        long totalEditTasksAssigned = 0;

        for (Task t : projectTasks) {
            if (t.getTaskType() == TaskType.SCRIPT && t.isCompleted()) scriptDone = true;
            if (t.getTaskType() == TaskType.SHOOT && t.isCompleted()) shootDone = true;
            if (t.getTaskType() == TaskType.EDIT) {
                totalEditTasksAssigned++;
                if (t.isCompleted()) completedEditTasks++;
            }
        }

        if (scriptDone) project.setScriptStatus("COMPLETED");
        if (shootDone) project.setShootStatus("COMPLETED");

        if (totalEditTasksAssigned == project.getNumberOfVideos() && completedEditTasks == project.getNumberOfVideos()) {
            project.setOverallEditStatus("COMPLETED");
        }

        if ("COMPLETED".equals(project.getScriptStatus()) &&
                "COMPLETED".equals(project.getShootStatus()) &&
                "COMPLETED".equals(project.getOverallEditStatus())) {
            project.setOverallProjectStatus("COMPLETED");
        }

        projectRepository.save(project);
    }

    private void handleFinancialAutomation(Task task) {
        if (task.getTaskType() == TaskType.SHOOT) {

            String memberName = task.getAssignee();
            LocalDate workDate = task.getTaskDate();

            // Look up by payee + date + type (matches what frontend checks)
            Optional<Expense> existingExpense = expenseRepository
                    .findByPayeeAndExpenseDateAndType(memberName, workDate, "Salary");

            if (existingExpense.isEmpty()) {
                Expense newExpense = new Expense();
                // Use payee (used by frontend filters) and a clear title
                newExpense.setTitle(memberName + " - SALARY");
                newExpense.setPayee(memberName);
                // Use consistent type string that frontend expects ('Salary')
                newExpense.setType("Salary");
                // amount required by DB; leave 0.0 so user can edit later
                newExpense.setAmount(0.0);
                newExpense.setExpenseDate(workDate);
                newExpense.setPaid(false); // or setPaid(false) depending on your Lombok accessors
                newExpense.setRecurring(false); // or setRecurring(false)
                // Avoid letting this throw and roll back task completion: wrap persist in try/catch
                try {
                    expenseRepository.save(newExpense);
                } catch (Exception ex) {
                    // Log but do not rethrow — we do not want salary creation to break the task completion
                    ex.printStackTrace();
                    // optionally use a Logger: logger.error("Failed creating salary expense", ex);
                }
            }
        }
    }

}