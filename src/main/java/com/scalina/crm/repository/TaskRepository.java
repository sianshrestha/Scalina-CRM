package com.scalina.crm.repository;

import com.scalina.crm.model.Task;
import com.scalina.crm.model.enums.TaskType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByProjectId(Long projectId);

    List<Task> findByAssignee(String assignee);

    List<Task> findByTaskType(TaskType taskType);

}