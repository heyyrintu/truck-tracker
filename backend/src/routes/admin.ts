import { Router, Response } from 'express';
import { query, param } from 'express-validator';
import { prisma } from '../index';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Apply authentication and admin role to all routes
router.use(authenticate);
router.use(requireAdmin);

// GET /api/admin/drivers - List all drivers with last seen info
router.get('/drivers', async (req: AuthRequest, res: Response) => {
    try {
        const drivers = await prisma.user.findMany({
            where: { role: 'driver' },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                createdAt: true,
                lastSeen: {
                    select: {
                        lastTsUtc: true,
                        lastLat: true,
                        lastLng: true,
                        lastAccuracy: true,
                        status: true,
                        sessionId: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

        // Transform data for response
        const driversWithStatus = drivers.map(driver => ({
            id: driver.id,
            name: driver.name,
            email: driver.email,
            phone: driver.phone,
            createdAt: driver.createdAt,
            lastSeenTime: driver.lastSeen?.lastTsUtc || null,
            lastLocation: driver.lastSeen
                ? {
                    lat: driver.lastSeen.lastLat,
                    lng: driver.lastSeen.lastLng,
                    accuracy: driver.lastSeen.lastAccuracy,
                }
                : null,
            status: driver.lastSeen?.status || 'offline',
            activeSessionId: driver.lastSeen?.sessionId || null,
        }));

        res.json({ drivers: driversWithStatus });
    } catch (error) {
        console.error('Get drivers error:', error);
        res.status(500).json({ error: 'Failed to get drivers' });
    }
});

// GET /api/admin/drivers/:id - Get driver details
router.get(
    '/drivers/:id',
    validate([param('id').isUUID().withMessage('Valid driver ID required')]),
    async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;

            const driver = await prisma.user.findUnique({
                where: { id, role: 'driver' },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    createdAt: true,
                    lastSeen: true,
                    _count: {
                        select: {
                            sessions: true,
                            locationPoints: true,
                        },
                    },
                },
            });

            if (!driver) {
                res.status(404).json({ error: 'Driver not found' });
                return;
            }

            res.json({ driver });
        } catch (error) {
            console.error('Get driver error:', error);
            res.status(500).json({ error: 'Failed to get driver' });
        }
    }
);

// GET /api/admin/drivers/:id/sessions - Get driver sessions
router.get(
    '/drivers/:id/sessions',
    validate([
        param('id').isUUID().withMessage('Valid driver ID required'),
        query('from').optional().isISO8601().withMessage('Valid from date required'),
        query('to').optional().isISO8601().withMessage('Valid to date required'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
        query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { from, to, limit = '20', offset = '0' } = req.query;

            // Build where clause
            const where: any = { driverId: id };

            if (from || to) {
                where.startTimeUtc = {};
                if (from) where.startTimeUtc.gte = new Date(from as string);
                if (to) where.startTimeUtc.lte = new Date(to as string);
            }

            const [sessions, total] = await Promise.all([
                prisma.session.findMany({
                    where,
                    orderBy: { startTimeUtc: 'desc' },
                    take: parseInt(limit as string),
                    skip: parseInt(offset as string),
                    include: {
                        _count: {
                            select: { locationPoints: true },
                        },
                    },
                }),
                prisma.session.count({ where }),
            ]);

            // Calculate duration for each session
            const sessionsWithDuration = sessions.map(session => ({
                ...session,
                pointCount: session._count.locationPoints,
                durationSeconds: session.endTimeUtc
                    ? Math.round((session.endTimeUtc.getTime() - session.startTimeUtc.getTime()) / 1000)
                    : null,
            }));

            res.json({
                sessions: sessionsWithDuration,
                pagination: {
                    total,
                    limit: parseInt(limit as string),
                    offset: parseInt(offset as string),
                },
            });
        } catch (error) {
            console.error('Get sessions error:', error);
            res.status(500).json({ error: 'Failed to get sessions' });
        }
    }
);

// GET /api/admin/drivers/:id/locations - Get driver locations
router.get(
    '/drivers/:id/locations',
    validate([
        param('id').isUUID().withMessage('Valid driver ID required'),
        query('session_id').optional().isUUID().withMessage('Valid session_id required'),
        query('date').optional().isISO8601().withMessage('Valid date (YYYY-MM-DD) required'),
        query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be 1-1000'),
        query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { session_id, date, limit = '500', offset = '0' } = req.query;

            // Build where clause
            const where: any = { driverId: id };

            if (session_id) {
                where.sessionId = session_id;
            }

            if (date) {
                const dateObj = new Date(date as string);
                const startOfDay = new Date(dateObj);
                startOfDay.setUTCHours(0, 0, 0, 0);
                const endOfDay = new Date(dateObj);
                endOfDay.setUTCHours(23, 59, 59, 999);

                where.tsUtc = {
                    gte: startOfDay,
                    lte: endOfDay,
                };
            }

            const [locations, total] = await Promise.all([
                prisma.locationPoint.findMany({
                    where,
                    orderBy: { tsUtc: 'asc' },
                    take: parseInt(limit as string),
                    skip: parseInt(offset as string),
                    select: {
                        id: true,
                        pointId: true,
                        sessionId: true,
                        tsUtc: true,
                        lat: true,
                        lng: true,
                        accuracy: true,
                        speed: true,
                        heading: true,
                        provider: true,
                        createdAt: true,
                    },
                }),
                prisma.locationPoint.count({ where }),
            ]);

            res.json({
                locations,
                pagination: {
                    total,
                    limit: parseInt(limit as string),
                    offset: parseInt(offset as string),
                },
            });
        } catch (error) {
            console.error('Get locations error:', error);
            res.status(500).json({ error: 'Failed to get locations' });
        }
    }
);

// GET /api/admin/export - Export session data as CSV
router.get(
    '/export',
    validate([
        query('session_id').isUUID().withMessage('Valid session_id required'),
    ]),
    async (req: AuthRequest, res: Response) => {
        try {
            const { session_id } = req.query;

            // Get session info
            const session = await prisma.session.findUnique({
                where: { id: session_id as string },
                include: {
                    driver: {
                        select: { name: true, email: true },
                    },
                },
            });

            if (!session) {
                res.status(404).json({ error: 'Session not found' });
                return;
            }

            // Get all locations for session
            const locations = await prisma.locationPoint.findMany({
                where: { sessionId: session_id as string },
                orderBy: { tsUtc: 'asc' },
            });

            // Build CSV
            const headers = [
                'point_id',
                'timestamp_utc',
                'latitude',
                'longitude',
                'accuracy_m',
                'speed_mps',
                'heading_deg',
                'provider',
            ];

            const rows = locations.map(loc => [
                loc.pointId,
                loc.tsUtc.toISOString(),
                loc.lat.toString(),
                loc.lng.toString(),
                loc.accuracy?.toString() || '',
                loc.speed?.toString() || '',
                loc.heading?.toString() || '',
                loc.provider || '',
            ]);

            const csv = [
                `# Driver: ${session.driver.name} (${session.driver.email})`,
                `# Session: ${session.id}`,
                `# Start: ${session.startTimeUtc.toISOString()}`,
                `# End: ${session.endTimeUtc?.toISOString() || 'In Progress'}`,
                `# Total Points: ${locations.length}`,
                '',
                headers.join(','),
                ...rows.map(row => row.join(',')),
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="session_${session_id}_${new Date().toISOString().split('T')[0]}.csv"`
            );
            res.send(csv);
        } catch (error) {
            console.error('Export error:', error);
            res.status(500).json({ error: 'Failed to export data' });
        }
    }
);

// GET /api/admin/stats - Get dashboard stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
    try {
        const [
            totalDrivers,
            activeDrivers,
            totalSessions,
            activeSessions,
            totalPoints,
            todayPoints,
        ] = await Promise.all([
            prisma.user.count({ where: { role: 'driver' } }),
            prisma.driverLastSeen.count({ where: { status: 'tracking' } }),
            prisma.session.count(),
            prisma.session.count({ where: { status: { in: ['active', 'paused'] } } }),
            prisma.locationPoint.count(),
            prisma.locationPoint.count({
                where: {
                    tsUtc: {
                        gte: new Date(new Date().setUTCHours(0, 0, 0, 0)),
                    },
                },
            }),
        ]);

        res.json({
            stats: {
                totalDrivers,
                activeDrivers,
                totalSessions,
                activeSessions,
                totalPoints,
                todayPoints,
            },
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

export default router;
