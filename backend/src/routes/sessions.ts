import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest, requireDriver } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);
router.use(requireDriver);

// POST /api/sessions/start - Start a new tracking session
router.post('/start', async (req: AuthRequest, res: Response) => {
    try {
        const driverId = req.user!.userId;

        // Check for existing active or paused session
        const existingSession = await prisma.session.findFirst({
            where: {
                driverId,
                status: { in: ['active', 'paused'] },
            },
        });

        if (existingSession) {
            res.status(400).json({
                error: 'You already have an active session',
                session: existingSession,
            });
            return;
        }

        // Create new session
        const session = await prisma.session.create({
            data: {
                driverId,
                status: 'active',
                startTimeUtc: new Date(),
            },
        });

        // Update driver last seen status
        await prisma.driverLastSeen.upsert({
            where: { driverId },
            update: {
                status: 'tracking',
                sessionId: session.id,
            },
            create: {
                driverId,
                lastTsUtc: new Date(),
                lastLat: 0,
                lastLng: 0,
                status: 'tracking',
                sessionId: session.id,
            },
        });

        res.status(201).json({
            message: 'Session started',
            session,
        });
    } catch (error) {
        console.error('Start session error:', error);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

// POST /api/sessions/pause - Pause current session
router.post('/pause', async (req: AuthRequest, res: Response) => {
    try {
        const driverId = req.user!.userId;

        const session = await prisma.session.findFirst({
            where: {
                driverId,
                status: 'active',
            },
        });

        if (!session) {
            res.status(400).json({ error: 'No active session to pause' });
            return;
        }

        const updatedSession = await prisma.session.update({
            where: { id: session.id },
            data: { status: 'paused' },
        });

        // Update driver last seen status
        await prisma.driverLastSeen.update({
            where: { driverId },
            data: { status: 'paused' },
        });

        res.json({
            message: 'Session paused',
            session: updatedSession,
        });
    } catch (error) {
        console.error('Pause session error:', error);
        res.status(500).json({ error: 'Failed to pause session' });
    }
});

// POST /api/sessions/resume - Resume paused session
router.post('/resume', async (req: AuthRequest, res: Response) => {
    try {
        const driverId = req.user!.userId;

        const session = await prisma.session.findFirst({
            where: {
                driverId,
                status: 'paused',
            },
        });

        if (!session) {
            res.status(400).json({ error: 'No paused session to resume' });
            return;
        }

        const updatedSession = await prisma.session.update({
            where: { id: session.id },
            data: { status: 'active' },
        });

        // Update driver last seen status
        await prisma.driverLastSeen.update({
            where: { driverId },
            data: { status: 'tracking' },
        });

        res.json({
            message: 'Session resumed',
            session: updatedSession,
        });
    } catch (error) {
        console.error('Resume session error:', error);
        res.status(500).json({ error: 'Failed to resume session' });
    }
});

// POST /api/sessions/stop - Stop current session
router.post('/stop', async (req: AuthRequest, res: Response) => {
    try {
        const driverId = req.user!.userId;

        const session = await prisma.session.findFirst({
            where: {
                driverId,
                status: { in: ['active', 'paused'] },
            },
        });

        if (!session) {
            res.status(400).json({ error: 'No active session to stop' });
            return;
        }

        const updatedSession = await prisma.session.update({
            where: { id: session.id },
            data: {
                status: 'completed',
                endTimeUtc: new Date(),
            },
        });

        // Update driver last seen status
        await prisma.driverLastSeen.update({
            where: { driverId },
            data: {
                status: 'offline',
                sessionId: null,
            },
        });

        // Get session stats
        const pointCount = await prisma.locationPoint.count({
            where: { sessionId: session.id },
        });

        res.json({
            message: 'Session stopped',
            session: updatedSession,
            stats: {
                pointCount,
                duration: updatedSession.endTimeUtc && updatedSession.startTimeUtc
                    ? Math.round((updatedSession.endTimeUtc.getTime() - updatedSession.startTimeUtc.getTime()) / 1000)
                    : 0,
            },
        });
    } catch (error) {
        console.error('Stop session error:', error);
        res.status(500).json({ error: 'Failed to stop session' });
    }
});

// GET /api/sessions/current - Get current session
router.get('/current', async (req: AuthRequest, res: Response) => {
    try {
        const driverId = req.user!.userId;

        const session = await prisma.session.findFirst({
            where: {
                driverId,
                status: { in: ['active', 'paused'] },
            },
            include: {
                _count: {
                    select: { locationPoints: true },
                },
            },
        });

        if (!session) {
            res.json({ session: null });
            return;
        }

        // Get last location point
        const lastPoint = await prisma.locationPoint.findFirst({
            where: { sessionId: session.id },
            orderBy: { tsUtc: 'desc' },
        });

        res.json({
            session: {
                ...session,
                pointCount: session._count.locationPoints,
                lastPoint,
            },
        });
    } catch (error) {
        console.error('Get current session error:', error);
        res.status(500).json({ error: 'Failed to get session' });
    }
});

export default router;
