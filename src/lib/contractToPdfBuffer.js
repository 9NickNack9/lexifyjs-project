// src/lib/contractToPdfBuffer.js
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import ContractDocument from "@/emails/ContractDocument.jsx";

/**
 * Recursively convert BigInt values to numbers (or strings if too large)
 */
function convertBigInts(obj) {
  if (obj === null || obj === undefined) return obj;

  // Preserve Date instances exactly as they are
  if (obj instanceof Date) {
    return obj;
  }

  // Convert bigint → number (or string if too big)
  if (typeof obj === "bigint") {
    return obj <= Number.MAX_SAFE_INTEGER && obj >= Number.MIN_SAFE_INTEGER
      ? Number(obj)
      : obj.toString();
  }

  // Recurse arrays
  if (Array.isArray(obj)) {
    return obj.map(convertBigInts);
  }

  // Recurse plain objects
  if (typeof obj === "object") {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigInts(value);
    }
    return converted;
  }

  // Primitives (string, number, boolean, etc.)
  return obj;
}

/**
 * Build a PDF buffer from the ContractDocument React-PDF component.
 */
export async function contractToPdfBuffer({
  contract,
  companyName,
  previewDef,
}) {
  try {
    console.log("Starting PDF generation...");

    const cleanedContract = convertBigInts(contract);
    console.log("Contract data cleaned (BigInts converted)");

    const element = (
      <ContractDocument
        contract={cleanedContract}
        companyName={companyName}
        previewDef={previewDef}
      />
    );
    console.log("React element created successfully");

    // ✅ Use the Node API that returns a real Buffer
    const buffer = await renderToBuffer(element);
    console.log("Buffer generated, length:", buffer?.length ?? 0);

    if (!buffer || buffer.length === 0) {
      throw new Error(
        "contractToPdfBuffer: generated empty PDF buffer - check ContractDocument for rendering errors"
      );
    }

    return buffer;
  } catch (error) {
    console.error("Error in contractToPdfBuffer:", error);
    console.error("Error stack:", error.stack);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}
