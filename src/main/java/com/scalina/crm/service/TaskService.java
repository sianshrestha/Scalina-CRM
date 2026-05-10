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
    public Task assignTask(Long projectId, Task taskDetails) { // Removed agencyId parameter
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
            return task; // Already completed
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

        // Update Script/Shoot status
        if (scriptDone) project.setScriptStatus("COMPLETED");
        if (shootDone) project.setShootStatus("COMPLETED");

        // Update Edit Status (Only completed if ALL assigned videos are done, AND they match the project's total video count)
        if (totalEditTasksAssigned == project.getNumberOfVideos() && completedEditTasks == project.getNumberOfVideos()) {
            project.setOverallEditStatus("COMPLETED");
        }

        // Final Project Roll-up
        if ("COMPLETED".equals(project.getScriptStatus()) &&
                "COMPLETED".equals(project.getShootStatus()) &&
                "COMPLETED".equals(project.getOverallEditStatus())) {
            project.setOverallProjectStatus("COMPLETED");
        }

        projectRepository.save(project);
    }

    private void handleFinancialAutomation(Task task) {
        // We only automate daily pay for SCRIPT and SHOOT teams.
        if (task.getTaskType() == TaskType.SCRIPT || task.getTaskType() == TaskType.SHOOT) {

            String memberName = task.getAssignee();
            LocalDate workDate = task.getTaskDate();

            // Check if a salary expense already exists for this person on this exact day
            Optional<Expense> existingExpense = expenseRepository
                    .findByTitleAndExpenseDateAndCategory(memberName, workDate, "SALARY");

            if (existingExpense.isEmpty()) {
                // No expense exists for this day, so we create a new one!
                Expense newExpense = new Expense();
                newExpense.setTitle(memberName);
                newExpense.setCategory("SALARY");
                newExpense.setType("ONE_TIME");
                newExpense.setExpenseDate(workDate);
                newExpense.setPaid(false); // It goes into "Upcoming Payments"

                // Note: We leave amount as null. The user will input this manually in the frontend later!
                expenseRepository.save(newExpense);
            }
            // If it DOES exist, we do nothing. This fulfills your requirement that they
            // only get ONE salary line item per day, even if they finish multiple tasks.
        }
    }
}