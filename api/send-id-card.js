const defaultRecipientEmail = "shibizxz@gmail.com";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const recipientEmail = process.env.RESEND_TO_EMAIL || defaultRecipientEmail;

  if (!apiKey || !fromEmail) {
    sendJson(res, 500, {
      error: "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL."
    });
    return;
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const pdfBase64 = String(payload.pdfBase64 || "");
    const studentName = String(payload.studentName || "Student").trim();
    const schoolName = String(payload.schoolName || "School").trim();
    const classDivision = String(payload.classDivision || "").trim();
    const fileName = String(payload.fileName || "student-id-card.pdf").trim();

    if (!pdfBase64) {
      sendJson(res, 400, { error: "PDF is required." });
      return;
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "freak-king-id-card-portal"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject: `Student ID Card - ${studentName}`,
        html: `
          <p>Attached is the generated student ID card PDF.</p>
          <p><strong>School:</strong> ${escapeHtml(schoolName)}</p>
          <p><strong>Student:</strong> ${escapeHtml(studentName)}</p>
          ${classDivision ? `<p><strong>Class:</strong> ${escapeHtml(classDivision)}</p>` : ""}
        `,
        attachments: [
          {
            filename: safePdfFileName(fileName),
            content: pdfBase64
          }
        ]
      })
    });

    const resultText = await resendResponse.text();
    if (!resendResponse.ok) {
      sendJson(res, resendResponse.status, {
        error: "Resend rejected the email request.",
        detail: resultText
      });
      return;
    }

    sendJson(res, 200, { ok: true, detail: JSON.parse(resultText) });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
};

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function safePdfFileName(value) {
  const cleaned = value.replace(/[^a-z0-9_.-]/gi, "_").replace(/^_+|_+$/g, "");
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned || "student-id-card"}.pdf`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}
