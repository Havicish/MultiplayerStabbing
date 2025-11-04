'use scrict';

/** @type { HTMLCanvasElement } */
let Canvas;
/** @type { CanvasRenderingContext2D } */
let Ctx;

let SomethingWentWrong = false;

const MAX_X = 2000;
const MAX_Y = 2000;

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

let Camera = {X: 0, Y: 0};

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
        if (Plr == ThisSession || Plr.Health <= 0)
            continue

        Plr.X += Plr.VelX;
        Plr.Y += Plr.VelY;
        Plr.Rot += Plr.VelRot;
        if (Math.sqrt(Plr.VelX ** 2 + Plr.VelY ** 2) > 1) {
            Plr.VelX += Math.cos(Plr.Rot) * Math.sqrt(Plr.VelX ** 2 + Plr.VelY ** 2) / 9;
            Plr.VelY += Math.sin(Plr.Rot) * Math.sqrt(Plr.VelX ** 2 + Plr.VelY ** 2) / 9;
        }

        if (Plr.X < 0) Plr.X = 0;
        if (Plr.Y < 0) Plr.Y = 0;
        if (Plr.X > MAX_X) Plr.X = MAX_X;
        if (Plr.Y > MAX_Y) Plr.Y = MAX_Y;
    }
}

function DrawPlayers() {
    for (let Plr of SessionsInGame) {
        if (Plr.Health <= 0)
            continue;

        Ctx.beginPath();
        Ctx.fillStyle = `rgb(255, ${Plr.Health * (255 / 100)}, ${Plr.Health * (255 / 100)})`;
        Ctx.arc(Plr.X - Camera.X, Plr.Y - Camera.Y, 10, 0, 2*Math.PI);
        Ctx.fill();
        Ctx.beginPath();
        Ctx.arc(Plr.X - Camera.X, Plr.Y - Camera.Y, 25, Math.PI/2, 2*Math.PI - Math.max(Plr.ShootCD, 0) * (2*Math.PI / 150) + Math.PI/2);
        Ctx.strokeStyle = `rgba(255, ${Plr.Health * (255 / 100)}, ${Plr.Health * (255 / 100)}, .25)`;
        Ctx.lineWidth = 10;
        Ctx.stroke();
        Ctx.beginPath();
        Ctx.strokeStyle = "white";
        Ctx.moveTo(Plr.X + Math.cos(Plr.Rot) * 5 - Camera.X, Plr.Y + Math.sin(Plr.Rot) * 5 - Camera.Y);
        Ctx.lineTo(Plr.X + Math.cos(Plr.Rot) * 60 - Camera.X, Plr.Y + Math.sin(Plr.Rot) * 60 - Camera.Y);
        Ctx.lineWidth = 1;
        Ctx.stroke();
        Ctx.beginPath();
        Ctx.fillStyle = "white";
        Ctx.font = "12px monospace"
        Ctx.fillText(Plr.Name, Plr.X - Plr.Name.length * 12 * 3/10 - Camera.X, Plr.Y - 20 - Camera.Y);
    }

    Ctx.beginPath();
    Ctx.moveTo(ThisSession.X + Math.cos(ThisSession.Rot) * 60 - Camera.X, ThisSession.Y + Math.sin(ThisSession.Rot) * 60 - Camera.Y);
    Ctx.lineTo(ThisSession.X + Math.cos(ThisSession.Rot) * 2 ** 16 - Camera.X, ThisSession.Y + Math.sin(ThisSession.Rot) * 2 ** 16 - Camera.Y);
    Ctx.strokeStyle = "rgba(255, 127, 127, 0.5)";
    Ctx.lineWidth = 1;
    Ctx.stroke();
}

// Draw out of bounds dots (it's just decor)
function DrawDotsOOB() {
    Ctx.fillStyle = "white";
    for (let i = 0; i < 50; i++) {
        for (let j = 0; j < 50; j++) {
            let XStep = innerWidth / 50;
            let YStep = innerHeight / 50;
            let Step = Math.max(XStep, YStep);
            XStep = YStep = Step;
            let XPos = i * XStep + (XStep / 2);
            let YPos = j * YStep + (YStep / 2);

            if (XPos + Camera.X > 0 && XPos + Camera.X < MAX_X && YPos + Camera.Y > 0 && YPos + Camera.Y < MAX_Y) {
                continue;
            }

            Ctx.beginPath();
            Ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
            Ctx.arc(XPos, YPos, 5, 0, 2*Math.PI);
            Ctx.fill();
        }
    }
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

    if (ThisSession.Health > 0) {
      if (ThisSession.X < 0) ThisSession.X = 0;
      if (ThisSession.Y < 0) ThisSession.Y = 0;
      if (ThisSession.X > MAX_X) ThisSession.X = MAX_X;
      if (ThisSession.Y > MAX_Y) ThisSession.Y = MAX_Y;
    }

    if (ThisSession.ResetPos == true && ThisSession.Health <= 0) {
        ThisSession.X = Math.round(Math.random() * 2000);
        ThisSession.Y = Math.round(Math.random() * 2000);
        ThisSession.ResetPos = false;
        ThisSession.Health = 100;
        CallServer(ThisSession, "HasResetPos", (Response) => {});
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

    if (ThisSession.Health > 0) {
      Camera.X += (ThisSession.X - innerWidth / 2 - Camera.X) / 10;
      Camera.Y += (ThisSession.Y - innerHeight / 2 - Camera.Y) / 10;
    }

    Canvas.width = innerWidth;
    Canvas.height = innerHeight;

    Ctx.clearRect(0, 0, Canvas.width, Canvas.height);
    Ctx.fillStyle = "black";
    Ctx.fillRect(0, 0, Canvas.width, Canvas.height);
    Ctx.strokeStyle = "white";
    Ctx.lineWidth = 4;
    Ctx.strokeRect(0 - Camera.X, 0 - Camera.Y, MAX_X, MAX_Y);

    CalcPlayers();
    DrawPlayers();
    DrawDotsOOB();

    if (!SomethingWentWrong)
        requestAnimationFrame(Frame);
}