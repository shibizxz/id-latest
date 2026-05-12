const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const publicDir = path.join(root, "public");
const port = Number(process.env.PORT || 4173);
const defaultRecipientEmail = "shibizxz@gmail.com";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".bmp": "image/bmp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".pdf": "application/pdf"
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function handleSend(req, res) {
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
    const payload = JSON.parse(await readRequestBody(req));
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

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const fullPath = path.normalize(path.join(publicDir, requestedPath));

  if (!fullPath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(fullPath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const shouldCache = [".bmp", ".png", ".jpg", ".jpeg"].includes(ext);
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": shouldCache ? "public, max-age=3600" : "no-cache"
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/send-id-card")) {
    handleSend(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`Student ID portal running at http://localhost:${port}`);
});
