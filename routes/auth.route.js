const { newSession } = require('../controller/auth.controller');
const router = require('express').Router();


router.get("/session/new", newSession)


module.exports = router;