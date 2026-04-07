const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const XLSX = require("xlsx");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static("public"));

// 🔐 PASSWORD HOST
const HOST_PASSWORD = "123456";

// 📊 Load Excel
const wb = XLSX.readFile("questions.xlsx");
const sheet = wb.Sheets[wb.SheetNames[0]];
const crossword = XLSX.utils.sheet_to_json(sheet);

// ===== STATE =====
let buzzList = [];
let isOpen = false;
const players = {};

let currentHostId = null; // 🔥 CHỈ 1 HOST

// ===== SOCKET =====
io.on("connection", (socket) => {

  socket.isHost = false;

  // 🔐 LOGIN HOST
  socket.on("hostLogin", (password, callback) => {
    if(password === HOST_PASSWORD && !currentHostId){
      socket.isHost = true;
      currentHostId = socket.id;
      console.log("✅ Host đăng nhập:", socket.id);
      callback(true);
    } else {
      callback(false);
    }
  });

  // ===== BUZZ PLAYER =====
  socket.on("buzz", (name) => {
    if (!isOpen) return;

    if (!buzzList.find(u => u.id === socket.id)) {
      buzzList.push({ id: socket.id, name });
      io.emit("buzzUpdate", buzzList);
    }

    players[socket.id] = name;
    io.emit("playerList", Object.values(players));
  });

  // ===== 🔒 HOST CONTROL =====
  socket.on("openBuzz", () => {
    if(socket.id !== currentHostId) return;

    buzzList = [];
    isOpen = true;
    io.emit("buzzUpdate", buzzList);
  });

  socket.on("closeBuzz", () => {
    if(socket.id !== currentHostId) return;
    isOpen = false;
  });

  socket.on("revealRow", (row) => {
    if(socket.id !== currentHostId) return;
    io.emit("revealRow", row);
  });

  // ===== DATA =====
  socket.on("getCrossword", () => {
    socket.emit("crosswordData", crossword);
  });

  // ===== PLAYER GUESS =====
  socket.on("playerGuess", ({ name, guess }) => {
    players[socket.id] = name;
    io.emit("playerGuess", { name, guess });
    io.emit("playerList", Object.values(players));
  });

  // ===== DISCONNECT =====
  socket.on("disconnect", () => {

    // ❌ nếu host thoát → reset quyền
    if(socket.id === currentHostId){
      console.log("❌ Host đã thoát");
      currentHostId = null;
    }

    delete players[socket.id];
    buzzList = buzzList.filter(u => u.id !== socket.id);

    io.emit("playerList", Object.values(players));
    io.emit("buzzUpdate", buzzList);
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server chạy tại port ${PORT}`));