const express = require('express');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.post('/api/build-app', async (req, res) => {
    const { appName, packageName, htmlCode } = req.body;

    if (!appName || !packageName || !htmlCode) {
        return res.status(400).json({ success: false, error: 'सभी फील्ड भरना अनिवार्य है!' });
    }

    const buildId = Date.now();
    const outputDir = path.join(__dirname, 'output');
    const projectDir = path.join(__dirname, 'temp', `project_${buildId}`);
    const zipFilePath = path.join(outputDir, `app_${buildId}.zip`);

    try {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.mkdirSync(projectDir, { recursive: true });

        fs.writeFileSync(path.join(projectDir, 'index.html'), htmlCode);
        fs.writeFileSync(path.join(projectDir, 'config.json'), JSON.stringify({
            appName,
            packageName,
            createdAt: new Date().toISOString()
        }, null, 2));

        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            const host = req.get('host');
            const protocol = req.protocol;
            return res.json({
                success: true,
                message: 'प्रोजेक्ट पैक हो गया है!',
                buildId: buildId,
                downloadUrl: `${protocol}://${host}/download/app_${buildId}.zip`
            });
        });

        archive.on('error', (err) => { throw err; });
        archive.pipe(output);
        archive.directory(projectDir, false);
        await archive.finalize();

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.use('/download', express.static(path.join(__dirname, 'output')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
