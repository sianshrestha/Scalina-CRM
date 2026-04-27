package com.scalina.crm.model;

import com.scalina.crm.model.enums.PipelineStage;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "leads_clients")
public class ClientLead extends BaseEntity{
    private boolean isClient;
    private String name;
    private String company;
    private String email;

    // Adding the fields needed for the Invoice PDF
    private String address;
    private String abn;

    @Enumerated(EnumType.STRING)
    @Column(name = "pipeline_stage")
    private PipelineStage pipelineStage;

}
