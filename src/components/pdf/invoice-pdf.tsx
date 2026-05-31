import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { isCoachingPackage, paymentMethodLabel } from "@/lib/constants";

interface InvoiceItem {
  slNo: number;
  itemType: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  packageStartDate?: Date | string | null;
  packageEndDate?: Date | string | null;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date | string;
  dueDate: Date | string;
  customerName: string;
  customerMobile: string | null;
  customerAddress: string | null;
  customerGst: string | null;
  subtotal: number;
  gstEnabled: boolean;
  cgstRate: number;
  sgstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  totalGst: number;
  grandTotal: number;
  amountInWords: string;
  paymentStatus: string;
  paymentMethod: string;
  amountPaid: number;
  amountRemaining: number;
  items: InvoiceItem[];
}

interface SettingsData {
  academyName: string;
  phonePrimary: string;
  phoneSecondary: string | null;
  email: string;
  website: string | null;
  gstNumber: string;
  gstEnabled: boolean;
  logoUrl: string;
  footerImageUrl: string;
  signatureUrl: string | null;
  brandColor: string;
  termsAndConditions: string;
}

const BRAND = "#0070C0";
const BRAND_DARK = "#005499";
const ACCENT = "#E8F4FE";
const TEXT_PRIMARY = "#0f172a";
const TEXT_SECONDARY = "#475569";
const TEXT_MUTED = "#94a3b8";
const BORDER = "#cbd5e1";
const ROW_ALT = "#f8fafc";
const SUCCESS = "#16a34a";
const WARNING = "#d97706";
const DANGER = "#dc2626";

function paymentStatusLabel(status: string): string {
  switch (status) {
    case "FULLY_PAID":
      return "PAID IN FULL";
    case "PARTIALLY_PAID":
      return "PARTIALLY PAID";
    case "PENDING":
      return "PAYMENT PENDING";
    default:
      return status;
  }
}

