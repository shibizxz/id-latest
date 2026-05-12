const TEMPLATE_WIDTH = 673;
const TEMPLATE_HEIGHT = 1063;
const FONT_FAMILY = "Poppins, Arial, sans-serif";
const PRINT_POINT_SCALE = 3.52;

function pt(value) {
  return Math.round(value * PRINT_POINT_SCALE);
}

const templates = {
  template1: {
    name: "Arafa English School",
    image: "/assets/templates/template-1.bmp",
    password: "arafa123",
    options: { bloodGroup: false },
    photo: { x: 163, y: 308, w: 346, h: 346, radius: 173 },
    fields: {
      studentName: { x: 78, y: 664, w: 518, size: pt(10), weight: 800, align: "center", color: "#ffffff", transform: "upper" },
      studentClass: { x: 102, y: 716, w: 130, size: pt(7), weight: 700, align: "center", color: "#ffffff" },
      admissionNo: { x: 246, y: 716, w: 290, size: pt(7), weight: 700, color: "#ffffff", prefix: "Adm. No: " },
      dob: { x: 180, y: 749, w: 315, size: pt(7), weight: 700, align: "center", color: "#ffffff", prefix: "DOB: " },
      guardianName: { x: 104, y: 773, w: 455, size: pt(8), weight: 600, color: "#ffffff" },
      houseName: { x: 104, y: 834, w: 455, size: pt(8), weight: 600, color: "#ffffff", lines: 2, lineHeight: 1.14 },
      place: { x: 104, y: 921, w: 455, size: pt(8), weight: 600, color: "#ffffff" },
      phone: { x: 104, y: 995, w: 455, size: pt(8), weight: 600, color: "#ffffff" }
    }
  },
  template2: {
    name: "G H S S Cheruthuruthy",
    image: "/assets/templates/template-2.bmp",
    password: "cheru123",
    options: { bloodGroup: false },
    photo: { x: 157, y: 244, w: 379, h: 374, radius: 187 },
    fields: {
      studentName: { x: 96, y: 648, w: 500, size: pt(12), weight: 800, align: "center", color: "#000000", transform: "upper" },
      studentClass: { x: 104, y: 695, w: 130, size: pt(7), weight: 700, align: "center", color: "#000000" },
      admissionNo: { x: 248, y: 695, w: 290, size: pt(7), weight: 700, color: "#000000", prefix: "Adm. No: " },
      dob: { x: 180, y: 728, w: 315, size: pt(7), weight: 700, align: "center", color: "#000000", prefix: "DOB: " },
      guardianName: { x: 144, y: 807, w: 420, size: pt(8), weight: 600, color: "#000000" },
      houseName: { x: 144, y: 860, w: 420, size: pt(8), weight: 600, color: "#000000", lines: 2, lineHeight: 1.14 },
      place: { x: 144, y: 945, w: 420, size: pt(8), weight: 600, color: "#000000" },
      phone: { x: 144, y: 1009, w: 420, size: pt(8), weight: 600, color: "#000000" }
    }
  }
};

const state = {
  templateKey: "template1",
  cardId: makeCardId(),
  unlockedSchools: new Set(),
  croppedPhoto: "",
  cropImage: null,
  crop: { zoom: 1, offsetX: 0, offsetY: 0, dragging: false, startX: 0, startY: 0 }
};

const form = document.getElementById("studentForm");
const message = document.getElementById("message");
const cardPreview = document.getElementById("cardPreview");
const templateBg = document.getElementById("templateBg");
const photoLayer = document.getElementById("photoLayer");
const editableLayer = document.getElementById("editableLayer");
const schoolLock = document.getElementById("schoolLock");
const schoolPassword = document.getElementById("schoolPassword");
const unlockSchoolBtn = document.getElementById("unlockSchoolBtn");
const cropDialog = document.getElementById("cropDialog");
const cropCanvas = document.getElementById("cropCanvas");
const cropCtx = cropCanvas.getContext("2d");
const zoomRange = document.getElementById("zoomRange");
const cropShape = document.getElementById("cropShape");

