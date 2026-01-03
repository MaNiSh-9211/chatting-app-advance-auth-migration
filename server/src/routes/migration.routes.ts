import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
    initiateMigration,
    verifyCurrentEmail,
    verifyNewEmail,
    resendMigrationEmails,
    getMigrationStatus,
    getMigrationHistory,
    finalizeMigration
} from '../controllers/migration.controller';

const router = Router();

// 1. Init (Requires Login) - Sends both emails
router.post('/init', authenticate, initiateMigration);

// 2. Verify Current Email (Public/Token based)
router.post('/verify-current', verifyCurrentEmail);

// 3. Verify New Email (Public/Token based)
router.post('/verify-new', verifyNewEmail);

// 4. Resend Migration Emails (Requires Login)
router.post('/resend', authenticate, resendMigrationEmails);

// 5. Get Migration Status (Requires Login)
router.get('/status', authenticate, getMigrationStatus);

// 6. Get Migration History (Requires Login)
router.get('/history', authenticate, getMigrationHistory);

// 7. Manual Finalize Migration (Requires Login) - For cases where auto-finalization didn't trigger
router.post('/finalize', authenticate, finalizeMigration);

export default router;