function paymentStatusColor(status: string): string {
  switch (status) {
    case "FULLY_PAID":
      return SUCCESS;
    case "PARTIALLY_PAID":
      return WARNING;
    case "PENDING":
      return DANGER;
    default:
      return TEXT_SECONDARY;
  }
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(amount: number) {
  return `\u20B9 ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPackagePeriod(start?: Date | string | null, end?: Date | string | null) {
  if (!start && !end) return null;
  const s = start ? formatDate(start) : "\u2014";
  const e = end ? formatDate(end) : "\u2014";
  return `Valid: ${s} \u2013 ${e}`;
}

function parseTerms(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatTermLine(term: string, index: number): string {
  return /^\d+[\).\s]/.test(term) ? term : `${index + 1}. ${term}`;
}

const s = StyleSheet.create({
  page: {
    fontSize: 9,
    fontFamily: "Helvetica",
    color: TEXT_PRIMARY,
    backgroundColor: "#ffffff",
    paddingBottom: 70,
  },
  headerWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
  },
  headerTopStripe: {
    height: 5,
    backgroundColor: BRAND,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 0,
  },
  logoBox: {
    width: "35%",
    borderWidth: 1,
    borderColor: BORDER,
    borderRightWidth: 0,
    backgroundColor: "#ffffff",
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    minHeight: 90,
  },
  logo: {
    width: 160,
    height: 64,
    objectFit: "contain",
  },
  academyName: {
    fontSize: 7,
    color: TEXT_MUTED,
    marginTop: 4,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  contactPanel: {
    width: "65%",
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: ACCENT,
    padding: 10,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  contactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  contactCell: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
  },
  contactCellFull: { width: "100%" },
  contactCellHalf: { width: "48%" },
  contactLabel: {
    fontSize: 6,
    color: BRAND,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 8,
    color: TEXT_PRIMARY,
    lineHeight: 1.4,
  },
  headerDivider: {
    height: 2,
    backgroundColor: BRAND,
    marginHorizontal: 24,
  },
  content: {
    marginTop: 138,
    paddingHorizontal: 24,
  },
  titleBand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND,
    paddingVertical: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  titleText: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 12,
  },
  metaLeft: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 10,
  },
  metaRight: {
    flex: 1,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: BRAND,
    borderRadius: 4,
    padding: 10,
  },
  metaLabel: {
    fontSize: 6.5,
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 1,
    fontFamily: "Helvetica-Bold",
  },
  metaValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: TEXT_PRIMARY,
    marginBottom: 7,
  },
  metaValueLast: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: TEXT_PRIMARY,
  },
  billToLabel: {
    fontSize: 7,
    color: BRAND,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: BRAND,
    paddingBottom: 3,
  },
  billToName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: TEXT_PRIMARY,
    marginBottom: 3,
  },
  billToSub: {
    fontSize: 8,
    color: TEXT_SECONDARY,
    marginBottom: 2,
    lineHeight: 1.4,
  },
  table: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND_DARK,
    paddingVertical: 7,
  },
  thCell: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    paddingHorizontal: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    minHeight: 30,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: ROW_ALT,
  },
  tdCell: {
    fontSize: 8.5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: TEXT_PRIMARY,
    lineHeight: 1.4,
  },
  tdMuted: {
    fontSize: 7,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  tdBold: {
    fontFamily: "Helvetica-Bold",
  },
  cSl: { width: "6%", textAlign: "center" },
  cDesc: { width: "44%" },
  cQty: { width: "8%", textAlign: "center" },
  cRate: { width: "21%", textAlign: "right" },
  cAmt: { width: "21%", textAlign: "right" },
  totalsWrap: {
    alignSelf: "flex-end",
    width: 240,
    marginBottom: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  totalLabel: {
    fontSize: 8.5,
    color: TEXT_SECONDARY,
  },
  totalValue: {
    fontSize: 8.5,
    color: TEXT_PRIMARY,
  },
  totalDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 3,
    marginHorizontal: 10,
  },
  gstRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  gstLabel: {
    fontSize: 8,
    color: TEXT_SECONDARY,
  },
  gstValue: {
    fontSize: 8,
    color: TEXT_SECONDARY,
  },
  grandTotalBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: BRAND,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginTop: 6,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  grandTotalValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  infoRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    padding: 9,
    backgroundColor: "#f8fafc",
  },
  infoBoxLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: BRAND,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 3,
  },
  infoBoxTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: TEXT_PRIMARY,
    lineHeight: 1.4,
  },
  infoBoxLine: {
    fontSize: 8,
    color: TEXT_PRIMARY,
    marginBottom: 2,
    lineHeight: 1.4,
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 7,
    marginTop: 2,
  },
  statusText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.3,
  },
  footerRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  footerLeft: {
    flex: 2,
  },
  footerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  termsTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: BRAND_DARK,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  termLine: {
    fontSize: 7,
    color: TEXT_SECONDARY,
    lineHeight: 1.5,
    marginBottom: 1,
  },
  signatureImage: {
    width: 100,
    height: 40,
    objectFit: "contain",
    marginBottom: 4,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    width: 140,
    paddingTop: 4,
    textAlign: "center",
    fontSize: 7.5,
    color: TEXT_MUTED,
  },
  genNote: {
    fontSize: 6.5,
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  footerWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerImage: {
    width: "100%",
    height: 56,
    objectFit: "cover",
  },
});

function ContactCell({
  label,
  value,
  full = false,
}: {
  label: string;
  value?: string | null;
  full?: boolean;
}) {
  if (!value) return null;
  return (
    <View style={[s.contactCell, full ? s.contactCellFull : s.contactCellHalf]}>
      <Text style={s.contactLabel}>{label}</Text>
      <Text style={s.contactValue}>{value}</Text>
    </View>
  );
}

function LetterheadHeader({ settings }: { settings: SettingsData }) {
  const phones = [settings.phonePrimary, settings.phoneSecondary]
    .filter(Boolean)
    .join("  |  ");
  const showGst = settings.gstEnabled && settings.gstNumber;

  return (
    <View style={s.headerWrap} fixed>
      <View style={s.headerTopStripe} />
      <View style={s.headerRow}>
        <View style={s.logoBox}>
          <Image src={settings.logoUrl} style={s.logo} />
          <Text style={s.academyName}>{settings.academyName}</Text>
        </View>
        <View style={s.contactPanel}>
          <View style={s.contactGrid}>
            {phones ? <ContactCell label="Phone" value={phones} full /> : null}
            <ContactCell label="Email" value={settings.email} />
            <ContactCell label="Website" value={settings.website} />
            {showGst ? <ContactCell label="GSTIN" value={settings.gstNumber} full /> : null}
          </View>
        </View>
      </View>
      <View style={s.headerDivider} />
    </View>
  );
}

function LetterheadFooter({ footerUrl }: { footerUrl: string }) {
  return (
    <View style={s.footerWrap} fixed>
      <Image src={footerUrl} style={s.footerImage} />
    </View>
  );
}

function ItemRow({ item, index }: { item: InvoiceItem; index: number }) {
  const period = isCoachingPackage(item.itemType)
    ? formatPackagePeriod(item.packageStartDate, item.packageEndDate)
    : null;

  return (
    <View style={[s.tableRow, index % 2 !== 0 ? s.tableRowAlt : {}]} wrap={false}>
      <Text style={[s.tdCell, s.cSl, { color: TEXT_MUTED }]}>{item.slNo}</Text>
      <View style={[s.tdCell, s.cDesc]}>
        <Text style={s.tdBold}>{item.description}</Text>
        {item.itemType ? <Text style={s.tdMuted}>{item.itemType}</Text> : null}
        {period ? <Text style={s.tdMuted}>{period}</Text> : null}
      </View>
      <Text style={[s.tdCell, s.cQty]}>{item.quantity}</Text>
      <Text style={[s.tdCell, s.cRate]}>{formatMoney(item.unitPrice)}</Text>
      <Text style={[s.tdCell, s.cAmt, s.tdBold]}>{formatMoney(item.amount)}</Text>
    </View>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const color = paymentStatusColor(status);
  return (
    <View style={[s.statusBadge, { backgroundColor: color }]}>
      <Text style={[s.statusText, { color: "#ffffff" }]}>{paymentStatusLabel(status)}</Text>
    </View>
  );
}

export function InvoicePDFDocument({
  invoice,
  settings,
}: {
  invoice: InvoiceData;
  settings: SettingsData;
}) {
  const terms = parseTerms(settings.termsAndConditions || "");
  const showGst = invoice.gstEnabled;
  const invoiceTitle = showGst ? "GST Tax Invoice" : "Tax Invoice";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <LetterheadHeader settings={settings} />
        <LetterheadFooter footerUrl={settings.footerImageUrl} />

        <View style={s.content}>
          <View style={s.titleBand}>
            <Text style={s.titleText}>{invoiceTitle}</Text>
          </View>

          <View style={s.metaRow}>
            <View style={s.metaLeft}>
              <Text style={s.metaLabel}>Invoice No.</Text>
              <Text style={s.metaValue}>{invoice.invoiceNumber}</Text>
              <Text style={s.metaLabel}>Invoice Date</Text>
              <Text style={s.metaValue}>{formatDate(invoice.invoiceDate)}</Text>
              <Text style={s.metaLabel}>Due Date</Text>
              <Text style={s.metaValueLast}>{formatDate(invoice.dueDate)}</Text>
            </View>

            <View style={s.metaRight}>
              <Text style={s.billToLabel}>Bill To</Text>
              <Text style={s.billToName}>{invoice.customerName}</Text>
              {invoice.customerMobile ? (
                <Text style={s.billToSub}>Phone: {invoice.customerMobile}</Text>
              ) : null}
              {invoice.customerAddress ? (
                <Text style={s.billToSub}>{invoice.customerAddress}</Text>
              ) : null}
              {invoice.customerGst && showGst ? (
                <Text style={s.billToSub}>GSTIN: {invoice.customerGst}</Text>
              ) : null}
            </View>
          </View>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.thCell, s.cSl]}>#</Text>
              <Text style={[s.thCell, s.cDesc]}>Description</Text>
              <Text style={[s.thCell, s.cQty]}>Qty</Text>
              <Text style={[s.thCell, s.cRate]}>Unit Rate</Text>
              <Text style={[s.thCell, s.cAmt]}>Amount</Text>
            </View>
            {invoice.items.map((item, i) => (
              <ItemRow key={item.slNo} item={item} index={i} />
            ))}
          </View>

          <View style={s.totalsWrap}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Subtotal</Text>
              <Text style={s.totalValue}>{formatMoney(invoice.subtotal)}</Text>
            </View>

            {showGst && (
              <>
                <View style={s.totalDivider} />
                <View style={s.gstRow}>
                  <Text style={s.gstLabel}>CGST @ {invoice.cgstRate}%</Text>
                  <Text style={s.gstValue}>{formatMoney(invoice.cgstAmount)}</Text>
                </View>
                <View style={s.gstRow}>
                  <Text style={s.gstLabel}>SGST @ {invoice.sgstRate}%</Text>
                  <Text style={s.gstValue}>{formatMoney(invoice.sgstAmount)}</Text>
                </View>
                <View style={s.gstRow}>
                  <Text style={[s.gstLabel, { color: TEXT_PRIMARY }]}>Total GST</Text>
                  <Text style={[s.gstValue, { color: TEXT_PRIMARY }]}>
                    {formatMoney(invoice.totalGst)}
                  </Text>
                </View>
              </>
            )}

            <View style={s.grandTotalBar}>
              <Text style={s.grandTotalLabel}>Grand Total</Text>
              <Text style={s.grandTotalValue}>{formatMoney(invoice.grandTotal)}</Text>
            </View>
          </View>

          <View style={s.infoRow}>
            <View style={s.infoBox}>
              <Text style={s.infoBoxLabel}>Amount in Words</Text>
              <Text style={s.infoBoxTitle}>{invoice.amountInWords}</Text>
            </View>

            <View style={s.infoBox}>
              <Text style={s.infoBoxLabel}>Payment Details</Text>
              <Text style={s.infoBoxLine}>
                Mode: {paymentMethodLabel(invoice.paymentMethod)}
              </Text>
              <PaymentStatusBadge status={invoice.paymentStatus} />
              {(invoice.paymentStatus === "PARTIALLY_PAID" ||
                invoice.paymentStatus === "PENDING") && (
                <>
                  <Text style={[s.infoBoxLine, { marginTop: 5 }]}>
                    Paid: {formatMoney(invoice.amountPaid)}
                  </Text>
                  <Text style={[s.infoBoxLine, { color: DANGER }]}>
                    Balance: {formatMoney(invoice.amountRemaining)}
                  </Text>
                </>
              )}
            </View>
          </View>

          <View style={s.footerRow}>
            <View style={s.footerLeft}>
              {terms.length > 0 && (
                <>
                  <Text style={s.termsTitle}>Terms & Conditions</Text>
                  {terms.map((term, i) => (
                    <Text key={i} style={s.termLine}>
                      {formatTermLine(term, i)}
                    </Text>
                  ))}
                </>
              )}
            </View>

            <View style={s.footerRight}>
              {settings.signatureUrl && (
                <Image src={settings.signatureUrl} style={s.signatureImage} />
              )}
              <Text style={s.signatureLine}>Authorized Signature</Text>
              <Text style={[s.genNote, { marginTop: 6 }]}>{settings.academyName}</Text>
            </View>
          </View>

          <Text style={s.genNote}>
            This is a computer-generated invoice. No signature required if digitally stamped.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
