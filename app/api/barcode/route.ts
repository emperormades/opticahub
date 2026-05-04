import { NextRequest, NextResponse } from "next/server";
import bwipjs from "bwip-js";

/**
 * GET /api/barcode?bcid=code128&text=SKU12345
 * Gera uma imagem de código de barras em tempo real.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text");
  const bcid = searchParams.get("bcid") || "code128";

  if (!text) {
    return new NextResponse("Text is required", { status: 400 });
  }

  try {
    const png = await bwipjs.toBuffer({
      bcid, // Barcode type
      text, // Text to encode
      scale: 3, // 3x scaling factor
      height: 10, // Bar height, in millimeters
      includetext: true, // Show human-readable text
      textxalign: "center", // Always good
    });

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[BARCODE] Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
