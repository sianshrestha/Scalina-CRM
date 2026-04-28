import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
    headerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
    companyName: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
    tagline: { fontSize: 10, color: '#666', marginTop: 4 },
    invoiceTitle: { fontSize: 28, fontWeight: 'bold', color: '#d32f2f', marginTop: 10 },
    section: { marginBottom: 20 },
    boldText: { fontWeight: 'bold' },
    table: { width: '100%', marginTop: 20 },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 5, marginBottom: 5, fontWeight: 'bold' },
    tableRow: { flexDirection: 'row', marginBottom: 5 },
    colDesc: { width: '55%' },
    colQty: { width: '15%', textAlign: 'center' },
    colPrice: { width: '15%', textAlign: 'right' },
    colTotal: { width: '15%', textAlign: 'right' },
    totalsContainer: { alignSelf: 'flex-end', width: '30%', marginTop: 20 },
    totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    footer: { marginTop: 50, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#ccc', fontSize: 9, color: '#555' }
});

export const InvoiceDocument = ({ invoice, client }: any) => {
    const formatMoney = (amount: number) => `$${(amount || 0).toFixed(2)}`;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.headerContainer}>
                    <View>
                        <Text style={styles.companyName}>Scalina Media</Text>
                        <Text style={styles.tagline}>Go Digital, or Go Invisible.</Text>
                        <Text style={styles.invoiceTitle}>INVOICE</Text>
                    </View>
                    <View>
                        <Text><Text style={styles.boldText}>Client ID: </Text>{client.id}</Text>
                        <Text><Text style={styles.boldText}>Invoice No: </Text>{invoice.invoiceNo || '001'}</Text>
                        <Text><Text style={styles.boldText}>Invoice Date: </Text>{invoice.invoiceDate}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.boldText}>INVOICE TO :</Text>
                    <Text>{client.company}</Text>
                    <Text>ABN: {client.abn}</Text>
                    <Text>Address: {client.address}</Text>
                </View>

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

                <View style={styles.totalsContainer}>
                    <View style={styles.totalsRow}>
                        <Text style={styles.boldText}>Sub-total:</Text>
                        <Text>{formatMoney(invoice.amount)}</Text>
                    </View>
                    <View style={styles.totalsRow}>
                        <Text style={styles.boldText}>Total:</Text>
                        <Text style={styles.boldText}>{formatMoney(invoice.amount)}</Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text>info@scalinamedia.com</Text>
                    <Text>  </Text>
                    <Text>ABN: 81821315775</Text>
                    <Text>Account Name: Suhan Shanker</Text>
                    <Text>BSB: 062-235</Text>
                    <Text>Account Number: 11067512</Text>
                    <Text style={{ marginTop: 20, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>THANK YOU!</Text>
                </View>
            </Page>
        </Document>
    );
};