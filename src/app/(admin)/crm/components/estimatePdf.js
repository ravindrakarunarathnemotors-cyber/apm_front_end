import Swal from "sweetalert2";

// Shared by the estimate documents: save an HTML document as a PDF file straight away, or open it in a window with the print dialog.
// The PDF libraries (html2canvas + jsPDF) are loaded only when the first PDF is downloaded.
const loadScript = (src, ready) => new Promise((resolve, reject) => {
  if (ready()) return resolve();
  const el = document.createElement("script");
  el.src = src;
  el.onload = () => (ready() ? resolve() : reject(new Error(`${src} missing`)));
  el.onerror = () => reject(new Error(`${src} failed to load`));
  document.head.appendChild(el);
});
const loadPdfLibs = async () => {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js", () => typeof window.html2canvas === "function");
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", () => Boolean(window.jspdf?.jsPDF));
};

// appended to the document when it is opened for printing
export const PRINT_SCRIPT = "<script>(function(){var done=false;function go(){if(done)return;done=true;window.print()}var im=document.images[0];if(!im||im.complete){setTimeout(go,150)}else{im.onload=go;im.onerror=go;setTimeout(go,2500)}})();<\/script>";

// html = a full document WITHOUT the print script. Saved as <base>.pdf; if the PDF tools cannot load it is saved as <base>.html instead.
export async function savePdf(html, base) {
  let holder;
  try {
    await loadPdfLibs();
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const css = (parsed.querySelector("style")?.textContent || "")
      .replace(/@page\s*\{[^}]*\}/g, "")
      .replace(/@media\s+print\s*\{[^{}]*\{[^}]*\}\s*\}/g, "")
      .replace(/([^{}]+)\{([^{}]*)\}/g, (_, sel, body) => `${sel.split(",").map((x) => {
        const t = x.trim();
        if (t === ":root" || t === "body" || t === "html") return "#estdoc";
        if (t === "*") return "#estdoc, #estdoc *";
        return `#estdoc ${t}`;
      }).join(",")}{${body}}`);
    // behind the app (z-index -1) at the top-left corner so the browser lays it out normally
    holder = document.createElement("div");
    holder.style.cssText = "position:absolute;left:0;top:0;width:794px;background:#fff;z-index:-1;pointer-events:none";
    holder.innerHTML = `<div id="estdoc" style="width:794px;background:#fff"><style>${css}</style>${parsed.body.innerHTML}</div>`;
    document.body.appendChild(holder);
    const root = holder.querySelector("#estdoc");
    // The logo is turned into an embedded picture first: html2canvas drops images from another address (the storage server) that do not send CORS headers.
    // If that fails the company logo of this site (/images/mainlogo.jpeg) is used, and the picture is hidden only when that fails too.
    const toDataUrl = async (src) => {
      const res = await fetch(src, { mode: "cors", cache: "force-cache" });
      if (!res.ok) throw new Error(`image ${res.status}`);
      const blob = await res.blob();
      return await new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.onerror = reject; fr.readAsDataURL(blob); });
    };
    await Promise.all([...root.querySelectorAll("img")].map(async (im) => {
      const src = im.getAttribute("src") || "";
      if (!src || src.startsWith("data:")) return;
      try { im.src = await toDataUrl(src); }
      catch (_) {
        try { im.src = await toDataUrl(`${window.location.origin}/images/mainlogo.jpeg`); }
        catch (__) { im.style.display = "none"; }
      }
    }));
    await Promise.all([...root.querySelectorAll("img")].map((im) => (im.complete ? null : new Promise((r) => { im.onload = r; im.onerror = r; setTimeout(r, 3000); }))));
    const canvas = await window.html2canvas(root, { scale: 2, useCORS: true, backgroundColor: "#ffffff", width: 794, windowWidth: 794, scrollX: 0, scrollY: 0, x: 0, y: 0 });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const M = 8, pageW = 210 - M * 2, pageH = 297 - M * 2;
    const slicePx = Math.floor((pageH / pageW) * canvas.width); // canvas pixels that fit on one page
    for (let y = 0, n = 0; y < canvas.height; y += slicePx, n++) {
      const h = Math.min(slicePx, canvas.height - y);
      const part = document.createElement("canvas");
      part.width = canvas.width; part.height = h;
      part.getContext("2d").drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      if (n > 0) pdf.addPage();
      pdf.addImage(part.toDataURL("image/jpeg", 0.98), "JPEG", M, M, pageW, (h / canvas.width) * pageW);
    }
    pdf.save(`${base}.pdf`);
  } catch (_) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = `${base}.html`; document.body.appendChild(a); a.click(); a.remove();
    Swal.fire({ title: "Saved as a web page", text: "The PDF tool could not be loaded, so the estimate was saved as an .html file. Open it and use Print > Save as PDF.", icon: "info" });
  } finally { holder?.remove(); }
}

// html = a full document WITHOUT the print script: opens a new window and the print dialog
export function printHtml(html) {
  const w = window.open("", "_blank");
  if (!w) return Swal.fire({ title: "Pop-up blocked", text: "Allow pop-ups to print the estimate.", icon: "info" });
  w.document.open(); w.document.write(html.replace("</body>", `${PRINT_SCRIPT}</body>`)); w.document.close();
  return null;
}