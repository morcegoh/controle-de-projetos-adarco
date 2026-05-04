const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// The DOM elements using styles.webInput
content = content.replace(/style=\{styles\.webInput\}/g, 'style={webInputDOMStyle}');

// textarea specific fixes
content = content.replace(/style=\{\{ \.\.\.\(styles\.webInput as object\), height: '100%', resize: 'none' \} as any\}/g, "style={{ ...webInputDOMStyle, height: '100%', resize: 'none' }}");

// select fixes for ConvertTask
content = content.replace(/style=\{\{ \.\.\.\(styles\.webInput as object\), flex: 1, marginBottom: 0, padding: 8 \} as any\}/g, "style={{ ...webInputDOMStyle, flex: 1, marginBottom: 0, padding: '8px' }}");

// newUpdateUser and newUpdateContent fixes
content = content.replace(/style=\{Object\.assign\(\{\}, styles\.webInput, \{ paddingVertical: 8, fontSize: 12 \}\)\}/g, "style={{ ...webInputDOMStyle, paddingTop: '8px', paddingBottom: '8px', fontSize: '12px' }}");

// The timeline dropdowns
content = content.replace(/style=\{\{\.\.\.styles\.webInput, marginBottom: 0, paddingVertical: 6, width: 'auto', backgroundColor: 'var\(--glass-bg\)', borderColor: 'var\(--glass-border\)'\} as any\}/g, "style={{ ...webInputDOMStyle, marginBottom: 0, paddingTop: '6px', paddingBottom: '6px', width: 'auto', backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}");

fs.writeFileSync('src/App.tsx', content);
