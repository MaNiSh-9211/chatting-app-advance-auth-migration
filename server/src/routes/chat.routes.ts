import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
    getOrCreatePersonalChat,
    createGroupChat,
    getUserChats,
    getChatById,
    sendMessage,
    getChatMessages,
    deleteMessage,
    reactToMessage,
} from '../controllers/chat.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Chat routes
router.post('/personal', getOrCreatePersonalChat);
router.post('/group', createGroupChat);
router.get('/list', getUserChats);
router.get('/:chatId', getChatById);

// Message routes
router.post('/:chatId/messages', sendMessage);
router.get('/:chatId/messages', getChatMessages);
router.delete('/messages/:messageId', deleteMessage);
router.post('/messages/:messageId/react', reactToMessage);

export default router;

