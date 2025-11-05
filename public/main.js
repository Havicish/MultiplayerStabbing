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
        this.Move1CD = 0;
        this.Move2CD = 0;
        this.Move1MaxCD = 3;
        this.Move2MaxCD = 3;
        this.Move1 = "Phase Dash";
        this.Move2 = "Quick Spin";
        this.ResetPos = false;

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
let Caltrops = [];

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
        } else if (Xhr.status >= 400) {
            SomethingWentWrong = true;
            SetScreen("SomethingWentWrong");
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
    ThisSession.Move1 = Get("#Move1").value;
    ThisSession.Move2 = Get("#Move2").value;

    ThisSession.Move1MaxCD = 0.01;
    ThisSession.Move2MaxCD = 0.01;

    CallServer({ Name: Get("#GameName").value }, "MakeGame", (Response) => {
        ThisSession.Game = Response;
        SetScreen("Game");
        console.log(`Made and joined game:\n${Response.Id}, ${Response.Name}`);
    });
}

function JoinGame() {
    ThisSession.Move1 = Get("#Move1").value;
    ThisSession.Move2 = Get("#Move2").value;

    ThisSession.Move1MaxCD = 0.01;
    ThisSession.Move2MaxCD = 0.01;

    //ChangeMaxCDLol();

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

function DrawGameObjs() {
  for (let Caltrop of Caltrops) {
    if (!Caltrop) continue;

    const x = Caltrop.X - Camera.X;
    const y = Caltrop.Y - Camera.Y;
    const alpha = (Caltrop.TTL ?? Caltrop.TimeToLive ?? 5) / 5;
    const color = (Caltrop.OwnerId == ThisSession.Id)
      ? `rgba(127,255,127,${alpha})`
      : `rgba(255,127,127,${alpha})`;

    Ctx.save();
    Ctx.translate(x, y);
    Ctx.rotate(Caltrop.Rot || 0);
    Ctx.strokeStyle = color;

    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      Ctx.beginPath();
      Ctx.moveTo(0, 0);
      Ctx.lineTo(Math.cos(angle) * 16, Math.sin(angle) * 16);
      Ctx.stroke();
    }

    Ctx.restore();
  }
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
        Ctx.arc(Plr.X - Camera.X, Plr.Y - Camera.Y, 25, Plr.Rot, Plr.Rot + Math.PI * (1 - (Plr.Move1CD / Plr.Move1MaxCD)));
        Ctx.strokeStyle = `rgba(255, ${Plr.Health * (255 / 100)}, ${Plr.Health * (255 / 100)}, .25)`;
        Ctx.lineWidth = 10;
        Ctx.stroke();
        Ctx.beginPath();
        Ctx.arc(Plr.X - Camera.X, Plr.Y - Camera.Y, 25, Plr.Rot - Math.PI * (1 - (Plr.Move2CD / Plr.Move2MaxCD)), Plr.Rot);
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

function ChangeMaxCDLol() {
    if (ThisSession.Move1 == "Dash")
        ThisSession.Move1MaxCD = 3;
    if (ThisSession.Move1 == "Back Dash")
        ThisSession.Move1MaxCD = 3;
    if (ThisSession.Move1 == "Phase Dash")
        ThisSession.Move1MaxCD = 5;
    if (ThisSession.Move1 == "Quick Spin")
        ThisSession.Move1MaxCD = 1;

    if (ThisSession.Move2 == "Dash")
        ThisSession.Move2MaxCD = 3;
    if (ThisSession.Move2 == "Back Dash")
        ThisSession.Move2MaxCD = 3;
    if (ThisSession.Move2 == "Phase Dash")
        ThisSession.Move2MaxCD = 5;
    if (ThisSession.Move2 == "Quick Spin")
        ThisSession.Move2MaxCD = 1;
}

function Move1() {
    if (ThisSession.Move1CD > 0)
        return;

    if (ThisSession.Move1 == "Dash") {
        ThisSession.VelX = Math.cos(ThisSession.Rot) * 30;
        ThisSession.VelY = Math.sin(ThisSession.Rot) * 30;
        ThisSession.Move1CD = 3;
    }

    if (ThisSession.Move1 == "Back Dash") {
        ThisSession.VelX = Math.cos(ThisSession.Rot + Math.PI) * 30;
        ThisSession.VelY = Math.sin(ThisSession.Rot + Math.PI) * 30;
        ThisSession.Move1CD = 3;
    }

    if (ThisSession.Move1 == "Phase Dash") {
        ThisSession.X += Math.cos(ThisSession.Rot) * 400;
        ThisSession.Y += Math.sin(ThisSession.Rot) * 400;
        ThisSession.VelX = 0;
        ThisSession.VelY = 0;
        ThisSession.Move1CD = 5;
    }

    if (ThisSession.Move1 == "Quick Spin") {
        ThisSession.Rot += Math.PI;
    }

    if (ThisSession.Move1 == "Caltrop") {
        ThisSession.Move1CD = 3.5;
        CallServer(ThisSession, "CreateCaltrop", (Response) => {
            ThisSession.Move1CD = 3.5;
        });
    }
}

function Move2() {
    if (ThisSession.Move2CD > 0)
        return;

    if (ThisSession.Move2 == "Dash") {
        ThisSession.VelX = Math.cos(ThisSession.Rot) * 30;
        ThisSession.VelY = Math.sin(ThisSession.Rot) * 30;
        ThisSession.Move2CD = 3;
    }

    if (ThisSession.Move2 == "Back Dash") {
        ThisSession.VelX = Math.cos(ThisSession.Rot + Math.PI) * 30;
        ThisSession.VelY = Math.sin(ThisSession.Rot + Math.PI) * 30;
        ThisSession.Move2CD = 3;
    }

    if (ThisSession.Move2 == "Phase Dash") {
        ThisSession.X += Math.cos(ThisSession.Rot) * 400;
        ThisSession.Y += Math.sin(ThisSession.Rot) * 400;
        ThisSession.VelX = 0;
        ThisSession.VelY = 0;
        ThisSession.Move2CD = 5;
    }

    if (ThisSession.Move2 == "Quick Spin") {
        ThisSession.Rot += Math.PI;
    }
}

let WaitForNewData = 4;
let LastKDown = false;
let LastLDown = false;
let Ping = [];
let LastRecTime = Date.now();
function Frame() {
    let DT = (Date.now() - LastRecTime) / 1000;
    LastRecTime = Date.now();

    if (IsKeyDown("w")) {
        ThisSession.VelX += Math.cos(ThisSession.Rot) * DT * 60 / 2;
        ThisSession.VelY += Math.sin(ThisSession.Rot) * DT * 60 / 2;
    }

    ThisSession.VelX *= Math.pow(1 / 1.06, DT * 60);
    ThisSession.VelY *= Math.pow(1 / 1.06, DT * 60);
    ThisSession.VelRot = 0;
    if (IsKeyDown("a"))
        ThisSession.VelRot -= 0.1;
    if (IsKeyDown("d"))
        ThisSession.VelRot += 0.1;

    if (SessionsInGame.findIndex(Plr => Plr.Id == ThisSession.Id) == -1) {
        SessionsInGame.push(ThisSession);
    } else {
        SessionsInGame[SessionsInGame.findIndex(Plr => Plr.Id == ThisSession.Id)] = ThisSession;
    }

    ThisSession.Move1CD = Math.max(0, ThisSession.Move1CD - DT);
    ThisSession.Move2CD = Math.max(0, ThisSession.Move2CD - DT);

    if (IsKeyDown("k")) {
        let ShouldSetMaxCD = ThisSession.Move1CD <= 0;
        if (ThisSession.Move1 != "Quick Spin")
          Move1();
        else if (LastKDown == false)
          Move1();
        if (ShouldSetMaxCD)
          ThisSession.Move1MaxCD = Math.max(ThisSession.Move1CD, 0.01);
    }
    if (IsKeyDown("l")) {
        let ShouldSetMaxCD = ThisSession.Move2CD <= 0;
        if (ThisSession.Move2 != "Quick Spin")
          Move2();
        else if (LastLDown == false)
          Move2();
        if (ShouldSetMaxCD)
          ThisSession.Move2MaxCD = Math.max(ThisSession.Move2CD, 0.01);
    }
    LastKDown = IsKeyDown("k");
    LastLDown = IsKeyDown("l");

    ThisSession.X += ThisSession.VelX * DT * 60;
    ThisSession.Y += ThisSession.VelY * DT * 60;
    ThisSession.Rot += ThisSession.VelRot * DT * 60;

    if (ThisSession.Health > 0) {
      if (ThisSession.X < 0) ThisSession.VelX = -ThisSession.VelX;
      if (ThisSession.X < 0) ThisSession.X = 0;
      if (ThisSession.Y < 0) ThisSession.VelY = -ThisSession.VelY;
      if (ThisSession.Y < 0) ThisSession.Y = 0;
      if (ThisSession.X > MAX_X) ThisSession.VelX = -ThisSession.VelX;
      if (ThisSession.X > MAX_X) ThisSession.X = MAX_X;
      if (ThisSession.Y > MAX_Y) ThisSession.VelY = -ThisSession.VelY;
      if (ThisSession.Y > MAX_Y) ThisSession.Y = MAX_Y;
    }

    if (ThisSession.ResetPos == true && ThisSession.Health <= 0) {
        ThisSession.X = Math.round(Math.random() * MAX_X);
        ThisSession.Y = Math.round(Math.random() * MAX_Y);
        ThisSession.ResetPos = false;
        ThisSession.Health = 100;
        CallServer(ThisSession, "HasResetPos", (Response) => {});
    }

    WaitForNewData -= 1;

    if (WaitForNewData <= 0) {
        ThisSession.Name = Get("#SessionName").value;

        let StartTime = Date.now();
        CallServer(ThisSession, "Update", (Response) => {
            Get("#TotalSessions").innerHTML = "Total players: " + Response.TotalSessions;
            SessionsInGame = Response.AllSessionsInYourGame;
            Caltrops = Response.Caltrops || [];

            // For loop through all the server set properties
            Object.keys(Response.ServerSetProps).forEach((Key) => {
                ThisSession[Key] = Response.ServerSetProps[Key];
                console.log(`Updated: ${Key} to ${Response.ServerSetProps[Key]}`)
            });

            Ping.push(Date.now() - StartTime);
            let TotalPing = 0;
            for (let P of Ping)
                TotalPing += P;
            if (Ping.length > 30)
                Ping.splice(0, 1);
            TotalPing /= Ping.length;
            Get("#Ping").innerHTML = "Ping: " + Math.round(TotalPing) + "ms (round trip)";
        });
        WaitForNewData = 0;
    }

    if (ThisSession.Health > 0) {
      Camera.X += (ThisSession.X - innerWidth / 2 - Camera.X) / 10 * DT * 60;
      Camera.Y += (ThisSession.Y - innerHeight / 2 - Camera.Y) / 10 * DT * 60;
    }

    Canvas.width = innerWidth;
    Canvas.height = innerHeight;

    Ctx.clearRect(0, 0, Canvas.width, Canvas.height);
    Ctx.fillStyle = "black";
    Ctx.fillRect(0, 0, Canvas.width, Canvas.height);
    Ctx.strokeStyle = "white";
    Ctx.lineWidth = 4;
    Ctx.strokeRect(0 - Camera.X, 0 - Camera.Y, MAX_X, MAX_Y);

    DrawGameObjs();
    CalcPlayers();
    DrawPlayers();
    DrawDotsOOB();

    if (!SomethingWentWrong)
        requestAnimationFrame(Frame);
}