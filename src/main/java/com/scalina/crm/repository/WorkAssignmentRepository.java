package com.scalina.crm.repository;

import com.scalina.crm.model.WorkAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;

@Repository
public interface WorkAssignmentRepository extends JpaRepository<WorkAssignment, Long> {
    @Query("SELECT COALESCE(SUM(w.payAmount), 0) FROM WorkAssignment w")
    BigDecimal getTotalVariableCosts();

    void deleteByTeamMemberId(Long teamMemberId);
}
