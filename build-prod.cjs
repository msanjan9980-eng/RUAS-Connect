const fs = require('fs');
const path = require('path');

// 1. Update server.js
const serverPath = path.join(__dirname, 'server.js');
let serverCode = fs.readFileSync(serverPath, 'utf8');
const serveLine = `
// --- Serve React Frontend ---
app.use(express.static(path.join(__dirname, 'client', 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});
// --------------------------
`;
if (!serverCode.includes('Serve React Frontend')) {
    serverCode = serverCode.replace('server.listen(PORT, () => {', `${serveLine}\nserver.listen(PORT, () => {`);
}
serverCode = serverCode.replace(/console\.log\(`Backend \(Persistent DB\) running on http:\/\/localhost:\$\{PORT\}`\);/, "console.log(`CampusLink Unified Server running on port ${PORT}`);");
fs.writeFileSync(serverPath, serverCode, 'utf8');
console.log('✅ server.js updated.');

// 2. Update App.jsx
const appPath = path.join(__dirname, 'client', 'src', 'App.jsx');
let appCode = fs.readFileSync(appPath, 'utf8');
appCode = appCode.replace("const socket = io('http://localhost:3000');", "const socket = io(import.meta.env.VITE_BACKEND_URL || window.location.origin);");
fs.writeFileSync(appPath, appCode, 'utf8');
console.log('✅ App.jsx updated.');