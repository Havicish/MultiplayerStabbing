'use scrict';

/** @type { HTMLCanvasElement } */
let Canvas;
/** @type { CanvasRenderingContext2D } */
let Ctx;

let SomethingWentWrong = false;

class Session {
    constructor(Id) {
        this.Id = Id;
        this.Name = "Plr" + String(Math.round(Math.random() * 1000));
        this.Game = null;
        this.Class = "Session";

        this.X = Math.round(Math.random() * innerWidth);
        this.Y = Math.round(Math.random() * innerHeight);
        this.Rot = 0;
        this.VelX = 0;
        this.VelY = 0;
        this.VelRot = 0;
        this.Health = 100;
        this.ShootCD = 0;

        Get("#SessionName").value = this.Name;
    }
}

class Game {
    constructor(Id) {
        this.Id = Id;
        this.Name = "Game" + String(Math.round(Math.random() * 1000));
        this.Class = "Game";
    }
}

let SessionsInGame = [];

let ThisSession = new Session(Math.round(Math.random() * 100000000000));
console.log(`Your session id is: ${ThisSession.Id}\nDon't share it with anyone!`)

document.addEventListener("DOMContentLoaded", () => {
    Canvas = Get("#Canvas");
    Ctx = Canvas.getContext("2d");

    CallServer(ThisSession, "Update", (Response) => {
        Get("#TotalSessions").innerHTML = "Total players: " + Response.TotalSessions;
        SessionsInGame = Response.AllSessionsInYourGame;
    });

    Frame();
});

let Mouse = {X: 0, Y: 0}
document.addEventListener("mousemove", (Event) => {
    Mouse.X = Event.clientX;
    Mouse.Y = Event.clientY;
});

let KeysDown = [];
document.addEventListener("keydown", (Event) => {
    if (KeysDown.indexOf(Event.key.toLowerCase()) == -1)
        KeysDown.push(Event.key.toLowerCase());
});
document.addEventListener("keyup", (Event) => {
    KeysDown.splice(KeysDown.indexOf(Event.key.toLowerCase()), 1);
});

/**
 * @param {JSON} Data 
 * @param {String} Url  
 * @param {function(JSON)} Callback  */
function CallServer(Data, Url, Callback) {
    const Xhr = new XMLHttpRequest();
    Xhr.open('POST', Url, true);
    Xhr.setRequestHeader('Content-Type', 'application/json');

    Xhr.onreadystatechange = function () {
        if (Xhr.readyState === 4 && Xhr.status === 200) {
            let Response = JSON.parse(Xhr.responseText);
            Response = Response.Response;
            Callback(Response);
        }
    };

    Xhr.onerror = function () {
        SetScreen("SomethingWentWrong");
        SomethingWentWrong = true;
        throw new Error('Network error occurred.');
    };

    // Send the data as a JSON string
    Xhr.send(JSON.stringify({ Message: Data }));
}

function MakeGame() {
    CallServer({ Name: Get("#GameName").value }, "MakeGame", (Response) => {
        ThisSession.Game = Response;
        SetScreen("Game");
        console.log(`Made and joined game:\n${Response.Id}, ${Response.Name}`);
    });
}

function JoinGame() {
    CallServer({ Name: Get("#GameName").value }, "JoinGame", (Response) => {
        if (Response && Response.Class && Response.Class == "Game") {
            ThisSession.Game = Response;
            SetScreen("Game");
            console.log(`Joined game:\n${Response.Id}, ${Response.Name}`);
        } else {
            Get("#GameName").value = "Game not found!";
            Get("#GameName").style.color = "red";
            setTimeout(() => {
                Get("#GameName").style.color = "black";
            }, 200);
            setTimeout(() => {
                Get("#GameName").style.color = "red";
            }, 400);
            setTimeout(() => {
                Get("#GameName").style.color = "black";
            }, 600);
        }
    });
}

function SetScreen(ScreenId) {
    GetAll(".Screen").forEach(Screen => {
        Screen.style.display = "none";

        if (Screen.id == ScreenId)
            Screen.style.display = "block";
    });
}

function Get(Selector) {
    return document.querySelector(Selector);
}

function GetAll(Selector) {
    return document.querySelectorAll(Selector);
}

function IsKeyDown(Key) {
    if (ThisSession.Game == null)
        return false;

    return KeysDown.indexOf(Key.toLowerCase()) != -1;
}

function CalcPlayers() {
    for (let Plr of SessionsInGame) {
        if (Plr == ThisSession)
            continue

        Plr.X += Plr.VelX;
        Plr.Y += Plr.VelY;
        Plr.Rot += Plr.VelRot;
        if (Math.sqrt(Plr.VelX ** 2 + Plr.VelY ** 2) > 1) {
            Plr.VelX += Math.cos(Plr.Rot) * Math.sqrt(Plr.VelX ** 2 + Plr.VelY ** 2) / 9;
            Plr.VelY += Math.sin(Plr.Rot) * Math.sqrt(Plr.VelX ** 2 + Plr.VelY ** 2) / 9;
        }
    }
}

