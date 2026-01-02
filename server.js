const express = require('express');
const { exec } = require('child_process');
const app = express();
const path = require('path');
const fs = require('fs');

// Get current directory info
console.log('Current directory:', __dirname);
console.log('Server starting from:', process.cwd());

// Check if public directory exists
const publicPath = path.join(__dirname, 'public');
console.log('Looking for public folder at:', publicPath);

if (fs.existsSync(publicPath)) {
    console.log('✅ Public folder found!');
    const files = fs.readdirSync(publicPath);
    console.log('Files in public folder:', files);
} else {
    console.log('❌ Public folder NOT found!');
}

// Middleware
app.use(express.static(publicPath));
app.use(express.json());

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!' });
});

// Command execution route
app.post('/run-command', (req, res) => {
    const { command } = req.body;

    const allowedCommands = ['ls', 'pwd', 'date', 'whoami', 'echo','node','cd'];
    const baseCommand = command.split(' ')[0];

    if (!allowedCommands.includes(baseCommand)) {
        return res.json({ output: `Error: Command "${baseCommand}" not allowed` });
    }

    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.json({ output: `Error: ${error.message}` });
        }
        res.json({ output: stdout || stderr });
    });
});

// Root route - serve index.html
app.get('/', (req, res) => {
    const indexFile = path.join(publicPath, 'index.html',corners.html);
    console.log('Trying to serve:', indexFile);

    if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
    } else {
        res.send(`
            <html>
                <body>
                    <h1>Index.html not found!</h1>
                    <p>Create a 'public' folder with index.html</p>
                    <p>Current dir: ${__dirname}</p>
                </body>
            </html>
        `);
    }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📂 Make sure you have:`);
    console.log(`   - public/index.html file`);
    console.log(`   - Correct folder structure\n`);
});
