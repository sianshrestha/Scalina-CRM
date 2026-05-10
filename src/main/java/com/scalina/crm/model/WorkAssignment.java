package com.scalina.crm.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

@Entity
@Getter
@Setter
@Table(name = "work_assignments")
public class WorkAssignment extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "team_member_id")
    private TeamMember teamMember;

    @ManyToOne
    @JoinColumn(name = "client_id")
    private ClientLead client;

    private LocalDate workDate;

    // Add this along with your other fields
    private java.math.BigDecimal payAmount;
}