function DrawPlayers() {
    for (let Plr of SessionsInGame) {
        Ctx.beginPath();
        Ctx.fillStyle = `rgb(255, ${Plr.Health * (255 / 100)}, ${Plr.Health * (255 / 100)})`;
        Ctx.arc(Plr.X, Plr.Y, 10, 0, 2*Math.PI);
        Ctx.fill();
        Ctx.beginPath();
        Ctx.arc(Plr.X, Plr.Y, 25, Math.PI/2, 2*Math.PI - Math.max(Plr.ShootCD, 0) * (2*Math.PI / 150) + Math.PI/2);
        Ctx.strokeStyle = `rgba(255, ${Plr.Health * (255 / 100)}, ${Plr.Health * (255 / 100)}, .25)`;
        Ctx.lineWidth = 10;
        Ctx.stroke();
        Ctx.beginPath();
        Ctx.strokeStyle = "white";
        Ctx.moveTo(Plr.X + Math.cos(Plr.Rot) * 5, Plr.Y + Math.sin(Plr.Rot) * 5);
        Ctx.lineTo(Plr.X + Math.cos(Plr.Rot) * 60, Plr.Y + Math.sin(Plr.Rot) * 60);
        Ctx.lineWidth = 1;
        Ctx.stroke();
        Ctx.beginPath();
        Ctx.fillStyle = "white";
        Ctx.font = "12px monospace"
        Ctx.fillText(Plr.Name, Plr.X - Plr.Name.length * 12 * 3/10, Plr.Y - 20);
    }

    Ctx.beginPath();
    Ctx.moveTo(ThisSession.X + Math.cos(ThisSession.Rot) * 60, ThisSession.Y + Math.sin(ThisSession.Rot) * 60);
    Ctx.lineTo(ThisSession.X + Math.cos(ThisSession.Rot) * 2 ** 16, ThisSession.Y + Math.sin(ThisSession.Rot) * 2 ** 16);
    Ctx.strokeStyle = "rgba(255, 127, 127, .3)";
    Ctx.lineWidth = 1;
    Ctx.stroke();
}

let WaitForNewData = 4;
let LPressed = false;
function Frame() {
    if (IsKeyDown("w")) {
        ThisSession.VelX += Math.cos(ThisSession.Rot) * .6;
        ThisSession.VelY += Math.sin(ThisSession.Rot) * .6;
    }
    ThisSession.VelX /= 1.06;
    ThisSession.VelY /= 1.06;
    ThisSession.VelRot = 0;
    if (IsKeyDown("a"))
        ThisSession.VelRot -= 0.1;
    if (IsKeyDown("d"))
        ThisSession.VelRot += 0.1;
    if (IsKeyDown("l") && LPressed == false) {
        LPressed = true;
        ThisSession.VelRot = Math.PI;
        ThisSession.ShootCD = Math.max(ThisSession.ShootCD, 20);
    } else if (!IsKeyDown("l")) {
        LPressed = false;
    }
    ThisSession.X += ThisSession.VelX;
    ThisSession.Y += ThisSession.VelY;
    ThisSession.Rot += ThisSession.VelRot;
    if (SessionsInGame.findIndex(Plr => Plr.Id == ThisSession.Id) == -1) {
        SessionsInGame.push(ThisSession);
    } else {
        SessionsInGame[SessionsInGame.findIndex(Plr => Plr.Id == ThisSession.Id)] = ThisSession;
    }
    ThisSession.ShootCD -= 1;
    if (IsKeyDown("k") && ThisSession.ShootCD <= 0) {
        let D = Math.max(Math.sqrt(ThisSession.VelX ** 2 + ThisSession.VelY ** 2), 5);
        ThisSession.VelX = Math.cos(ThisSession.Rot) * D * 3;
        ThisSession.VelY = Math.sin(ThisSession.Rot) * D * 3;
        ThisSession.ShootCD = 150;
    }

    WaitForNewData -= 1;

    if (WaitForNewData <= 0) {
        ThisSession.Name = Get("#SessionName").value;

        CallServer(ThisSession, "Update", (Response) => {
            Get("#TotalSessions").innerHTML = "Total players: " + Response.TotalSessions;
            SessionsInGame = Response.AllSessionsInYourGame;

            // For loop through all the server set properties
            Object.keys(Response.ServerSetProps).forEach((Key) => {
                ThisSession[Key] = Response.ServerSetProps[Key];
                console.log(`Updated: ${Key} to ${Response.ServerSetProps[Key]}`)
            });
            // Set/show RespawnTime
        });
        WaitForNewData = 4;
    }

    Canvas.width = innerWidth;
    Canvas.height = innerHeight;

    Ctx.clearRect(0, 0, Canvas.width, Canvas.height);
    Ctx.fillStyle = "black";
    Ctx.fillRect(0, 0, Canvas.width, Canvas.height);

    CalcPlayers();
    DrawPlayers();

    if (!SomethingWentWrong)
        requestAnimationFrame(Frame);
}