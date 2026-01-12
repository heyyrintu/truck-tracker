import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Login validation
const loginValidation = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// POST /api/auth/login
router.post('/login', validate(loginValidation), async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);

        if (!isValidPassword) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Generate JWT
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            res.status(500).json({ error: 'Server configuration error' });
            return;
        }

        const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role,
                email: user.email,
            },
            secret,
            { expiresIn } as jwt.SignOptions
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// GET /api/auth/me - Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                phone: true,
                createdAt: true,
            },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Get active session if driver
        let activeSession = null;
        if (user.role === 'driver') {
            activeSession = await prisma.session.findFirst({
                where: {
                    driverId: user.id,
                    status: { in: ['active', 'paused'] },
                },
                orderBy: { startTimeUtc: 'desc' },
            });
        }

        res.json({
            user,
            activeSession,
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

export default router;
