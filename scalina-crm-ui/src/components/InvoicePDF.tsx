
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// --- REPLACE THESE WITH YOUR ACTUAL IMAGE PATHS OR BASE64 STRINGS ---
// If using Vite/Webpack, you might do: import logoImg from '../assets/Scalina Media.png';
const LOGO_URL = '/Scalina Media.png'; // Assuming it's in your public folder, or use imported variable
const SIGNATURE_URL = ''; // Leave blank for now, add path later

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#333'
    },
    // --- Header Section (Logo + Invoice Details) ---
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
        alignItems: 'flex-start' // Align to top
    },
    logoAndTitle: {
        width: '50%'
    },
    logo: {
        width: 150, // Adjust this to match the exact size you want
        marginBottom: 10
    },
    companyName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 2
    },
    tagline: {
        fontSize: 9,
        color: '#666',
        fontStyle: 'italic'
    },
    invoiceTitleMain: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#d32f2f', // Red color
        marginTop: 20,
        letterSpacing: 2
    },
    invoiceDetailsBox: {
        width: '40%',
        alignItems: 'flex-end'
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 4
    },
    detailLabel: {
        fontWeight: 'bold',
        marginRight: 5
    },

    // --- Bill To Section ---
    section: {
        marginBottom: 30
    },
    billToLabel: {
        fontWeight: 'bold',
        marginBottom: 5
    },
    clientName: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 3
    },

    boldText: { fontWeight: 'bold' },

    // --- Table Section ---
    table: {
        width: '100%',
        marginTop: 10
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#d32f2f', // Match the red from the PDF
        paddingBottom: 5,
        marginBottom: 10,
        fontWeight: 'bold'
    },
    tableRow: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#eee' // Light gray line between rows
    },
    colDesc: { width: '55%' },
    colQty: { width: '15%', textAlign: 'center' },
    colPrice: { width: '15%', textAlign: 'right' },
    colTotal: { width: '15%', textAlign: 'right' },

    // --- Totals Section ---
    totalsContainer: {
        alignSelf: 'flex-end',
        width: '40%',
        marginTop: 20
    },
    totalsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5
    },
    totalFinalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: '#000',
        fontWeight: 'bold'
    },

    // --- Footer Section ---
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 50,
        paddingTop: 20,
    },
    footerColumn: {
        width: '45%'
    },
    signatureBox: {
        height: 60,
        width: 150,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        marginBottom: 5,
        justifyContent: 'flex-end',
        alignItems: 'center'
    },
    signatureImage: {
        width: 120,
        height: 40,
        objectFit: 'contain'
    },
    thankYouText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#d32f2f',
        textAlign: 'center',
        marginTop: 20,
        letterSpacing: 1
    }
});

export const InvoiceDocument = ({ invoice, client }: any) => {
    const formatMoney = (amount: number) => `$${(amount || 0).toFixed(2)}`;

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* HEADER: Logo on Left, Details on Right */}
                <View style={styles.headerContainer}>
                    <View style={styles.logoAndTitle}>
                        {/* Replace src with your imported variable if needed */}
                        <Image src={LOGO_URL} style={styles.logo} />
                        <Text style={styles.companyName}>Scalina Media</Text>
                        <Text style={styles.tagline}>Go Digital, or Go Invisible.</Text>
                        <Text style={styles.invoiceTitleMain}>INVOICE</Text>
                    </View>

                    <View style={styles.invoiceDetailsBox}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Client ID:</Text>
                            <Text>{client.clientIdCode}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Invoice No:</Text>
                            <Text>{invoice.invoiceNo || '001'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Invoice Date:</Text>
                            <Text>{invoice.invoiceDate}</Text>
                        </View>
                    </View>
                </View>

                {/* INVOICE TO SECTION */}
                <View style={styles.section}>
                    <Text style={styles.billToLabel}>INVOICE TO :</Text>
                    <Text style={styles.clientName}>{client.company}</Text>
                    <Text>ABN: {client.abn}</Text>
                    <Text>Address: {client.address}</Text>
                </View>

                {/* ITEMS TABLE */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colDesc}>DESCRIPTION</Text>
                        <Text style={styles.colQty}>QTY</Text>
                        <Text style={styles.colPrice}>PRICE</Text>
                        <Text style={styles.colTotal}>TOTAL</Text>
                    </View>
                    {invoice.items && invoice.items.map((item: any, index: number) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={styles.colDesc}>{item.description}</Text>
                            <Text style={styles.colQty}>{item.quantity}</Text>
                            <Text style={styles.colPrice}>{formatMoney(item.price)}</Text>
                            <Text style={styles.colTotal}>{formatMoney(item.quantity * item.price)}</Text>
                        </View>
                    ))}
                </View>

                {/* TOTALS */}
                <View style={styles.totalsContainer}>
                    <View style={styles.totalsRow}>
                        <Text style={styles.boldText}>Sub-total:</Text>
                        <Text>{formatMoney(invoice.amount)}</Text>
                    </View>
                    <View style={styles.totalFinalRow}>
                        <Text>Total:</Text>
                        <Text>{formatMoney(invoice.amount)}</Text>
                    </View>
                </View>

                {/* FOOTER: Contact Info & Signature Area */}
                <View style={styles.footerContainer}>
                    <View style={styles.footerColumn}>
                        <Text>info@scalinamedia.com</Text>
                        <Text style={{ marginTop: 10 }}>ABN: 81821315775</Text>
                        <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Payment Details:</Text>
                        <Text>Account Name: Suhan Shanker</Text>
                        <Text>BSB: 062-235</Text>
                        <Text>Account Number: 11067512</Text>
                    </View>

                    <View style={[styles.footerColumn, { alignItems: 'flex-end' }]}>
                        {/* Signature Placeholder */}
                        <View style={styles.signatureBox}>
                            {SIGNATURE_URL ? (
                                <Image src={SIGNATURE_URL} style={styles.signatureImage} />
                            ) : null}
                        </View>
                        <Text style={{ textAlign: 'center', width: 150 }}>Administrator</Text>
                    </View>
                </View>

                {/* THANK YOU */}
                <Text style={styles.thankYouText}>THANK YOU!</Text>

            </Page>
        </Document>
    );
};