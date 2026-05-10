package com.scalina.crm.service;

import com.scalina.crm.model.ClientLead;
import com.scalina.crm.model.Project;
import com.scalina.crm.repository.ClientLeadRepository;
import com.scalina.crm.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ClientLeadRepository clientLeadRepository;

    @Transactional
    public Project createWeeklyProject(Long clientId, String weekCode, Integer numberOfVideos, LocalDate deadline) {
        ClientLead client = clientLeadRepository.findById(clientId)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        Project project = new Project();
        project.setClient(client);
        project.setWeekCode(weekCode);
        project.setNumberOfVideos(numberOfVideos);
        project.setProjectDeadline(deadline);

        return projectRepository.save(project);
    }

    // You can add methods here to fetch all projects, cancel projects, etc.
    @Transactional
    public Project cancelProject(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        project.setOverallProjectStatus("CANCELLED");
        return projectRepository.save(project);
    }
}