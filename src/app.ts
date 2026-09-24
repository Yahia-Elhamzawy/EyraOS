import express from 'express';
import cors from 'cors';
import path from 'path';
import { CONFIG } from './config/env';
import { memoryRouter } from './routes/memory.routes';
import { chatRouter } from './routes/chat.routes';

export const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api', memoryRouter);
app.use('/api', chatRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'EyraOS Cognitive Memory Engine (TypeScript)',
        timestamp: new Date().toISOString()
    });
});
