const { prisma } = require("../config/prismaClient");



// @route - POST - /api/user/room/all
// @use - Gets room with query and filter
exports.getRooms = async (req, res) => {
    try {
        const rooms = await prisma.room.findMany({
            include: {
                Tags: {
                    select: {
                        tag_ref: {
                            select: {
                                tag_id: true,
                                tag_name: true
                            }
                        }
                    }
                }
            }
        })

        return res.json(rooms)
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ error: "Internal server error" })
    }
}


// @route - GET - /api/user/roomDetails/:room_id
// @use - Gets a room detail
exports.getRoomDetails = async (req, res) => {
    const { room_id } = req.params
    try {
        const room = await prisma.room.findFirst({
            where: {
                room_id: parseInt(room_id)
            },
            include: {
                BookingDetail: {
                    select: {
                        booking_detail_id: true,
                        session_id: true,
                        room_id: true,
                        booking_date: true,
                        booking_time_slot: true
                    }
                }
            }
        })

        return res.json(room)
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ error: "Internal server error" })
    }
}


// @route - GET - /api/user/room/:room_id/availability
// @use - Gets room availability
exports.getRoomAvailability = async (req, res) => {
    let { room_id } = req.params
    room_id = parseInt(room_id)

    try {
        return res.json({ status: "available after 30 mins", color: "green" })
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ error: "Internal server error" })
    }
}


// @route - POST - /api/user/room/book
// @use - Books a room
exports.bookRoom = async (req, res) => {
    const { emitMessageToClient } = require("../socket");
    let { session_id, room_id, selectedDate, selectedTimeRange } = req.body

    try {
        if (!session_id || !room_id || !selectedDate || !selectedTimeRange) {
            return res.status(400).json({ error: `Missing required fields: [session_id, room_id, selectedDate, selectedTimeRange]` })
        }

        const new_booking_detail = await prisma.bookingDetail.create({
            data: {
                session_id: parseInt(session_id),
                room_id,
                booking_date: selectedDate,
                booking_time_slot: selectedTimeRange
            }
        })

        emitMessageToClient(null, "room_booked", new_booking_detail)
        return res.json({ new_booking_detail })
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ error: "Internal server error" })
    }
}


// @route - POST - /api/user/room/unbook
// @use - Unbooks a room
exports.unbookRoom = async (req, res) => {
    const { emitMessageToClient } = require("../socket");
    let { session_id, booking_detail_id } = req.body

    try {
        if (!session_id || !booking_detail_id) {
            return res.status(400).json({ error: `Missing required fields: [session_id, booking_detail_id]` })
        }

        await prisma.bookingDetail.delete({
            where: {
                session_id: session_id,
                booking_detail_id: booking_detail_id
            }
        })

        emitMessageToClient(null, "room_unbooked", { deleted_booking_detail_id: booking_detail_id, session_id: session_id })
        return res.json({ deleted_booking_detail_id: booking_detail_id })
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ error: "Internal server error" })
    }
}