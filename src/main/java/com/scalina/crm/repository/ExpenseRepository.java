package com.scalina.crm.repository;

import com.scalina.crm.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    Optional<Expense> findByTitleAndExpenseDateAndType(String title, LocalDate expenseDate, String type);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.isPaid = true")
    BigDecimal getTotalExpenses();
}