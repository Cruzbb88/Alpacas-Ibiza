import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 50, fontFamily: 'Helvetica', fontSize: 11, color: '#2E2E2E' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, borderBottomWidth: 2, borderBottomColor: '#556B2F', paddingBottom: 10 },
  brandName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#556B2F' },
  receiptLabel: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  section: { marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: '#666' },
  value: { fontFamily: 'Helvetica-Bold' },
  table: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#DDD' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  cellDesc: { flex: 3 },
  cellAmount: { flex: 1, textAlign: 'right' },
  total: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 8, borderTopWidth: 2, borderTopColor: '#556B2F' },
  footer: { position: 'absolute', bottom: 30, left: 50, right: 50, fontSize: 8, color: '#999', textAlign: 'center', borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 8 },
  note: { fontSize: 9, color: '#888', marginTop: 16, fontStyle: 'italic' },
})

export interface ReceiptLineItem {
  description: string
  date: string  // formatted
  amount: string  // formatted with currency
}

export interface ReceiptProps {
  receiptNumber: string
  issuedDate: string
  donorName: string
  donorEmail: string
  tier: 'monthly' | 'yearly'
  alpacaName: string | null
  lineItems: ReceiptLineItem[]
  totalPaid: string
  currency: string
  // Business identity for the receipt footer
  businessName: string
  businessAddress: string
  businessVatOrCif: string | null
}

export function PaymentReceipt(props: ReceiptProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>{props.businessName}</Text>
            <Text style={styles.label}>{props.businessAddress}</Text>
            {props.businessVatOrCif && <Text style={styles.label}>CIF/VAT: {props.businessVatOrCif}</Text>}
          </View>
          <View>
            <Text style={styles.receiptLabel}>PAYMENT RECEIPT</Text>
            <Text style={styles.label}>No. {props.receiptNumber}</Text>
            <Text style={styles.label}>{props.issuedDate}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 6 }}>Billed to</Text>
          <Text>{props.donorName}</Text>
          <Text style={styles.label}>{props.donorEmail}</Text>
        </View>

        <View style={styles.section}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 6 }}>Adoption details</Text>
          <View style={styles.row}><Text style={styles.label}>Plan</Text><Text style={styles.value}>{props.tier === 'monthly' ? 'Monthly adoption' : 'Yearly adoption'}</Text></View>
          {props.alpacaName && <View style={styles.row}><Text style={styles.label}>Sponsored alpaca</Text><Text style={styles.value}>{props.alpacaName}</Text></View>}
        </View>

        <View style={styles.table}>
          {props.lineItems.map((li, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.cellDesc}>{li.description}{'\n'}<Text style={styles.label}>{li.date}</Text></Text>
              <Text style={styles.cellAmount}>{li.amount}</Text>
            </View>
          ))}
          <View style={styles.total}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Total paid</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{props.totalPaid}</Text>
          </View>
        </View>

        <Text style={styles.note}>
          This is a payment receipt for an Adopt-a-Paca symbolic sponsorship. Adoption is a
          symbolic sponsorship, not a registered charitable donation, and is not tax-deductible.
          Retain this receipt for your records.
        </Text>

        <Text style={styles.footer}>{props.businessName} · alpacasibiza.com · info@alpacasibiza.com</Text>
      </Page>
    </Document>
  )
}
