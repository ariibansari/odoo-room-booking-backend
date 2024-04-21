const { prisma } = require("../config/prismaClient");

const authenticateSession = async (req, res, next) => {
    //strip the token from the req header
    if (req.headers['authorization']) { //check if authorization parameter is available in req header
        const authHeader = req.headers["authorization"]; //eg authHeader: "Bearer asdclasdfcasdjfecmsadceclsd1323l3ml42lmedm"
        const session_id = authHeader && authHeader.split(" ")[1];

        if (session_id) {
            const session = await prisma.session.findUnique({
                where: {
                    session_id: parseInt(session_id)
                }
            })

            if (session.session_id) {
                req.body.session_id = session.session_id
                next()
            }
            else {
                console.log("No session found in database");
                res.status(498).json({ error: "You are not authorized, session not found" })
            }
        } else {
            console.log("No session found in autherization header");
            res.status(498).json({ error: "You are not authorized, session not found" })
        }
    }
    else {
        console.log("No authorization header found");
        res.status(498).json({ error: "You are not authorized, session not found" })
    }
}

module.exports = authenticateSession