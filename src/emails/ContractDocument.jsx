// src/emails/ContractDocument.jsx
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// ---- Styles ----
const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#111111",
  },
  headerBar: {
    backgroundColor: "#11999e",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
  },
  italicSmall: {
    fontSize: 9,
    fontStyle: "italic",
    marginTop: 4,
  },
  paragraph: {
    marginVertical: 1,
    lineHeight: 1,
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: "#3a3a3c",
    borderBottomStyle: "solid",
    marginVertical: 6,
  },
  hrTeal: {
    borderBottomWidth: 1,
    borderBottomColor: "#11999e",
    borderBottomStyle: "solid",
    marginVertical: 6,
  },
  labelRow: {
    marginVertical: 2,
  },
  labelBold: {
    fontWeight: "bold",
  },
  underline: {
    textDecoration: "underline",
  },
  olList: {
    marginLeft: 16,
    marginVertical: 4,
  },
  olItem: {
    marginVertical: 1,
  },

  // LEXIFY Request sections – no borders, keep blue header
  card: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#ffffff",
    borderRadius: 1,
    marginBottom: 12,
  },
  cardHeader: {
    backgroundColor: "#11999e",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#11999e",
  },
  cardHeaderText: {
    fontWeight: "bold",
    fontSize: 12,
    color: "#ffffff",
  },
  cardBody: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#ffffff",
  },

  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#dddddd",
    borderTopStyle: "solid",
    paddingVertical: 3,
  },
  tableCellLabel: {
    flex: 1,
    fontWeight: "bold",
    paddingRight: 4,
  },
  tableCellValue: {
    flex: 2,
  },
  smallMuted: {
    fontSize: 9,
    color: "#555555",
  },
});

// ---- Helpers ----
function deepGet(obj, dotted) {
  try {
    return dotted
      .split(".")
      .reduce((o, k) => (o == null ? undefined : o[k]), obj);
  } catch {
    return undefined;
  }
}

function isYesString(v) {
  return typeof v === "string" ? v.trim().toLowerCase() === "yes" : v === true;
}

