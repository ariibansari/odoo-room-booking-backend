const { getRooms, getRoomDetails, getRoomAvailability, bookRoom, unbookRoom, getTags } = require('../controller/user.controller');
const authenticateSession = require('../middleware/authenticateSession.middleware');

const router = require('express').Router();


router.post("/tags", authenticateSession, getTags)

router.post("/room/all", authenticateSession, getRooms)
router.get("/roomDetails/:room_id", authenticateSession, getRoomDetails)
router.get("/room/:room_id/availability", authenticateSession, getRoomAvailability)
router.post("/room/book", authenticateSession, bookRoom)
router.post("/room/unbook", authenticateSession, unbookRoom)


module.exports = router;