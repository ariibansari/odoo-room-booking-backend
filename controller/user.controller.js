const { prisma } = require("../config/prismaClient");
const moment = require('moment-timezone')


// @route - POST - /api/user/tags
// @use - Gets all tags
exports.getTags = async (req, res) => {
    try {
        let { selectedTags = [] } = req.body

        const tag = await prisma.tag.findMany({
            where: {
                tag_id: {
                    notIn: selectedTags.map(tag => tag.tag_id)
                }
            }
        })
        return res.json(tag)
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ error: "Internal server error" })
    }
}


// @route - POST - /api/user/room/all
// @use - Gets room with query and filter
exports.getRooms = async (req, res) => {
    let { searchedText = '', selectedTags = [], sortBy } = req.body
    try {
        let orderBy = {}
        if (sortBy === "capacity-high-to-low") {
            orderBy = {
                room_capacity: "desc"
            }
        }
        else if (sortBy === "capacity-low-to-high") {
            orderBy = {
                room_capacity: "asc"
            }
        }

        if (selectedTags.length === 0) {
            const tags = await prisma.tag.findMany({
                select: {
                    tag_id: true
                }
            })

            selectedTags = tags
        }

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
            },
            where: {
                room_name: {
                    contains: searchedText,
                    mode: "insensitive"
                },
                Tags: {
                    some: {
                        tag_id: {
                            in: selectedTags.map(tag => tag.tag_id)
                        }
                    }
                }
            },
            orderBy: orderBy
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
    let { room_id } = req.params;
    room_id = parseInt(room_id);

    try {
        const today = new Date();

        let startTime = new Date(new Date().setUTCHours(0, 0, 0, 0));
        let endTime = new Date(new Date().setUTCHours(23, 59, 59, 999));

        const existingBookings = await prisma.bookingDetail.findMany({
            where: {
                room_id,
                booking_date: {
                    gte: startTime,
                    lte: endTime
                }
            },
            orderBy: {
                booking_time_slot: 'asc',
            },
        });
        // console.log(existingBookings);

        if (existingBookings.length === 0) {
            return res.json({ status: 'Available all day', color: 'green' }); // No bookings
        }

        const totalPossibleSlots = 16; // 10:00 AM to 7:00 PM with 30-minute including intervals and 1PM to 2PM break
        if (existingBookings.length === totalPossibleSlots) {
            return res.json({ status: 'Full for the day', color: 'red' }); // All slots booked
        }

        const time_slots = [
            { time_range: "10:00 - 10:30" },
            { time_range: "10:30 - 11:00" },
            { time_range: "11:00 - 11:30" },
            { time_range: "11:30 - 12:00" },
            { time_range: "12:00 - 12:30" },
            { time_range: "12:30 - 13:00" },
            { time_range: "14:00 - 14:30" },
            { time_range: "14:30 - 15:00" },
            { time_range: "15:00 - 15:30" },
            { time_range: "15:30 - 16:00" },
            { time_range: "16:00 - 16:30" },
            { time_range: "16:30 - 17:00" },
            { time_range: "17:00 - 17:30" },
            { time_range: "17:30 - 18:00" },
            { time_range: "18:00 - 18:30" },
            { time_range: "18:30 - 19:00" },
        ]

        let nextAvailableTimeslot = ""
        for (let time_slot of time_slots) {
            if (existingBookings.findIndex(booking => booking.booking_time_slot === time_slot.time_range) === -1) {
                nextAvailableTimeslot = time_slot.time_range
                break
            }
        }

        const nextBookingTime = new Date();
        nextBookingTime.setDate(today.getDate())
        nextBookingTime.setMonth(today.getMonth())
        nextBookingTime.setFullYear(today.getUTCFullYear())
        nextBookingTime.setHours(parseInt(nextAvailableTimeslot.substring(0, 2)), parseInt(nextAvailableTimeslot.substring(3, 5)), 0, 0)

        const next_booking_time = moment(nextBookingTime);
        const now = moment();

        const duration = moment.duration(next_booking_time.diff(now));
        const hours = duration.hours();
        const minutes = duration.minutes();

        if (hours <= 0 && minutes <= 0) { // available now
            return res.json({ status: `Available now`, color: 'green' });
        }

        const timeDifference =
            `${hours > 0 ? `${hours} hr${hours !== 1 ? 's' : ''} ` : ''}` +
            `${minutes > 0 ? `${minutes} min${minutes !== 1 ? 's' : ''}` : (hours === 0 ? '1 min' : '')}`;


        return res.json({ status: `Available after ${timeDifference}`, color: 'orange', avaialbleAfter: nextBookingTime });
        // return res.json({ status: `Available after ${moment(nextBookingTime).fromNow(true)}`, color: 'orange' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


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