const inputs = {
  templateKey: document.getElementById("templateKey"),
  studentName: document.getElementById("studentName"),
  admissionNo: document.getElementById("admissionNo"),
  studentClass: document.getElementById("studentClass"),
  division: document.getElementById("division"),
  bloodGroup: document.getElementById("bloodGroup"),
  dob: document.getElementById("dob"),
  guardianName: document.getElementById("guardianName"),
  houseName: document.getElementById("houseName"),
  place: document.getElementById("place"),
  phone: document.getElementById("phone")
};

function makeCardId() {
  return `ID-${Math.floor(1000 + Math.random() * 9000)}`;
}

function titleCase(value) {
  return value.toLowerCase().replace(/\b[a-z]/g, char => char.toUpperCase());
}

function getFormData() {
  const phoneDigits = inputs.phone.value.replace(/\D/g, "").slice(0, 10);
  return {
    studentName: titleCase(inputs.studentName.value),
    admissionNo: inputs.admissionNo.value.trim().replace(/[^a-z0-9/-]/gi, ""),
    studentClass: inputs.studentClass.value,
    division: inputs.division.value,
    bloodGroup: inputs.bloodGroup.value,
    dob: inputs.dob.value,
    guardianName: titleCase(inputs.guardianName.value),
    houseName: inputs.houseName.value,
    place: titleCase(inputs.place.value),
    phone: phoneDigits ? `+91 ${phoneDigits}` : "",
    rawPhone: phoneDigits,
    cardId: state.cardId
  };
}

