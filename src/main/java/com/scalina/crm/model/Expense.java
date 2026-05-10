package com.scalina.crm.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Getter
@Setter
@Table(name = "expenses")
public class Expense extends BaseEntity {

    @Column(nullable = false)
    private String title; // E.g., Member's name or "CapCut Subscription"

    @Column(nullable = false)
    private String category; // SALARY, SOFTWARE, OTHERS, EQUIPMENT

    @Column(nullable = false)
    private String type; // RECURRING, ONE_TIME

    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDate expenseDate;

    private String reference;

    private String receiptPhotoUrl; // Path to uploaded AWS S3 / Local image

    // false = Upcoming Payment, true = Make Payment clicked (moves to history)
    private boolean isPaid = false;
}