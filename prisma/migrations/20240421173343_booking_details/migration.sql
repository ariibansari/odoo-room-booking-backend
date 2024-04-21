-- CreateTable
CREATE TABLE "BookingDetail" (
    "booking_detail_id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "room_id" INTEGER NOT NULL,
    "booking_date" TIMESTAMP(3) NOT NULL,
    "booking_time_slot" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingDetail_pkey" PRIMARY KEY ("booking_detail_id")
);

-- AddForeignKey
ALTER TABLE "BookingDetail" ADD CONSTRAINT "BookingDetail_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("room_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingDetail" ADD CONSTRAINT "BookingDetail_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;