function displayDob(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

function fieldValue(key, data) {
  if (key === "dob") return displayDob(data.dob);
  if (key === "studentClass") return [data.studentClass, data.division].filter(Boolean).join(" ");
  return data[key] || "";
}

function applyTemplate() {
  const template = templates[state.templateKey];
  const scale = getPreviewScale();
  renderEditableHtml(template);
  applyTemplateOptions(template);
  applySchoolLock();
  templateBg.src = template.image;
  const scalePhoto = template.photo;
  photoLayer.style.left = percent(scalePhoto.x, TEMPLATE_WIDTH);
  photoLayer.style.top = percent(scalePhoto.y, TEMPLATE_HEIGHT);
  photoLayer.style.width = percent(scalePhoto.w, TEMPLATE_WIDTH);
  photoLayer.style.height = percent(scalePhoto.h, TEMPLATE_HEIGHT);
  photoLayer.style.borderRadius = scalePhoto.radius ? "50%" : "0";
  photoLayer.style.display = state.croppedPhoto ? "block" : "none";
  photoLayer.src = state.croppedPhoto;

  for (const [key, config] of Object.entries(template.fields)) {
    const node = editableLayer.querySelector(`[data-field="${key}"]`);
    if (!node) continue;
    node.style.left = percent(config.x, TEMPLATE_WIDTH);
    node.style.top = percent(config.y, TEMPLATE_HEIGHT);
    node.style.width = percent(config.w, TEMPLATE_WIDTH);
    node.style.height = `${Math.ceil((config.coverHeight || config.size * (config.lines || 1) * (config.lineHeight || 1.35)) * scale)}px`;
    node.style.fontSize = `${Math.max(8, config.size * scale)}px`;
    node.style.lineHeight = config.lineHeight || 1.08;
    node.style.color = config.color;
    node.style.fontWeight = config.weight || 700;
    node.style.background = "transparent";
    node.style.whiteSpace = config.lines && config.lines > 1 ? "normal" : "nowrap";
    node.style.overflowWrap = config.lines && config.lines > 1 ? "break-word" : "normal";
    node.style.transform = config.rotate ? `rotate(${config.rotate}deg)` : "";
    node.style.transformOrigin = "left top";
    node.style.textAlign = config.align || "left";
  }
  renderPreview();
}

function applyTemplateOptions(template) {
  document.querySelectorAll("[data-template-option]").forEach(node => {
    const option = node.dataset.templateOption;
    node.classList.toggle("is-hidden", template.options && template.options[option] === false);
  });
}

function renderEditableHtml(template) {
  const html = Object.keys(template.fields)
    .map(key => `<span class="card-text card-field-${key}" data-field="${key}"></span>`)
    .join("");

  if (editableLayer.dataset.templateKey !== state.templateKey || editableLayer.innerHTML !== html) {
    editableLayer.dataset.templateKey = state.templateKey;
    editableLayer.innerHTML = html;
  }
}

function percent(value, total) {
  return `${(value / total) * 100}%`;
}

function getPreviewScale() {
  return (cardPreview.clientWidth || TEMPLATE_WIDTH) / TEMPLATE_WIDTH;
}

function renderPreview() {
  const data = getFormData();
  inputs.studentName.value = data.studentName;
  inputs.guardianName.value = data.guardianName;
  inputs.houseName.value = data.houseName;
  inputs.place.value = data.place;
  inputs.phone.value = data.rawPhone;
  inputs.admissionNo.value = data.admissionNo;

  const template = templates[state.templateKey];
  for (const [key, config] of Object.entries(template.fields)) {
    const node = editableLayer.querySelector(`[data-field="${key}"]`);
    if (!node) continue;
    const value = fieldValue(key, getFormData());
    node.textContent = formatTemplateText(value, config);
  }
}

function formatTemplateText(value, config) {
  if (!value) return "";
  let text = String(value);
  if (config.transform === "upper") text = text.toUpperCase();
  return `${config.prefix || ""}${text}${config.suffix || ""}`;
}

function showMessage(text, ok = false) {
  message.textContent = text;
  message.classList.toggle("ok", ok);
}

function validateCardDetails() {
  const template = templates[state.templateKey];
  if (!isSchoolUnlocked()) return "Enter the school password to unlock this template.";

  const data = getFormData();
  const required = [
    ["studentName", "Student name"],
    ["admissionNo", "Admission no."],
    ["studentClass", "Class"],
    ["division", "Division"],
    ["dob", "Date of birth"],
    ["guardianName", "Guardian name"],
    ["houseName", "House name"],
    ["place", "Place"],
    ["phone", "Phone"]
  ];

  for (const [key, label] of required) {
    if (!String(data[key]).trim()) return `${label} is required.`;
  }
  if (!/^\d{10}$/.test(data.rawPhone)) return "Phone must be 10 digits after +91.";
  if (template.options && template.options.bloodGroup && !data.bloodGroup) return "Blood group is required.";
  if (!state.croppedPhoto) return "Photo is required.";
  return "";
}

function isSchoolUnlocked() {
  return state.unlockedSchools.has(state.templateKey);
}

function applySchoolLock() {
  const unlocked = isSchoolUnlocked();
  schoolLock.classList.toggle("is-unlocked", unlocked);
  schoolPassword.disabled = unlocked;
  unlockSchoolBtn.disabled = unlocked;
  unlockSchoolBtn.textContent = unlocked ? "Unlocked" : "Unlock";

  form.querySelectorAll("input, select, button").forEach(control => {
    if (control === inputs.templateKey || control === schoolPassword || control === unlockSchoolBtn) return;
    control.disabled = !unlocked;
  });
}

function unlockSelectedSchool() {
  const template = templates[state.templateKey];
  if (schoolPassword.value.trim() !== template.password) {
    showMessage("Wrong school password.");
    return;
  }
  state.unlockedSchools.add(state.templateKey);
  schoolPassword.value = "";
  showMessage("School template unlocked.", true);
  applySchoolLock();
}

function openCropper(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      state.cropImage = image;
      state.crop.zoom = Math.max(cropCanvas.width / image.width, cropCanvas.height / image.height);
      state.crop.offsetX = 0;
      state.crop.offsetY = 0;
      zoomRange.value = "1";
      cropShape.value = "circle";
      cropDialog.showModal();
      drawCrop();
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function drawCrop() {
  const image = state.cropImage;
  if (!image) return;
  cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  cropCtx.fillStyle = "#111827";
  cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
  const baseScale = Math.max(cropCanvas.width / image.width, cropCanvas.height / image.height);
  const scale = baseScale * Number(zoomRange.value);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (cropCanvas.width - width) / 2 + state.crop.offsetX;
  const y = (cropCanvas.height - height) / 2 + state.crop.offsetY;
  cropCtx.drawImage(image, x, y, width, height);
  drawCropGuide();
}

function drawCropGuide() {
  cropCtx.save();
  cropCtx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  cropCtx.lineWidth = 3;
  cropCtx.setLineDash([9, 7]);

  if (cropShape.value === "circle") {
    const radius = Math.min(cropCanvas.width, cropCanvas.height) * 0.44;
    const centerX = cropCanvas.width / 2;
    const centerY = cropCanvas.height / 2;

    cropCtx.fillStyle = "rgba(0, 0, 0, 0.34)";
    cropCtx.beginPath();
    cropCtx.rect(0, 0, cropCanvas.width, cropCanvas.height);
    cropCtx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
    cropCtx.fill("evenodd");

    cropCtx.beginPath();
    cropCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    cropCtx.stroke();
  } else {
    cropCtx.strokeRect(12, 12, cropCanvas.width - 24, cropCanvas.height - 24);
  }

  cropCtx.restore();
}

function applyCrop() {
  const image = state.cropImage;
  if (!image) return;
  const isCircle = cropShape.value === "circle";
  const output = document.createElement("canvas");
  output.width = isCircle ? 800 : 600;
  output.height = isCircle ? 800 : 800;
  const ctx = output.getContext("2d");
  const baseScale = Math.max(cropCanvas.width / image.width, cropCanvas.height / image.height);
  const scale = baseScale * Number(zoomRange.value);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (cropCanvas.width - width) / 2 + state.crop.offsetX;
  const y = (cropCanvas.height - height) / 2 + state.crop.offsetY;

  if (isCircle) {
    const sourceRadius = Math.min(cropCanvas.width, cropCanvas.height) * 0.44;
    const cropLeft = cropCanvas.width / 2 - sourceRadius;
    const cropTop = cropCanvas.height / 2 - sourceRadius;
    const factor = output.width / (sourceRadius * 2);
    ctx.save();
    ctx.beginPath();
    ctx.arc(output.width / 2, output.height / 2, output.width / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      image,
      (x - cropLeft) * factor,
      (y - cropTop) * factor,
      width * factor,
      height * factor
    );
    ctx.restore();
    state.croppedPhoto = output.toDataURL("image/png");
  } else {
    const factor = output.width / cropCanvas.width;
    ctx.drawImage(image, x * factor, y * factor, width * factor, height * factor);
    state.croppedPhoto = output.toDataURL("image/jpeg", 0.92);
  }
  photoLayer.src = state.croppedPhoto;
  photoLayer.style.display = "block";
  document.getElementById("photoStatus").textContent = "Selected";
  cropDialog.close();
  renderPreview();
}

async function renderCardCanvas() {
  renderPreview();
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  const canvas = document.createElement("canvas");
  canvas.width = TEMPLATE_WIDTH;
  canvas.height = TEMPLATE_HEIGHT;
  const ctx = canvas.getContext("2d");
  const template = templates[state.templateKey];
  const bg = await loadImage(template.image);
  ctx.drawImage(bg, 0, 0, TEMPLATE_WIDTH, TEMPLATE_HEIGHT);

  if (state.croppedPhoto) {
    const photo = await loadImage(state.croppedPhoto);
    const p = template.photo;
    ctx.save();
    if (p.radius) {
      ctx.beginPath();
      ctx.arc(p.x + p.w / 2, p.y + p.h / 2, Math.min(p.w, p.h) / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.drawImage(photo, p.x, p.y, p.w, p.h);
    ctx.restore();
  }

  const data = getFormData();
  for (const [key, config] of Object.entries(template.fields)) {
    const raw = fieldValue(key, data);
    const text = formatTemplateText(raw, config);
    drawFittedText(ctx, text, config);
  }

  return canvas;
}

function drawFittedText(ctx, text, config) {
  if (!text) return;
  let size = config.size;
  const cover = config.cover === false ? "" : config.cover || templates[state.templateKey].cover || "";
  if (cover) {
    ctx.fillStyle = cover;
    ctx.fillRect(config.x - 4, config.y - 3, config.w + 8, config.coverHeight || size * 1.35);
  }
  ctx.fillStyle = config.color;
  ctx.textBaseline = "top";
  ctx.font = `${config.weight || 700} ${size}px ${FONT_FAMILY}`;
  while (ctx.measureText(text).width > config.w && size > 12) {
    size -= 1;
    ctx.font = `${config.weight || 700} ${size}px ${FONT_FAMILY}`;
  }
  let x = config.x;
  if (config.align === "center") {
    x = config.x + (config.w - ctx.measureText(text).width) / 2;
  } else if (config.align === "right") {
    x = config.x + config.w - ctx.measureText(text).width;
  }
  if (config.rotate) {
    ctx.save();
    ctx.translate(config.x, config.y);
    ctx.rotate((config.rotate * Math.PI) / 180);
    const rotatedX = config.align === "center" ? (config.w - ctx.measureText(text).width) / 2 : 0;
    ctx.fillText(text, rotatedX, 0);
    ctx.restore();
    return;
  }
  if (config.lines && config.lines > 1) {
    drawWrappedText(ctx, text, config, size);
    return;
  }
  ctx.fillText(text, x, config.y);
}

function drawWrappedText(ctx, text, config, size) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= config.w || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === config.lines - 1) break;
    }
  }

  const usedWords = lines.join(" ").split(/\s+/).filter(Boolean).length;
  const remaining = words.slice(usedWords).join(" ");
  if (remaining || current) lines.push(remaining || current);

  const lineHeight = size * (config.lineHeight || 1.14);
  lines.slice(0, config.lines).forEach((line, index) => {
    let output = line;
    while (ctx.measureText(output).width > config.w && output.length > 1) {
      output = output.slice(0, -2).trimEnd();
    }
    if (index === config.lines - 1 && output !== line) output = `${output}…`;
    ctx.fillText(output, config.x, config.y + index * lineHeight);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load template image: ${src}`));
    image.src = src;
    if (image.decode) {
      image.decode().then(() => resolve(image)).catch(() => {});
    }
  });
}

async function createPdfBase64() {
  const canvas = await renderCardCanvas();
  const jpegBase64 = canvas.toDataURL("image/jpeg", 0.95).split(",")[1];
  const pdfBytes = buildImagePdf(jpegBase64, TEMPLATE_WIDTH, TEMPLATE_HEIGHT);
  return bytesToBase64(pdfBytes);
}

function buildImagePdf(jpegBase64, width, height) {
  const jpegBytes = base64ToBytes(jpegBase64);
  const objects = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  objects.push({ stream: jpegBytes, dict: `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>` });
  const content = asciiBytes(`q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`);
  objects.push({ stream: content, dict: `<< /Length ${content.length} >>` });

  const chunks = [asciiBytes("%PDF-1.4\n")];
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(totalLength(chunks));
    chunks.push(asciiBytes(`${i + 1} 0 obj\n`));
    if (typeof objects[i] === "string") {
      chunks.push(asciiBytes(`${objects[i]}\nendobj\n`));
    } else {
      chunks.push(asciiBytes(`${objects[i].dict}\nstream\n`));
      chunks.push(objects[i].stream);
      chunks.push(asciiBytes("\nendstream\nendobj\n"));
    }
  }
  const xrefOffset = totalLength(chunks);
  chunks.push(asciiBytes(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`));
  for (let i = 1; i < offsets.length; i += 1) {
    chunks.push(asciiBytes(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`));
  }
  chunks.push(asciiBytes(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
  return concatBytes(chunks);
}

function asciiBytes(text) {
  return new TextEncoder().encode(text);
}

function totalLength(chunks) {
  return chunks.reduce((sum, chunk) => sum + chunk.length, 0);
}

function concatBytes(chunks) {
  const output = new Uint8Array(totalLength(chunks));
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function downloadPdf() {
  try {
    const validationError = validateCardDetails();
    if (validationError) {
      showMessage(validationError);
      return;
    }
    showMessage("Generating PDF...", true);
    const pdfBase64 = await createPdfBase64();
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${pdfBase64}`;
    link.download = `${makePdfFileName()}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showMessage("PDF generated.", true);
  } catch (error) {
    showMessage(error.message || "PDF generation failed.");
  }
}

function makePdfFileName() {
  const data = getFormData();
  const schoolName = templates[state.templateKey].name;
  const classDivision = [data.studentClass, data.division].filter(Boolean).join("-");
  const parts = [schoolName, data.studentName, classDivision].filter(Boolean);
  return parts.join("-").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "student-id-card";
}

async function sendEmail() {
  try {
    const validationError = validateCardDetails();
    if (validationError) {
      showMessage(validationError);
      return;
    }

    showMessage("Generating and sending email...", true);
    const data = getFormData();
    const pdfBase64 = await createPdfBase64();
    const response = await fetch("/api/send-id-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pdfBase64,
        studentName: data.studentName,
        schoolName: templates[state.templateKey].name,
        classDivision: [data.studentClass, data.division].filter(Boolean).join(" "),
        fileName: `${makePdfFileName()}.pdf`
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || "Email sending failed.");
    }
    showMessage("Email sent successfully.", true);
  } catch (error) {
    showMessage(error.message || "Email sending failed.");
  }
}

for (const input of Object.values(inputs)) {
  const updateFromInput = () => {
    if (input === inputs.templateKey) {
      state.templateKey = input.value;
      schoolPassword.value = "";
      showMessage(isSchoolUnlocked() ? "School template unlocked." : "Enter the school password.");
    }
    applyTemplate();
  };
  input.addEventListener("input", updateFromInput);
  input.addEventListener("change", updateFromInput);
}

document.getElementById("photoInput").addEventListener("change", event => {
  const file = event.target.files[0];
  if (file) openCropper(file);
});

document.getElementById("applyCropBtn").addEventListener("click", applyCrop);
document.getElementById("cancelCropBtn").addEventListener("click", () => cropDialog.close());
document.getElementById("pdfBtn").addEventListener("click", downloadPdf);
document.getElementById("sendEmailBtn").addEventListener("click", sendEmail);
document.getElementById("printBtn").addEventListener("click", () => {
  const validationError = validateCardDetails();
  if (validationError) {
    showMessage(validationError);
    return;
  }
  window.print();
});
unlockSchoolBtn.addEventListener("click", unlockSelectedSchool);
schoolPassword.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    unlockSelectedSchool();
  }
});
zoomRange.addEventListener("input", drawCrop);
cropShape.addEventListener("change", drawCrop);
window.addEventListener("resize", applyTemplate);

cropCanvas.addEventListener("pointerdown", event => {
  state.crop.dragging = true;
  state.crop.startX = event.clientX - state.crop.offsetX;
  state.crop.startY = event.clientY - state.crop.offsetY;
  cropCanvas.setPointerCapture(event.pointerId);
});

cropCanvas.addEventListener("pointermove", event => {
  if (!state.crop.dragging) return;
  state.crop.offsetX = event.clientX - state.crop.startX;
  state.crop.offsetY = event.clientY - state.crop.startY;
  drawCrop();
});

cropCanvas.addEventListener("pointerup", () => {
  state.crop.dragging = false;
});

applyTemplate();
