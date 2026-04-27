package com.scalina.crm.repository;

import com.scalina.crm.model.ClientLead;
import com.scalina.crm.model.enums.PipelineStage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ClientLeadRepository extends JpaRepository<ClientLead, UUID> {
    List<ClientLead> findByAgencyId(String agencyId);
    long countByAgencyIdAndPipelineStage(String agencyId, PipelineStage stage);
    long countByAgencyIdAndPipelineStageIn(String agencyId, List<PipelineStage> stages);
}
