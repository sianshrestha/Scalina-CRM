package com.scalina.crm.repository;

import com.scalina.crm.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findByAgencyIdAndProjectId(String agencyId, UUID projectId);
}
