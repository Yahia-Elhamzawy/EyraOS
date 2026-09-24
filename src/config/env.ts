import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const CONFIG = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://eyra_user:eyra_secure_password_2026@192.168.100.4:5434/eyraos',
    DB_HOST: process.env.DB_HOST || '192.168.100.4',
    DB_PORT: parseInt(process.env.DB_PORT || '5434', 10),
    DB_USER: process.env.DB_USER || 'eyra_user',
    DB_PASSWORD: process.env.DB_PASSWORD || 'eyra_secure_password_2026',
    DB_NAME: process.env.DB_NAME || 'eyraos',
    PUBLIC_DIR: path.join(__dirname, '../../public')
};

if (!CONFIG.GEMINI_API_KEY) {
    console.warn('[EyraOS] WARNING: GEMINI_API_KEY is not defined in environment variables.');
}
