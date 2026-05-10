package com.scalina.crm.repository;

import com.scalina.crm.model.ClientLead;
import com.scalina.crm.model.enums.PipelineStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClientLeadRepository extends JpaRepository<ClientLead, Long> {
    Optional<ClientLead> findByClientCode(String clientCode);
    long countByPipelineStage(PipelineStage pipelineStage);
    long countByPipelineStageIn(List<PipelineStage> pipelineStages);
}