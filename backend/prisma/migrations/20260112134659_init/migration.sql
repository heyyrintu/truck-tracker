-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'driver');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('active', 'paused', 'completed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'driver',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'active',
    "start_time_utc" TIMESTAMP(3) NOT NULL,
    "end_time_utc" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_points" (
    "id" TEXT NOT NULL,
    "point_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "ts_utc" TIMESTAMP(3) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "provider" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_last_seen" (
    "driver_id" TEXT NOT NULL,
    "last_ts_utc" TIMESTAMP(3) NOT NULL,
    "last_lat" DOUBLE PRECISION NOT NULL,
    "last_lng" DOUBLE PRECISION NOT NULL,
    "last_accuracy" DOUBLE PRECISION,
    "session_id" TEXT,
    "status" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_last_seen_pkey" PRIMARY KEY ("driver_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "sessions_driver_id_idx" ON "sessions"("driver_id");

-- CreateIndex
CREATE INDEX "sessions_status_idx" ON "sessions"("status");

-- CreateIndex
CREATE INDEX "sessions_start_time_utc_idx" ON "sessions"("start_time_utc");

-- CreateIndex
CREATE UNIQUE INDEX "location_points_point_id_key" ON "location_points"("point_id");

-- CreateIndex
CREATE INDEX "location_points_session_id_idx" ON "location_points"("session_id");

-- CreateIndex
CREATE INDEX "location_points_driver_id_idx" ON "location_points"("driver_id");

-- CreateIndex
CREATE INDEX "location_points_ts_utc_idx" ON "location_points"("ts_utc");

-- CreateIndex
CREATE INDEX "location_points_driver_id_ts_utc_idx" ON "location_points"("driver_id", "ts_utc");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_points" ADD CONSTRAINT "location_points_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_points" ADD CONSTRAINT "location_points_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_last_seen" ADD CONSTRAINT "driver_last_seen_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
