package com.scalina.crm.model;

import com.scalina.crm.model.enums.PipelineStage;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Getter
@Setter
@Table(name = "leads_clients")
public class ClientLead extends BaseEntity{
    private boolean isClient;
    private String name;

    @Column(unique = true)
    private String clientCode;

    private String company;
    private String email;
    private String phone;
    private String tags;
    private String address;
    private String abn;

    @Enumerated(EnumType.STRING)
    @Column(name = "pipeline_stage")
    private PipelineStage pipelineStage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "marketer_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private TeamMember marketer;

    @Column(name = "estimated_weekly_revenue")
    private BigDecimal estimatedWeeklyRevenue;

    @Column(name = "marketers_cut")
    private BigDecimal marketersCut;

}
