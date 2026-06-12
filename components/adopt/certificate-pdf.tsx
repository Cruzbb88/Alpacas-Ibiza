import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 60, backgroundColor: '#F7F1E1', fontFamily: 'Helvetica' },
  border: { borderWidth: 2, borderColor: '#556B2F', padding: 40, height: '100%' },
  innerBorder: { borderWidth: 1, borderColor: '#556B2F', padding: 30, height: '100%' },
  eyebrow: { fontSize: 10, textAlign: 'center', letterSpacing: 4, color: '#556B2F', textTransform: 'uppercase', marginBottom: 8 },
  title: { fontSize: 32, textAlign: 'center', marginBottom: 6, color: '#2E2E2E', fontFamily: 'Helvetica-Bold' },
  subtitle: { fontSize: 12, textAlign: 'center', color: '#666', marginBottom: 40 },
  presentedTo: { fontSize: 11, textAlign: 'center', letterSpacing: 2, color: '#888', textTransform: 'uppercase', marginBottom: 8 },
  donorName: { fontSize: 26, textAlign: 'center', marginBottom: 30, color: '#556B2F', fontFamily: 'Helvetica-Bold' },
  sponsorOf: { fontSize: 11, textAlign: 'center', letterSpacing: 2, color: '#888', textTransform: 'uppercase', marginBottom: 6 },
  alpacaName: { fontSize: 22, textAlign: 'center', marginBottom: 30, color: '#2E2E2E', fontFamily: 'Helvetica-Bold' },
  body: { fontSize: 11, textAlign: 'center', color: '#444', lineHeight: 1.6, marginBottom: 40, paddingHorizontal: 30 },
  footer: { fontSize: 9, textAlign: 'center', color: '#999', position: 'absolute', bottom: 30, left: 60, right: 60 },
  meta: { fontSize: 9, textAlign: 'center', color: '#888', marginTop: 20 },
})

export interface CertificateProps {
  donorName: string
  alpacaName: string | null
  issuedAt: string  // ISO date
  certificateId: string  // short opaque id for verification
}

export function AdoptionCertificate({ donorName, alpacaName, issuedAt, certificateId }: CertificateProps) {
  const displayAlpaca = alpacaName ?? 'an alpaca of our herd'
  const dateStr = new Date(issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.border}>
          <View style={styles.innerBorder}>
            <Text style={styles.eyebrow}>Alpacas Ibiza · Es Currals</Text>
            <Text style={styles.title}>Certificate of Adoption</Text>
            <Text style={styles.subtitle}>{"You're part of the herd."}</Text>

            <Text style={styles.presentedTo}>Presented to</Text>
            <Text style={styles.donorName}>{donorName}</Text>

            <Text style={styles.sponsorOf}>Sponsor of</Text>
            <Text style={styles.alpacaName}>{displayAlpaca}</Text>

            <Text style={styles.body}>
              In gratitude for your support of our small herd at Es Currals,
              {"\n"}{"Ibiza's"} first alpaca farm. Your sponsorship funds welfare,
              {'\n'}shearing, vet care, and the land we share with these gentle
              {'\n'}ambassadors of slow craft.
            </Text>

            <Text style={styles.meta}>Issued {dateStr} · ID {certificateId}</Text>
            <Text style={styles.footer}>alpacasibiza.com · info@alpacasibiza.com</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
