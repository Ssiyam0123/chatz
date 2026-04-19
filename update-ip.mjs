import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getLocalIP = () => {
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
};

const updateEnv = () => {
    const ip = getLocalIP();
    const envPath = path.join(__dirname, 'ChatApp', '.env');
    const envKey = 'EXPO_PUBLIC_API_URL';
    const envValue = `http://${ip}:5001`;

    try {
        let content = '';
        if (fs.existsSync(envPath)) {
            content = fs.readFileSync(envPath, 'utf8');
        }

        const lines = content.split('\n');
        let keyExists = false;

        const updatedLines = lines.map(line => {
            if (line.startsWith(`${envKey}=`)) {
                keyExists = true;
                return `${envKey}=${envValue}`;
            }
            return line;
        });

        if (!keyExists) {
            updatedLines.push(`${envKey}=${envValue}`);
        }

        fs.writeFileSync(envPath, updatedLines.join('\n').trim() + '\n');
        
        console.log('-------------------------------------------');
        console.log(`🚀 Network IP Detected: ${ip}`);
        console.log(`✅ ${envKey} updated in .env`);
        console.log('-------------------------------------------');
    } catch (err) {
        console.error('❌ Error updating .env file:', err.message);
    }
};

updateEnv();