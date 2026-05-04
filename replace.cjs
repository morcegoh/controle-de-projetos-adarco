const fs = require('fs');

const files = ['src/App.tsx', 'src/Login.tsx', 'src/Profile.tsx', 'src/Admin.tsx'];

const colorMap = {
  // Backgrounds
  "#F3F4F6": "var(--bg-app)",
  "#F0FDF4": "var(--bg-app)",
  "#FFF": "var(--bg-card)",
  "#FFFFFF": "var(--bg-card)",
  "#F8FAFC": "var(--table-header-bg)",
  "#F1F5F9": "var(--border-light)",
  // Texts
  "#002A15": "var(--text-main)",
  "#0F172A": "var(--text-main)",
  "#475569": "var(--text-secondary)",
  "#374151": "var(--text-secondary)",
  "#334155": "var(--text-secondary)",
  "#425A4B": "var(--text-secondary)",
  "#55735F": "var(--text-secondary)",
  "#4C6956": "var(--text-secondary)",
  "#64748B": "var(--text-muted)",
  "#7C9C88": "var(--text-muted)",
  // Borders
  "#E2E8F0": "var(--border)",
  "#D1D5DB": "var(--border)",
  // Primary
  "#10B981": "var(--primary)",
  "#006432": "var(--primary)",
  // Accents
  "#EF4444": "var(--danger)",
  "#FEE2E2": "var(--danger-bg)",
  "#F87171": "var(--danger)",
  "#991B1B": "var(--danger)",
  "#FEF2F2": "var(--danger-bg)",
  // RGBA replacements for text/border/glass
  "rgba(255,255,255,0.7)": "var(--glass-bg)",
  "rgba(255, 255, 255, 0.7)": "var(--glass-bg)",
  "rgba(255,255,255,0.8)": "var(--glass-bg)",
  "rgba(255, 255, 255, 0.8)": "var(--glass-bg)",
  "rgba(0,0,0,0.1)": "var(--glass-border)",
  "rgba(0, 0, 0, 0.1)": "var(--glass-border)",
  "rgba(0,0,0,0.05)": "var(--shadow)",
  "rgba(0, 0, 0, 0.05)": "var(--shadow)",
  "rgba(15, 23, 42, 0.4)": "var(--modal-overlay)",
};

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Exact replacements ignoring quote type by matching the hex/string directly
  for (const [key, value] of Object.entries(colorMap)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedKey, 'g');
    content = content.replace(regex, value);
  }
  
  fs.writeFileSync(file, content);
}
console.log('Colors replaced with CSS variables successfully.');
