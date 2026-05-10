package com.scalina.crm.model;

import com.scalina.crm.model.enums.TaskType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

@Entity
@Getter
@Setter
@Table(name = "tasks")
public class Task extends BaseEntity {

    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskType taskType;

    // For now, mapping to your existing string assignee.
    // Later in Phase 1 (RBAC), we will change this to a ManyToOne User relation.
    private String assignee;

    // Used ONLY for EDIT task types
    private Integer videoNumber;

    // For script/shoot it's the work day. For edit, it's the deadline.
    @Column(nullable = false)
    private LocalDate taskDate;

    // Trigger for your financials & project statuses
    private boolean isCompleted = false;
}