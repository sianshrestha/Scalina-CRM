package com.scalina.crm.model;

import com.scalina.crm.model.enums.InvoiceStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter @Setter
@Table(name = "invoices")
public class Invoice extends BaseEntity {

    @Column(name = "invoice_no")
    private String invoiceNo;

    @Column(name = "invoice_date")
    private String invoiceDate;

    @Column(name = "due_date")
    private String dueDate;

    private BigDecimal amount;

    @Column(name = "has_gst")
    private Boolean hasGst;

    @Column(name = "gst_amount")
    private BigDecimal gstAmount;

    private Integer weeksCovered;



    @Enumerated(EnumType.STRING)
    private InvoiceStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private ClientLead client;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InvoiceItem> items = new ArrayList<>();

    // Helper method to link items correctly
    public void addItem(InvoiceItem item) {
        items.add(item);
        item.setInvoice(this);
    }
}
