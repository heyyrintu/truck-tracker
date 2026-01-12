import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Clear existing data
    await prisma.locationPoint.deleteMany();
    await prisma.driverLastSeen.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    console.log('🗑️ Cleared existing data');

    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const driverPassword = await bcrypt.hash('driver123', 10);

    // Create admin user
    const admin = await prisma.user.create({
        data: {
            email: 'admin@tracker.com',
            name: 'Admin User',
            phone: '+1234567890',
            passwordHash: adminPassword,
            role: 'admin',
        },
    });
    console.log('👤 Created admin:', admin.email);

    // Create driver users
    const driver1 = await prisma.user.create({
        data: {
            email: 'driver1@tracker.com',
            name: 'John Driver',
            phone: '+1234567891',
            passwordHash: driverPassword,
            role: 'driver',
        },
    });
    console.log('🚗 Created driver:', driver1.email);

    const driver2 = await prisma.user.create({
        data: {
            email: 'driver2@tracker.com',
            name: 'Jane Driver',
            phone: '+1234567892',
            passwordHash: driverPassword,
            role: 'driver',
        },
    });
    console.log('🚗 Created driver:', driver2.email);

    // Create sample session for driver1
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const session = await prisma.session.create({
        data: {
            driverId: driver1.id,
            status: 'completed',
            startTimeUtc: oneHourAgo,
            endTimeUtc: now,
        },
    });
    console.log('📍 Created sample session');

    // Create sample location points
    const sampleLocations = [];
    const baseLatitude = 40.7128; // NYC
    const baseLongitude = -74.006;

    for (let i = 0; i < 60; i++) {
        const timestamp = new Date(oneHourAgo.getTime() + i * 60 * 1000);
        sampleLocations.push({
            pointId: `seed-${i}-${Date.now()}`,
            sessionId: session.id,
            driverId: driver1.id,
            tsUtc: timestamp,
            lat: baseLatitude + (Math.random() - 0.5) * 0.01,
            lng: baseLongitude + (Math.random() - 0.5) * 0.01,
            accuracy: 10 + Math.random() * 20,
            speed: 5 + Math.random() * 15,
            heading: Math.random() * 360,
            provider: 'GPS',
        });
    }

    await prisma.locationPoint.createMany({ data: sampleLocations });
    console.log(`📍 Created ${sampleLocations.length} sample location points`);

    // Create driver last seen entry
    const lastLocation = sampleLocations[sampleLocations.length - 1];
    await prisma.driverLastSeen.create({
        data: {
            driverId: driver1.id,
            lastTsUtc: lastLocation.tsUtc,
            lastLat: lastLocation.lat,
            lastLng: lastLocation.lng,
            lastAccuracy: lastLocation.accuracy,
            status: 'offline',
        },
    });
    console.log('📍 Created driver last seen entry');

    console.log('\n✅ Seeding complete!');
    console.log('\n📋 Test Credentials:');
    console.log('   Admin: admin@tracker.com / admin123');
    console.log('   Driver 1: driver1@tracker.com / driver123');
    console.log('   Driver 2: driver2@tracker.com / driver123');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
