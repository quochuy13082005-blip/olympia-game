const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const XLSX = require("xlsx");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static("public"));

// Load Excel
const wb = XLSX.readFile("questions.xlsx");
const sheet = wb.Sheets[wb.SheetNames[0]];
const crossword = XLSX.utils.sheet_to_json(sheet);

let buzzList = [];
let isOpen = false;

io.on("connection", (socket) => {

  socket.on("buzz", (name) => {
    if (!isOpen) return;
    if (!buzzList.find(u => u.id === socket.id)) {
      buzzList.push({ id: socket.id, name });
      io.emit("buzzUpdate", buzzList);
    }
  });

  socket.on("openBuzz", () => {
    buzzList = [];
    isOpen = true;
    io.emit("buzzUpdate", buzzList);
  });

  socket.on("closeBuzz", () => {
    isOpen = false;
  });

  socket.on("getCrossword", () => {
    socket.emit("crosswordData", crossword);
  });

  socket.on("revealRow", (row) => {
    io.emit("revealRow", row);
  });

  let players = {}; // socket.id => name

io.on("connection", (socket)=>{

  socket.on("buzz", (name)=>{
    if(!isOpen) return;
    if(!buzzList.find(u=>u.id===socket.id)){
      buzzList.push({id:socket.id,name});
      io.emit("buzzUpdate",buzzList);
    }
    // Lưu player
    players[socket.id] = name;
    io.emit("playerList", Object.values(players));
  });

  socket.on("playerGuess", ({name, guess})=>{
    players[socket.id] = name;
    io.emit("playerGuess", {name, guess});
    io.emit("playerList", Object.values(players));
  });

  socket.on("disconnect", ()=>{
    delete players[socket.id];
    io.emit("playerList", Object.values(players));
  });

  // ... các event khác
});

});

server.listen(3000, () => console.log("🚀 Server chạy"));