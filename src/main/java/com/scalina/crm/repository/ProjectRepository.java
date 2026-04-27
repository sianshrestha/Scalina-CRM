package com.scalina.crm.repository;

import com.scalina.crm.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    List<Project> findByAgencyIdAndClientId(String agencyId, UUID clientId);
}
