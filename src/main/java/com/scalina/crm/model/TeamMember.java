package com.scalina.crm.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "team_members")
public class TeamMember extends BaseEntity {
    private String name;
    private String role; // e.g., "Shooter", "Editor", "Developer"

    // Optional: You could store default rates here in the future,
    // but we will hardcode the 50 / 25 logic in the service for now.
}