function buildClientLine(row, companyName) {
  const name =
    companyName ||
    row?.companyName ||
    row?.clientName ||
    row?.purchaser?.companyName ||
    row?.client?.companyName ||
    null;
  const id =
    row?.companyId ||
    row?.businessId ||
    row?.purchaser?.companyId ||
    row?.client?.companyId ||
    null;
  const country =
    row?.companyCountry ||
    row?.country ||
    row?.purchaser?.companyCountry ||
    row?.client?.companyCountry ||
    null;
  const parts = [name, id, country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function getAssignmentType(row) {
  return row?.assignmentType ?? row?.details?.assignmentType ?? "";
}

function winnerOnly(row) {
  const status = (
    row?.details?.winnerBidderOnlyStatus ||
    row?.winnerBidderOnlyStatus ||
    ""
  ).trim();
  const confidentialYes =
    isYesString(row?.details?.confidential) || isYesString(row?.confidential);
  return confidentialYes || status === "Disclosed to Winning Bidder Only"
    ? "Disclosed to Winning Bidder Only"
    : "";
}

function primaryContactPersonConfidential(row) {
  return row?.primaryContactPerson ?? row?.details?.primaryContactPerson ?? "—";
}

function counterpartyOrWinnerOnly(row) {
  return (
    row?.details?.breachCompany ||
    row?.details?.winnerBidderOnlyStatus ||
    row?.details?.counterparty ||
    row?.counterparty ||
    "—"
  );
}

function fmtMoney(num, suffix = "") {
  if (typeof num !== "number") return "—";
  return `${num.toLocaleString("fi-FI").replace(/\s/g, " ")}${
    suffix ? ` ${suffix}` : ""
  }`;
}

function priceModel(row) {
  const rate = row.paymentRate || "—";
  const ccy = row.currency || "";
  const max =
    typeof row.maximumPrice === "number"
      ? ` / Max ${fmtMoney(row.maximumPrice, ccy)}`
      : "";
  return `${rate}${ccy ? ` (${ccy})` : ""}${max}`;
}

function docsWithOther(row) {
  const fromDetails =
    row?.details?.documentTypes ||
    row?.details?.documents ||
    row?.scopeOfWork ||
    "";
  const other = row?.details?.otherDocument || row?.details?.otherArea || "";
  return [fromDetails, other].filter(Boolean).join(", ") || "—";
}

function supportWithDueDiligence(row) {
  const base = row?.scopeOfWork || "—";
  const dd =
    row?.details?.dueDiligence &&
    row.details.dueDiligence !== "Legal Due Diligence inspection not needed"
      ? ` (Due Diligence: ${row.details.dueDiligence})`
      : "";
  return `${base}${dd}`;
}

function formatLocalDDMMYYYY_HHMM(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(
    date.getMonth() + 1
  )}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatLocalDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function parseIfDateLike(value, pathHint) {
  const hint = (pathHint || "").toLowerCase();
  const looksLikeDateByPath =
    hint.includes("deadline") ||
    hint.includes("date") ||
    hint.includes("expire");

  if (!value && !looksLikeDateByPath) return null;

  if (value instanceof Date) return value;

  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === "string") {
    const s = value.trim();

    if (
      looksLikeDateByPath ||
      /^\d{4}-\d{2}-\d{2}t\d{2}:/i.test(s) ||
      /z$/i.test(s)
    ) {
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) return d;
    }

    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(s)) {
      const d = new Date(s.replace(" ", "T"));
      if (!Number.isNaN(d.getTime())) return d;
    }

    // NEW: accept plain YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const d = new Date(s + "T00:00:00");
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  // Fallback: if it *should* be a date, let Date() try
  if (looksLikeDateByPath) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function resolvePath(row, path, companyName) {
  if (!path) return "—";
  if (path.startsWith("__")) {
    switch (path) {
      case "__clientLine__": {
        return buildClientLine(row, companyName);
      }
      case "__clientLineOrDisclosed__": {
        return buildClientLine(row, companyName);
      }
      case "__counterpartyConfidential__":
        return counterpartyOrWinnerOnly(row);
      case "__currencyMax__":
        return [row.currency || "—", fmtMoney(row.maximumPrice, row.currency)]
          .filter(Boolean)
          .join(" / ");
      case "__primaryContactPersonConfidential__":
        return primaryContactPersonConfidential(row);
      case "__priceModel__":
      case "__priceModel_LumpSumWithCurrency__":
      case "__priceModel_HourlyWithCurrency__":
      case "__priceModel_Arbitration__":
      case "__priceModel_Court__":
        return priceModel(row);
      case "__docsWithOther__":
        return docsWithOther(row);
      case "__supportWithDueDiligenceFormat__":
        return supportWithDueDiligence(row);
      default:
        return "—";
    }
  }
  return deepGet(row, path) ?? "—";
}

function getFirstByPath(row, paths = []) {
  for (const p of paths) {
    const v = p === "." ? row : deepGet(row, p);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function resolveByLabel(row, labelRaw) {
  if (!labelRaw) return undefined;
  const label = String(labelRaw).trim().toLowerCase();
  if (label === "primary contact person") {
    return getFirstByPath(row, [
      "primaryContactPerson",
      "details.primaryContactPerson",
      "client.primaryContactPerson",
      "clientContactPerson",
      "contactPerson",
    ]);
  }
  if (label === "currency") {
    return getFirstByPath(row, [
      "currency",
      "details.currency",
      "requestCurrency",
    ]);
  }
  if (label === "invoice type" || label === "invoicing") {
    return getFirstByPath(row, [
      "invoiceType",
      "details.invoiceType",
      "paymentTerms",
    ]);
  }
  if (label === "advance retainer fee") {
    return getFirstByPath(row, [
      "advanceRetainerFee",
      "details.advanceRetainerFee",
      "retainerFee",
    ]);
  }
  if (label === "assignment type") {
    return getAssignmentType(row);
  }
  if (
    label === "additional background information" ||
    label === "background information"
  ) {
    return getFirstByPath(row, [
      "additionalBackgroundInfo",
      "details.additionalBackgroundInfo",
      "details.background",
    ]);
  }
  return undefined;
}

const HIDE_PATHS = new Set([
  "serviceProviderType",
  "domesticOffers",
  "providerSize",
  "providerCompanyAge",
  "providerMinimumRating",
  "details.serviceProviderType",
  "details.domesticOffers",
  "details.providerSize",
  "details.providerCompanyAge",
  "details.providerMinimumRating",
  "offersDeadline",
  "details.offersDeadline",
  "dateExpired",
  "details.dateExpired",
  "title",
  "requestTitle",
  "requestState",
  "maximumPrice",
  "details.maximumPrice",
  "providerReferences",
]);

function looksLikeProviderReqSection(section) {
  const key = (section?.id || section?.name || section?.title || "")
    .toString()
    .toLowerCase();
  return (
    key.includes("provider requirement") ||
    key.includes("provider_requirements")
  );
}

function shouldHideField(field) {
  const path = (field?.path || "").toString();
  if (HIDE_PATHS.has(path)) return true;
  const label = (field?.label || "").toString().toLowerCase();
  if (
    label === "service provider type" ||
    label === "domestic offers" ||
    label.includes("provider size") ||
    label.includes("company age") ||
    label === "minimum rating" ||
    label === "offers deadline" ||
    label === "request title" ||
    label === "request state" ||
    label === "maximum price"
  )
    return true;
  return false;
}

function renderValueForPdf(v, pathHint) {
  if ((pathHint || "").toLowerCase().includes("primarycontactperson")) {
    if (v === null || v === undefined || v === "") return "—";

    // If it's already a string (like "Olli Rautiainen"), just show it
    if (typeof v === "string") {
      const s = v.trim();
      return s || "—";
    }

    // If it's an object, try firstName/lastName, then name/fullName
    if (typeof v === "object") {
      const p = v || {};
      const fromFields = [p.firstName, p.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (fromFields) return fromFields;

      if (typeof p.name === "string" && p.name.trim()) return p.name.trim();
      if (typeof p.fullName === "string" && p.fullName.trim())
        return p.fullName.trim();
    }
  }

  if (
    pathHint === "backgroundInfoFiles" ||
    pathHint === "supplierCodeOfConductFiles"
  ) {
    if (Array.isArray(v) && v.length > 0) {
      return v
        .map((file, idx) => {
          const name = file.name || `File ${idx + 1}`;
          return `${name}`;
        })
        .join("\n");
    }
    return "—";
  }

  if (
    pathHint === "details.additionalQuestions" &&
    v &&
    typeof v === "object" &&
    !Array.isArray(v)
  ) {
    const entries = Object.entries(v);
    if (!entries.length) return "—";

    return entries
      .map(([question, answer]) => {
        const ans =
          answer && String(answer).trim()
            ? String(answer).trim()
            : "(no answer yet)";
        return `Information Request: ${question}\nClient's Response: ${ans}`;
      })
      .join("\n\n");
  }

  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (v === null || v === undefined || v === "") return "—";
  const maybeDate = parseIfDateLike(v, pathHint);
  if (maybeDate) return formatLocalDDMMYYYY_HHMM(maybeDate);
  return String(v);
}

// ---- Main Document ----
function ContractDocument({ contract, companyName, previewDef }) {
  if (!contract) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>Error: No contract data provided</Text>
        </Page>
      </Document>
    );
  }

  let contractDate =
    contract.contractDate ?? contract.request?.contractDate ?? null;

  const def = previewDef || null;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>LEXIFY Contract</Text>
        </View>

        {/* Cover Page – Parties & Price */}
        <View>
          <View style={styles.labelRow}>
            <Text>
              <Text style={styles.labelBold}>Contract Date: </Text>
              {/* No underline on cover page */}
              <Text>{formatLocalDate(contractDate)}</Text>
            </Text>
          </View>

          <View style={styles.hr} />

          <Text style={styles.sectionTitle}>LEGAL SERVICE PROVIDER</Text>
          <View style={styles.labelRow}>
            <Text>
              <Text style={styles.labelBold}>Company Name: </Text>
              <Text>{contract.provider?.companyName || "—"}</Text>
            </Text>
          </View>
          <View style={styles.labelRow}>
            <Text>
              <Text style={styles.labelBold}>Business ID: </Text>
              <Text>{contract.provider?.businessId || "—"}</Text>
            </Text>
          </View>
          <View style={styles.labelRow}>
            <Text>
              <Text style={styles.labelBold}>Representative Name: </Text>
              <Text>{contract.provider?.contactName || "—"}</Text>
            </Text>
          </View>
          <View style={styles.labelRow}>
            <Text>
              <Text style={styles.labelBold}>Email: </Text>
              <Text>{contract.provider?.email || "—"}</Text>
            </Text>
          </View>
          <View style={styles.labelRow}>
            <Text>
              <Text style={styles.labelBold}>Telephone: </Text>
              <Text>{contract.provider?.phone || "—"}</Text>
            </Text>
          </View>

          <View style={styles.hr} />

          <Text style={styles.sectionTitle}>LEGAL SERVICE PURCHASER</Text>
          <View style={styles.labelRow}>
            <Text>
              <Text style={styles.labelBold}>Company Name: </Text>
              <Text>
                {contract.purchaser?.companyName || companyName || "—"}
              </Text>
            </Text>
          </View>
          <View style={styles.labelRow}>
            <Text>
              <Text style={styles.labelBold}>Business ID: </Text>
              <Text>{contract.purchaser?.businessId || "—"}</Text>
            </Text>
          </View>
          <View style={styles.labelRow}>
            <Text>
              <Text style={styles.labelBold}>Representative Name: </Text>
              <Text>{contract.purchaser?.contactName || "—"}</Text>
            </Text>
          </View>
          <View style={styles.labelRow}>
            <Text>
              <Text style={styles.labelBold}>Email: </Text>
              <Text>{contract.purchaser?.email || "—"}</Text>
            </Text>
          </View>
          <View style={styles.labelRow}>
            <Text>
              <Text style={styles.labelBold}>Telephone: </Text>
              <Text>{contract.purchaser?.phone || "—"}</Text>
            </Text>
          </View>

          <Text style={styles.italicSmall}>
            The Legal Service Purchaser may also be referred to as "Client" in
            this contract.
          </Text>

          <View style={styles.hr} />

          <View style={styles.labelRow}>
            <Text>
              <Text style={styles.labelBold}>Contract Price (VAT 0%): </Text>
              <Text>
                {typeof contract.contractPrice === "number"
                  ? contract.contractPrice.toLocaleString()
                  : contract.contractPrice ?? "—"}{" "}
                {contract.contractPriceCurrency || ""}
              </Text>
            </Text>
          </View>
          <View style={styles.labelRow}>
            <Text>
              <Text style={styles.labelBold}>Contract Price Currency: </Text>
              <Text>{contract.contractPriceCurrency || "—"}</Text>
            </Text>
          </View>
          <View style={styles.labelRow}>
            <Text>
              <Text style={styles.labelBold}>Contract Price Type: </Text>
              <Text>{contract.contractPriceType || "—"}</Text>
            </Text>
          </View>

          <View style={styles.hr} />

          <Text style={styles.sectionTitle}>PURPOSE OF THE AGREEMENT</Text>
          <Text style={styles.paragraph}>
            This agreement for the provision of legal services (the "LEXIFY
            Contract") is entered into on the date specified above between the
            Legal Service Provider and Legal Service Purchaser (collectively,
            the "Parties").
          </Text>
          <Text style={styles.paragraph}>
            The Legal Service Provider agrees to provide legal services to the
            Legal Service Purchaser as detailed in this LEXIFY Contract, and the
            Legal Service Purchaser agrees to compensate the Legal Service
            Provider accordingly.
          </Text>

          <View style={styles.hr} />
        </View>

        {/* CONTRACT DOCUMENTS – on its own page to avoid clipping */}
        <View break>
          <Text style={styles.sectionTitle}>CONTRACT DOCUMENTS</Text>
          <Text style={styles.paragraph}>
            The following documents form the entire LEXIFY Contract (listed in
            order of precedence, with 1 having the highest priority in case of
            conflicts):
          </Text>
          <View style={styles.olList}>
            <Text style={styles.olItem}>
              1. This LEXIFY Contract Cover Page
            </Text>
            <Text style={styles.olItem}>
              2. The LEXIFY Request submitted by the Legal Service Purchaser on
              the LEXIFY platform (attached)
            </Text>
            <Text style={styles.olItem}>
              3. General Terms and Conditions for LEXIFY Contracts (attached)
            </Text>
            <Text style={styles.olItem}>
              4. The Supplier Code of Conduct and/or other procurement related
              requirements of the Legal Service Purchaser (attached, if
              applicable)
            </Text>
          </View>
          <Text style={styles.paragraph}>
            By having submitted the attached LEXIFY Request (Legal Service
            Purchaser) and by responding thereto with a binding offer (Legal
            Service Provider) on the LEXIFY platform, the Parties acknowledge
            that they have read, understood, and agreed to be bound by the terms
            and conditions contained in this LEXIFY Contract (including all its
            attachments).
          </Text>
          <Text style={[styles.paragraph, styles.italicSmall]}>
            This cover page forms an integral part of the LEXIFY Contract.
          </Text>

          <View style={styles.hr} />
        </View>

        {/* Section 2: The LEXIFY Request */}
        <View break>
          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
            2. The LEXIFY Request
          </Text>

          {!previewDef ? (
            <View style={[styles.cardBody, styles.card]}>
              <Text>No matching preview definition found.</Text>
            </View>
          ) : (
            <View>
              {(previewDef.preview?.sections || [])
                .filter((section) => !looksLikeProviderReqSection(section))
                .map((section, si) => {
                  const fields = Array.isArray(section.fields)
                    ? section.fields.filter((f) => !shouldHideField(f))
                    : null;
                  if (Array.isArray(section.fields) && fields.length === 0)
                    return null;

                  return (
                    <View key={si} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardHeaderText}>
                          {section.title}
                        </Text>
                      </View>

                      {Array.isArray(fields) ? (
                        <View style={styles.cardBody}>
                          {fields.map((f, fi) => {
                            const label = f.label || "—";
                            let raw = resolvePath(
                              contract.request,
                              f.path,
                              companyName
                            );
                            let display = renderValueForPdf(raw, f.path);

                            if (display === "—") {
                              const byLabel = resolveByLabel(
                                contract.request,
                                label
                              );
                              if (byLabel !== undefined) {
                                raw = byLabel;
                                display = renderValueForPdf(raw, f.path);
                              }
                            }

                            return (
                              <View key={fi} style={styles.tableRow}>
                                <View style={styles.tableCellLabel}>
                                  <Text>{label}</Text>
                                </View>
                                <View style={styles.tableCellValue}>
                                  <Text>{display}</Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ) : section.value ? (
                        <View style={styles.cardBody}>
                          <Text>
                            {renderValueForPdf(
                              resolvePath(
                                contract.request,
                                section.value,
                                companyName
                              ),
                              section.value
                            )}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.cardBody}>
                          <Text style={styles.smallMuted}>—</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
            </View>
          )}
        </View>
      </Page>

      {/* Section 3: GTCs - New page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>General Terms and Conditions</Text>
        </View>

        <Text style={styles.sectionTitle}>
          3. General Terms and Conditions for LEXIFY Contracts
        </Text>
        <View style={styles.hrTeal} />
        <Text style={styles.paragraph}>Last Updated: October 2025</Text>
        <View style={styles.hrTeal} />

        <Text style={styles.paragraph}>
          These General Terms and Conditions for LEXIFY Contracts (the “LEXIFY
          Contract GTCs”) are applied to all contracts regarding the provision
          of legal services (each such contract “LEXIFY Contract”) entered into
          between a legal service provider (“LSP”) and a legal service user
          (“LSU”) on the LEXIFY platform. These LEXIFY Contract GTCs form an
          integral part of all LEXIFY Contracts. Unless otherwise specifically
          stated herein, the defined terms used in these LEXIFY Contract GTCs
          have the same meaning as set forth in the LEXIFY Terms of Service, as
          amended from time to time.
        </Text>

        <Text style={[styles.paragraph, { marginTop: 8 }]}>
          <Text style={styles.labelBold}>1. Scope of Services</Text>
        </Text>
        <Text style={styles.paragraph}>
          The legal services to be provided by the LSP to the LSU under the
          LEXIFY Contract are set out in the corresponding LEXIFY Request,
          included as appendix to the LEXIFY Contract.
          <br />
          Any legal advice provided by the LSP under the LEXIFY Contract may
          not, unless otherwise indicated by the LSP, be relied on in any other
          engagement or used for any purpose other than that for which it was
          given under the LEXIFY Contract. Personnel of the LSP providing the
          legal services under the LEXIFY Contract are qualified to give advice
          for the jurisdiction in which they are authorized to practice law and
          do not provide advice for any other jurisdiction, unless such advice
          has specifically been requested in the relevant LEXIFY Request. The
          legal advice provided by the LSP under the LEXIFY Contract is based on
          the facts and the legal position at the time it is given.
          <br />
          The LSP warrants that it has the requisite professional expertise and
          experience in all areas of law relevant to the performance of the
          legal work as required in the LEXIFY Request. The LSP further warrants
          that it has not been subjected to bankruptcy proceedings, corporate
          restructuring or any other insolvency proceedings which might restrict
          or limit its competence or capability to provide the legal services as
          described in the LEXIFY Contract.
        </Text>

        <Text style={[styles.paragraph, { marginTop: 8 }]}>
          <Text style={styles.labelBold}>2. LSP CONTACT PERSON & TEAM</Text>
        </Text>
        <Text style={styles.paragraph}>
          A partner or other contact person is designated by the LSP to be
          responsible for the work to be conducted by the LSP under the LEXIFY
          Contract and to act as the point of contact toward the LSU. The LSP is
          responsible for assigning a team suitable and competent to provide the
          resources and expertise required for the legal service under the
          LEXIFY Contract. The LSP is entitled to make changes to the
          composition of the team during the assignment, if necessary. The
          LEXIFY Contract is entered into by the LSU with the LSP and not with
          any individual associated with or employed by the LSP
        </Text>

        <Text style={[styles.paragraph, { marginTop: 8 }]}>
          <Text style={styles.labelBold}>
            3. CLIENT IDENTIFICATION AND ANTI-MONEY LAUNDERING REQUIREMENTS
          </Text>
        </Text>
        <Text style={styles.paragraph}>
          The LSP has carried out a customary conflict check in accordance with
          applicable bar rules or other applicable professional rules (if any)
          prior to submitting its Offer. By entering into the LEXIFY Contract
          the LSP warrants that no conflict of interest preventing it from
          performing the work described in the LEXIFY Contract exists. The LSP
          shall reimburse the LSU for any and all damage suffered by the LSU as
          a result of the LSP submitting an Offer or entering into a LEXIFY
          Contract in breach of a conflict of interest which the LSP has
          identified, or should have identified, prior to making such Offer or
          entering into such LEXIFY Contract.
          <br />
          The LSP may be required by applicable law to verify the LSU and/or its
          representatives' identity and/or the LSU's ownership structure, as
          well as obtain information about the nature and purpose of the legal
          services covered by the LEXIFY Contract. In some cases, the LSP may
          also be required to verify the origin of the LSU's funds or other
          assets. The LSP may therefore request, if required by applicable
          General Terms and Conditions for LEXIFY Contracts Last Updated:
          October 2025 2 laws or regulations, evidence of the LSU and its
          representatives' identity, of the identity of any person involved on
          the LSU's behalf, and of persons who are the LSU's beneficial owners,
          as well as information and documentation evidencing the origin of the
          LSU's funds and other assets. The LSP may also be under obligation to
          verify such information from external sources. The LSU agrees to
          provide to the LSP any information referred to above and requested by
          the LSP without undue delay.
          <br />
          The LSP may be required by law to report suspicions of money
          laundering or financing of terrorism to the relevant government
          authorities. In such situations, the LSP may be prevented by law from
          informing the LSU of such suspicions or that a report has been, or
          will be, made.
          <br />
          Neither the LSP nor LEXIFY is liable for any loss or damage caused to
          the LSU as a consequence of the LSP's compliance with the
          aforementioned obligations applicable to the LSP as a legal service
          provider under applicable law.
        </Text>

        <Text style={[styles.paragraph, { marginTop: 8 }]}>
          <Text style={styles.labelBold}>
            4. COMMUNICATION BETWEEN LSP AND LSU; COOPERATION
          </Text>
        </Text>
        <Text style={styles.paragraph}>
          After entering into the LEXIFY Contract, the LSP and the LSU may
          communicate in a variety of ways, including via telephone and email.
          The LSP and the LSU must each always exercise due care and have in
          place adequate data security measures in accordance with prevailing
          industry standards to ensure secure communications. The LSP and the
          LSU may separately agree on additional data security measures, such as
          specific email encryption options. The LSP and the LSU acknowledge
          that customary data security measures such as spam filters and
          anti-virus programs may sometimes block or reject legitimate emails
          and therefore undertake to use reasonable efforts to confirm the
          delivery of any important emails, for example, by ensuring receipt of
          a response, or by other means of communication.
          <br />
          To enable the LSP to provide the LSU with the highest quality service
          under the LEXIFY Contract, the LSU undertakes to:
          <br />- provide the LSP, as appropriate in connection with the LEXIFY
          Request and thereafter, with adequate background information and
          documents necessary for the due performance of the legal work;
          <br />- respond without delay to the LSP's reasonable requests for
          additional information and instructions;
          <br />- provide the LSP with comprehensive, exact and accurate
          information regarding the matter during the performance of the LSP's
          legal work under the LEXIFY Contract; and
          <br />- inform the LSP without delay of any changes in circumstances
          relevant to the scope of legal services provided by the LSP under the
          LEXIFY Contract, or the matter at hand otherwise.
        </Text>

        <Text style={[styles.paragraph, { marginTop: 8 }]}>
          <Text style={styles.labelBold}>5. CONFIDENTIALITY</Text>
        </Text>
        <Text style={styles.paragraph}>
          The LSP and the LSU shall at all times keep their communications
          related to the LEXIFY Contract confidential. The LSP protects
          confidential information disclosed to the LSP in an appropriate manner
          and in accordance with statutory confidentiality obligations,
          applicable bar rules (if any) and customary industry practice.
          Regardless of whether the LSP's involvement in the assignment for the
          LSU has become publicly known (due to reasons not attributable to the
          LSP), The LSP may not disclose acting on behalf of the LSU and the
          LSP's involvement in such matter in any manner without the LSU's prior
          written consent, save to the extent as may be required by applicable
          mandatory law.
        </Text>

        <Text style={[styles.paragraph, { marginTop: 8 }]}>
          <Text style={styles.labelBold}>6. FEES AND EXPENSES</Text>
        </Text>
        <Text style={styles.paragraph}>
          The fee charged by the LSP for the services set out in the
          LEXIFYContract shall not exceed the amount set forth in the respective
          Offer submitted by the LSP, and the LSU shall not be obligated to pay
          any fee exceeding the amount set out in the Offer. Where the Offer has
          been provided by the LSP in the form of a lump sum fixed fee, The LSP
          acknowledges that as an experienced legal professional it has
          carefully considered the facts and specifications of the LEXIFY
          Request and provided its Offer with due consideration of the customary
          duration and requirements of such assignments, and with the
          understanding and acceptance that the amount of actual work required
          in such assignments may vary due to variables customary to such
          assignments, and that this does not entitle the LSP to revise its
          Offer later during the course of the assignment. 3 The parties
          acknowledge and accept that the LSP shall not be entitled to invoice,
          in addition to the fee set out in the Offer, additional charges or
          costs (such as postage, copying, telephone and similar expenses). The
          LSP shall be entitled to separately invoice solely the following cost
          items (if applicable):
          <br />
          i) travel time and travel expenses for any travel specifically
          requested by the LSU and not explicitly mentioned in the LEXIFY
          Request;
          <br />
          ii) applicable fees or charges levied by competent authorities in
          connection with the assignment (for example, registration fees related
          to filings with a competent business register where such filings are
          part of the assignment described in the relevant LEXIFY Request); and
          <br />
          iii) costs resulting from additional services explicitly requested by
          the LSU in writing and not originally included in the LEXIFY Request
          (for example fees charged by professional translators where the LSU
          later requests specific documentation to be translated).
          <br />
          The LSP shall add value added tax and other applicable taxes (if any)
          to its fee and charge such taxes where appropriate in accordance with
          applicable laws and regulations. For the avoidance of doubt, it is
          acknowledged that the Offer submitted by the LSP is exclusive of value
          added tax and other applicable tax (if any).
        </Text>
        <Text style={[styles.paragraph, { marginTop: 8 }]}>
          <Text style={styles.labelBold}>7. INVOICING AND PAYMENT</Text>
        </Text>
        <Text style={styles.paragraph}>
          The LSP shall invoice for its services in accordance with the terms
          and conditions of the LEXIFY Contract.
          <br />
          Payment of invoices is due within 30 days of the date of the invoice,
          unless otherwise separately agreed between the LSP and the LSU in
          writing. Interest is payable on overdue invoices in accordance with
          applicable law from the due date until the date of payment. If the
          LSP's invoice(s) remain unpaid after the due date, the LSP is also
          entitled to suspend all services to the LSU until the outstanding
          payment has been made in full.
        </Text>
        <Text style={[styles.paragraph, { marginTop: 8 }]}>
          <Text style={styles.labelBold}>8. DOCUMENT RETENTION</Text>
        </Text>
        <Text style={styles.paragraph}>
          Unless otherwise agreed between the LSP and the LSU or required by
          law, the LSP will keep (or store with a third party) relevant
          engagement-related material on file for ten years following the
          completion of an engagement (or termination of an engagement), after
          which the LSP may discard the material without separate notification.
          Expenses for copying costs and related administrative work may be
          charged by the LSP if copies are requested by the LSU at a later date
          after the assignment.
        </Text>
        <Text style={[styles.paragraph, { marginTop: 8 }]}>
          <Text style={styles.labelBold}>9. INTELLECTUAL PROPERTY RIGHTS</Text>
        </Text>
        <Text style={styles.paragraph}>
          The copyright and any other intellectual property rights in all work
          products that the LSP generates for the LSU vest in the LSP, although
          the LSU has the right to use such work products for the purpose for
          which they were provided.
        </Text>
        <Text style={[styles.paragraph, { marginTop: 8 }]}>
          <Text style={styles.labelBold}>10. DATA PROTECTION</Text>
        </Text>
        <Text style={styles.paragraph}>
          During the course of performing services for the LSU, the LSP will
          process certain personal data as a "controller" (as defined in the EU
          General Data Protection Regulation), such as contact details relating
          to the LSU's representatives (names, telephone numbers, email
          addresses, work-related addresses and/or other identification data)
          for identity verification and relationship management purposes. The
          LSP may also process other types of personal data relating to the LSU
          and its counterparties' (if any) representatives that is necessary to
          enable the LSP to perform the legal work and to fulfill the LSP's
          obligations under the LEXIFY Contract and applicable anti-money
          laundering and other laws. The LSU may consult the LSP directly for
          further information on the LSP's data protection practices.
        </Text>
        <Text style={[styles.paragraph, { marginTop: 8 }]}>
          <Text style={styles.labelBold}>11. COMPLAINTS BY LSU</Text>
        </Text>
        <Text style={styles.paragraph}>
          If, for any reason, the LSU is dissatisfied or has a complaint
          regarding the service by the LSP, the LSU shall notify the LSP's
          responsible partner or other contact person in charge of the specific
          matter. Such notice must be given within a reasonable time, and in any
          event no later than 30 days after the date the LSU became aware, or
          should have become aware upon reasonable investigation, of the grounds
          for the complaint. The LSP will investigate any complaint received
          promptly and inform the LSU of planned corrective measures without
          undue delay. 4 If the LSU brings a claim against the LSP based on a
          claim made against the LSU by a third party or any public authority,
          the LSP will be entitled to defend and settle such claim on the LSU's
          behalf, provided i) the LSP keeps the LSU continuously informed of
          such claim proceedings and seeks the LSU's prior written approval for
          any material decision (for example, the key terms of a settlement)
          regarding such claim proceedings and ii) the LSU is indemnified in
          full by the LSP. If the LSU is to be reimbursed by the LSP for any
          such claim, the reimbursement will only be made if the LSU transfers
          the right of recourse against third parties by way of subrogation or
          assignment to the LSP or to its insurers.
        </Text>
        <Text style={[styles.paragraph, { marginTop: 8 }]}>
          <Text style={styles.labelBold}>12. LIMITATION OF LIABILITY</Text>
        </Text>
        <Text style={styles.paragraph}>
          Save as may be required by mandatory provisions of applicable law, the
          LSP's liability to the LSU under the LEXIFY Contract is limited to
          pure economic loss caused to the LSU as consequence of an error or
          negligence on the LSP's part in performing its work and is also
          limited in amount to three times the fee charged during the course of
          the engagement under the LEXIFY Contract or 200.000 (two hundred
          thousand) euros, whichever is higher. If loss suffered by the LSU is
          attributable to the willful misconduct or gross negligence of the LSP,
          no limitations of liability shall apply.
          <br />
          The LSP assumes no liability to any third party through the use by the
          LSU of documents or other advice produced or provided by the LSP.
          Notwithstanding the above, if at the LSU's request the LSP in its sole
          discretion agrees that a third party may rely on a document produced
          by the LSP or on advice provided by the LSP, this will not increase or
          otherwise affect the LSP's liability, and the LSP will only be liable
          to such third party to the extent the LSP would be liable to the LSU.
          Any amount paid to a third party as a result of such liability will
          reduce the LSP's liability to the LSU correspondingly and vice versa.
          If the LSP agrees that a third party may rely on a document produced
          by the LSP or on advice provided by the LSP, no attorney-client
          relationship will arise between the LSP and such third party.
          <br />
          The LSP assumes no liability for any delay in service where such delay
          is attributable to the LSU or any party acting on behalf of the LSU.
          <br />
          Neither the LSP nor the LSU shall be liable for any delay or failure
          to perform its obligations under the LEXIFY Contract if such delay or
          failure results from circumstances beyond the non-performing party's
          reasonable control, including but not limited to acts of God, natural
          disasters, pandemic, epidemic, war, terrorism, riots, civil unrest,
          government actions, strikes, power failures, or telecommunications
          disruptions (&quot;Force Majeure Event&quot;). The affected party
          shall notify the other party of such Force Majeure Event as soon as
          reasonably possible. If a Force Majeure Event continues for more than
          90 consecutive days, either party may terminate the LEXIFY Contract
          with written notice to the other Party without penalty.
          <br />
          The LSP shall at all times maintain a liability insurance in
          accordance with industry standards and issued by a reputable insurance
          company.
          <br />
          The LSP and the LSU acknowledge that LEXIFY is not a contractual party
          to the LEXIFY Contract. The LSP and the LSU undertake to refrain from
          making any claims of whatsoever kind against LEXIFY in relation to the
          performance of the other party under the LEXIFY Contract.
        </Text>
        <Text style={[styles.paragraph, { marginTop: 8 }]}>
          <Text style={styles.labelBold}>13. WORK OF OTHER ADVISORS</Text>
        </Text>
        <Text style={styles.paragraph}>
          The LSP may, upon request of the LSU, identify and instruct other
          advisors for a particular engagement on the LSU's behalf. If the LSP
          instructs, engages and/or works together with other advisors, any such
          advisors will be considered independent of the LSP and the LSP assumes
          no responsibility or liability for recommending them to the LSU or for
          the advice given by them. The LSP does not assume responsibility for
          any quotes, estimates or fees charged by such advisors, and such fees
          are not included in the price set out in the Offer. Any authority to
          instruct advisors on the LSU's behalf includes authority to accept a
          reasonable limitation of liability on the LSU's behalf.
        </Text>
        <Text style={[styles.paragraph, { marginTop: 8 }]}>
          <Text style={styles.labelBold}>
            14. TERMINATION OF LEXIFY CONTRACT
          </Text>
        </Text>
        <Text style={styles.paragraph}>
          The engagement under the LEXIFY Contract ends when the LSP has carried
          out the work described in the LEXIFY Contract. In the event of
          material changes in circumstances related to the assignment set out in
          the LEXIFY Contract (e.g. where an acquisition of a company is not
          completed due to unsuccessful negotiations between the seller and the
          buyer), the LEXIFY Contract and the engagement may be terminated at
          any time by written notice of the LSU, asking the LSP to cease further
          work in the matter. In such 5 case, the LSU shall compensate the LSP
          for services provided by the LSP under the LEXIFY Contract up to and
          including the date of the written notice. Where the Offer has been
          provided by the LSP in the form of a lump sum fixed fee, the fee
          payable by the LSU shall be a prorated part of the fixed fee,
          corresponding to the amount of work already performed by the LSP and
          remaining unpaid on the date of the written notice. Where the Offer
          has been provided by the LSP in the form of an hourly rate, the
          payment made by the LSU shall be an amount corresponding to the
          relevant hourly rate multiplied by the number of hours of work already
          performed by the LSP and remaining unpaid on the date of the written
          notice.
          <br />
          In the event the LSU refuses to disclose to the LSP information
          requested by the LSP in accordance with Section “Client Identification
          and Anti-Money Laundering Requirements” above, the LSP shall be
          entitled to terminate the LEXIFY Contract with immediate effect by
          written notice to the LSU. In the event of such termination, the LSU
          shall compensate the LSP for all reasonable costs incurred by the LSP
          as a result of the premature termination of the assignment.
          <br />
          In certain situations, applicable mandatory law or bar rules may set
          out circumstances that require the LSP to discontinue acting for the
          LSU. Where an engagement is terminated in this manner, unless
          prevented by applicable law, the LSP shall take reasonable measures to
          preserve the LSU's interests when discontinuing the engagement (this
          may include, for example, reimbursement of fees already paid by the
          LSU for services not yet rendered by the LSP).
          <br />
          Either party to the LEXIFY Contract may terminate the LEXIFY Contract
          at any time due to a material breach of the LEXIFY Contract by the
          other party. Prior to any such termination the non-breaching party
          shall always provide the breaching party with a reasonable opportunity
          to remedy the breach.
        </Text>
        <Text style={[styles.paragraph, { marginTop: 8 }]}>
          <Text style={styles.labelBold}>15. AMENDMENTS; NO WAIVER</Text>
        </Text>
        <Text style={styles.paragraph}>
          Any amendments to the LEXIFY Contract must be agreed in writing by the
          LSP and the LSU, and notified by the LSU by email to LEXIFY
          (support@lexify.online) within 48 hours of agreement. For the
          avoidance of doubt, it is acknowledged that any such amendment to the
          LEXIFY Contract shall not reduce any service fees payable to LEXIFY.
          <br />
          No consent to, or waiver of, a breach (whether express or implied) of
          the LEXIFY Contract by either the LSP or the LSU, as applicable, will
          constitute a consent to, waiver of, or relief of liability from any
          other, separate, or subsequent breach by either the LSP or the LSU of
          the LEXIFY Contract, as applicable.
        </Text>
        <Text style={[styles.paragraph, { marginTop: 8 }]}>
          <Text style={styles.labelBold}>
            16. GOVERNING LAWS AND REGULATIONS; DISPUTES
          </Text>
        </Text>
        <Text style={styles.paragraph}>
          The LSU acknowledges and accepts that the LSP may be required by law
          to adhere to the code of conduct and/or other applicable regulations
          of a competent bar association or corresponding professional
          associations (e.g. the Finnish Bar Association) when providing
          services to the LSU pursuant to a LEXIFY Contract.
          <br />
          The LEXIFY Contract is governed by and construed in accordance with
          the laws of the country of domicile of the LSU (excluding its choice
          of law rules). Any dispute, controversy or claim that may arise out of
          or in connection with the LEXIFY Contract or the breach, termination
          or invalidity thereof and which is not resolved within a reasonable
          time in amicable negotiations between the LSP and the LSU, will be
          finally settled in arbitration by a reputable arbitration tribunal of
          the country of domicile of the LSU. Arbitral proceedings and all
          information disclosed in the course of such proceedings, as well as
          any decision or award made or declared during the proceedings, shall
          be kept confidential and may not, in any form, be disclosed to a third
          party (except LEXIFY) without the express consent of both parties to
          the LEXIFY Contract. Notwithstanding the above, neither the LSU nor
          the LSP shall be prevented from disclosing such information to
          preserve its rights against the other or an insurance policy
          underwriter or if the LSU or the LSP is required to disclose
          information pursuant to mandatory law or stock exchange rules and
          regulations or similar. In addition and notwithstanding the above, the
          LSP is entitled to commence proceedings to recover any amount due to
          it in any court with jurisdiction over the LSU or any of the LSU's
          assets.
          <br />
          If the country of domicile of the LSU is Finland, any arbitration
          shall always take place in accordance with the Arbitration Rules of
          the Finland Chamber of Commerce.
        </Text>
      </Page>
    </Document>
  );
}

export default ContractDocument;
