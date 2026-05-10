package com.scalina.crm.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@Table(name = "projects")
public class Project extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String projectCode; // Auto-generated e.g., PSMML01wk02

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private ClientLead client;

    @Column(nullable = false)
    private String weekCode; // e.g., "wk02"

    @Column(nullable = false)
    private Integer numberOfVideos; // Limit for Edit tasks

    private LocalDate projectDeadline;

    // --- AUTOMATED STATUSES ---
    // Statuses: PENDING, INITIATED, COMPLETED, CANCELLED
    @Column(nullable = false)
    private String scriptStatus = "PENDING";

    @Column(nullable = false)
    private String shootStatus = "PENDING";

    @Column(nullable = false)
    private String overallEditStatus = "PENDING";

    @Column(nullable = false)
    private String overallProjectStatus = "PENDING";

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Task> tasks = new ArrayList<>();

    // Automatically generates the code before saving to the database
    @PrePersist
    @PreUpdate
    public void generateProjectCode() {
        if (this.client != null && this.client.getClientCode() != null && this.weekCode != null) {
            this.projectCode = "PSM" + this.client.getClientCode() + this.weekCode;
        }
    }
}