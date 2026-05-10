package com.scalina.crm.repository;

import com.scalina.crm.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    // Auto-generated project code lookup
    Optional<Project> findByProjectCode(String projectCode);

    // Fallback if needed globally
    List<Project> findByClientId(Long clientId);
}