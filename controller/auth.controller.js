const { prisma } = require("../config/prismaClient")


// @route - POST - /api/auth/session/new
// @use - Creates a new session and returns new access token for the client
exports.newSession = async (req, res) => {
    try {

        const session = await prisma.session.create()

        return res.json({ sessionId: session.session_id })
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ error: "Internal server error" })
    }
}