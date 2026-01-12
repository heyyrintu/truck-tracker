import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { authenticate, AuthRequest, requireDriver } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Location point validation schema
interface LocationPointInput {
    point_id: string;
    session_id: string;
    ts_utc: string;
    lat: number;
    lng: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    provider?: string;
}

// Batch validation
const batchValidation = [
    body('points').isArray({ min: 1, max: 100 }).withMessage('Points array required (1-100 items)'),
    body('points.*.point_id').isUUID().withMessage('Valid point_id UUID required'),
    body('points.*.session_id').isUUID().withMessage('Valid session_id UUID required'),
    body('points.*.ts_utc').isISO8601().withMessage('Valid ISO8601 timestamp required'),
    body('points.*.lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required (-90 to 90)'),
    body('points.*.lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required (-180 to 180)'),
    body('points.*.accuracy').optional().isFloat({ min: 0 }).withMessage('Accuracy must be positive'),
    body('points.*.speed').optional().isFloat({ min: 0 }).withMessage('Speed must be positive'),
    body('points.*.heading').optional().isFloat({ min: 0, max: 360 }).withMessage('Heading must be 0-360'),
    body('points.*.provider').optional().isString().withMessage('Provider must be string'),
];

// POST /api/locations/batch - Batch upload location points (idempotent)
router.post(
    '/batch',
    authenticate,
    requireDriver,
    validate(batchValidation),
    async (req: AuthRequest, res: Response) => {
        try {
            const driverId = req.user!.userId;
            const { points } = req.body as { points: LocationPointInput[] };

            const accepted: string[] = [];
            const rejected: { point_id: string; reason: string }[] = [];

            // Verify driver owns the sessions
            const sessionIds = [...new Set(points.map(p => p.session_id))];
            const validSessions = await prisma.session.findMany({
                where: {
                    id: { in: sessionIds },
                    driverId,
                },
                select: { id: true },
            });
            const validSessionIds = new Set(validSessions.map(s => s.id));

            // Get existing point_ids to prevent duplicates
            const pointIds = points.map(p => p.point_id);
            const existingPoints = await prisma.locationPoint.findMany({
                where: { pointId: { in: pointIds } },
                select: { pointId: true },
            });
            const existingPointIds = new Set(existingPoints.map(p => p.pointId));

            // Process points
            const validPoints: {
                pointId: string;
                sessionId: string;
                driverId: string;
                tsUtc: Date;
                lat: number;
                lng: number;
                accuracy: number | null;
                speed: number | null;
                heading: number | null;
                provider: string | null;
            }[] = [];

            for (const point of points) {
                // Check for duplicate
                if (existingPointIds.has(point.point_id)) {
                    // Already exists - consider as accepted (idempotent)
                    accepted.push(point.point_id);
                    continue;
                }

                // Validate session belongs to driver
                if (!validSessionIds.has(point.session_id)) {
                    rejected.push({
                        point_id: point.point_id,
                        reason: 'Invalid session_id',
                    });
                    continue;
                }

                // Add to valid points
                validPoints.push({
                    pointId: point.point_id,
                    sessionId: point.session_id,
                    driverId,
                    tsUtc: new Date(point.ts_utc),
                    lat: point.lat,
                    lng: point.lng,
                    accuracy: point.accuracy ?? null,
                    speed: point.speed ?? null,
                    heading: point.heading ?? null,
                    provider: point.provider ?? null,
                });
                accepted.push(point.point_id);
            }

            // Bulk insert valid points
            if (validPoints.length > 0) {
                await prisma.locationPoint.createMany({
                    data: validPoints,
                    skipDuplicates: true,
                });

                // Update driver last seen with the latest point
                const latestPoint = validPoints.reduce((latest, point) =>
                    point.tsUtc > latest.tsUtc ? point : latest
                );

                await prisma.driverLastSeen.upsert({
                    where: { driverId },
                    update: {
                        lastTsUtc: latestPoint.tsUtc,
                        lastLat: latestPoint.lat,
                        lastLng: latestPoint.lng,
                        lastAccuracy: latestPoint.accuracy,
                        sessionId: latestPoint.sessionId,
                    },
                    create: {
                        driverId,
                        lastTsUtc: latestPoint.tsUtc,
                        lastLat: latestPoint.lat,
                        lastLng: latestPoint.lng,
                        lastAccuracy: latestPoint.accuracy,
                        sessionId: latestPoint.sessionId,
                        status: 'tracking',
                    },
                });
            }

            res.json({
                success: true,
                stats: {
                    total: points.length,
                    accepted: accepted.length,
                    rejected: rejected.length,
                },
                accepted,
                rejected,
            });
        } catch (error) {
            console.error('Batch upload error:', error);
            res.status(500).json({ error: 'Failed to upload locations' });
        }
    }
);

export default router;
