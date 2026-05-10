package com.scalina.crm.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class ProjectCreationRequest {
    private Long clientId;
    private String weekCode; // e.g., "wk02"
    private Integer numberOfVideos;
    private LocalDate deadline;
}