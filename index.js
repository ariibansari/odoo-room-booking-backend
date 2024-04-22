const { server } = require("./socket");

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server Started!`));