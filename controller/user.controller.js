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
    console.log({ searchedText, selectedTags, sortBy });
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

        let i = 0
        for (let room of rooms) {
            const availabilityData = await getRoomAvailabilityData(room.room_id, res)
            rooms[i].availabilityScore = availabilityData.availabilityScore
            i++
        }

        if (sortBy === "availability-high-to-low") {
            rooms.sort((a, b) => b.availabilityScore - a.availabilityScore)
        }
        else if (sortBy === "availability-low-to-high") {
            rooms.sort((a, b) => a.availabilityScore - b.availabilityScore)
        }

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
        const availabilityData = await getRoomAvailabilityData(room_id, res)
        return res.json(availabilityData)
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


// helper function that returns that availability data for the selected room
const getRoomAvailabilityData = async (room_id, res) => {
    try {
        const today = new Date();

        let startTime = new Date(new Date().setHours(0, 0, 0, 0));
        let endTime = new Date(new Date().setHours(23, 59, 59, 999));
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


        if (existingBookings.length === 0) {
            return { status: 'Available all day', color: 'green', availabilityScore: 0 }; // No bookings
        }

        const totalPossibleSlots = 16; // 10:00 AM to 7:00 PM with 30-minute including intervals and 1PM to 2PM break
        if (existingBookings.length === totalPossibleSlots) {
            return { status: 'Full for the day', color: 'red', availabilityScore: Infinity }; // All slots booked
        }


        let nextAvailableTimeslot = ""
        for (let time_slot of time_slots) {
            const [startHour, startMinute] = time_slot.time_range.substring(0, 5).split(":");
            const slotStartTime = new Date();
            slotStartTime.setHours(startHour, startMinute, 0, 0);

            const [endHour, endMinute] = time_slot.time_range.substring(8, 13).split(":"); // Get end time
            const slotEndTime = new Date();
            slotEndTime.setHours(endHour, endMinute, 0, 0);

            if (slotEndTime > today) { // Check if the slot's end time is in the future
                if (existingBookings.findIndex(booking => booking.booking_time_slot === time_slot.time_range) === -1) {
                    nextAvailableTimeslot = time_slot.time_range;
                    break;
                }
            }
        }

        if (!nextAvailableTimeslot) {
            return { status: 'Full for the day', color: 'red', availabilityScore: Infinity }; // All slots booked
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
            return { status: `Available now`, color: 'green', availabilityScore: 1 };
        }

        const timeDifference =
            `${hours > 0 ? `${hours} hr${hours !== 1 ? 's' : ''} ` : ''}` +
            `${minutes > 0 ? `${minutes} min${minutes !== 1 ? 's' : ''}` : (hours === 0 ? '1 min' : '')}`;





        let color = "#222"
        if (nextBookingTime.getTime() - new Date().getTime() <= 3600000) {
            // if available within 1 hour
            color = "green"
        }
        else if (nextBookingTime.getTime() - new Date().getTime() > 3600000 && nextBookingTime.getTime() - new Date().getTime() < 10800000) {
            // if available after 1 hour to next 3 hour
            // yellowish
            color = "#d9b706"
        }
        else {
            // available after 3 hours
            //orangish
            color = "#e18610"
        }


        return { status: `Available in ${timeDifference}`, color, availabilityScore: nextBookingTime.getTime() };
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


// @route - POST - /api/user/room/book
// @use - Books a room
exports.bookRoom = async (req, res) => {
    const { emitMessageToClient } = require("../socket");
    let { session_id, room_id, selectedDate, selectedTimeRange } = req.body
    console.log(session_id);
    try {
        if (!session_id || !room_id || !selectedDate || !selectedTimeRange) {
            return res.status(400).json({ error: `Missing required fields: [session_id, room_id, selectedDate, selectedTimeRange]` })
        }

        const new_booking_detail = await prisma.bookingDetail.create({
            data: {
                session_id: session_id,
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