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
    this.MoveStunned = 0;
    this.TryingToSendMessage = null;

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
let Bullets = [];
let EMPs = [];
let ChatMessages = [];

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

document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener("error", (event) => {
    alert(`Uncaught error: ${event.error.message}\nFile: ${event.filename}\nLine: ${event.lineno}`);
  });
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

function SendChatMessage() {
  const Input = Get("#ChatInput");
  const Message = Input.value;
  if (Message) {
    CallServer(ThisSession, "SendChatMessage", (Response) => {
      if (Response && Response.Success) {
        Input.value = "";
      }
    });
  }
}

function ShowChatMessages() {
  const ChatDiv = Get("#ChatMessages");
  ChatDiv.innerHTML = "";
  for (let Msg of ChatMessages) {
    const MsgElement = document.createElement("div");
    MsgElement.className = "ChatMessage";
    MsgElement.innerHTML = `<strong>${Msg.SenderName}:</strong> ${Msg.MessageText}`;
    ChatDiv.appendChild(MsgElement);
  }
}

function DrawGameObjs() {
  for (let Caltrop of Caltrops) {
    if (!Caltrop) continue;

    const x = Caltrop.X - Camera.X;
    const y = Caltrop.Y - Camera.Y;
    const alpha = (Caltrop.LifeTime / 10) * 0.75 + 0.25;
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
      Ctx.lineTo(Math.cos(angle) * 24, Math.sin(angle) * 24);
      Ctx.lineWidth = 3;
      Ctx.stroke();
    }

    Ctx.restore();
  }

  for (let Bullet of Bullets) {
    if (!Bullet) continue;

    if (Bullet.X < 0 || Bullet.Y < 0 || Bullet.X > MAX_X || Bullet.Y > MAX_Y)
      continue;

    const x = Bullet.X - Camera.X;
    const y = Bullet.Y - Camera.Y;

    const color = (Bullet.OwnerId == ThisSession.Id)
      ? `rgb(127,255,127)`
      : `rgb(255,127,127)`;

    Ctx.beginPath();
    Ctx.fillStyle = color;
    Ctx.arc(x, y, 5, 0, 2 * Math.PI);
    Ctx.fill();
  }

  for (let EMP of EMPs) {
    if (!EMP) continue;

    const x = EMP.X - Camera.X;
    const y = EMP.Y - Camera.Y;

    Ctx.beginPath();
    Ctx.fillStyle = `rgba(0, 255, 255, 0.5)`;
    Ctx.arc(x, y, EMP.Size, 0, 2 * Math.PI);
    Ctx.fill();

    Ctx.beginPath();
    Ctx.strokeStyle = `rgba(0, 128, 128, 0.5)`;
    Ctx.arc(x, y, EMP.Size, 0, 2 * Math.PI);
    Ctx.lineWidth = 4;
    Ctx.stroke();
  }
}

function CalcPlayers(DT) {
  for (let Plr of SessionsInGame) {
    if (Plr == ThisSession || Plr.Health <= 0)
      continue

    Plr.X += Plr.VelX * DT * 60;
    Plr.Y += Plr.VelY * DT * 60;
    Plr.Rot += Plr.VelRot * DT * 60;
    if (Math.sqrt(Plr.VelX ** 2 + Plr.VelY ** 2) > 1) {
      Plr.VelX += (Math.cos(Plr.Rot) * Math.sqrt(Plr.VelX ** 2 + Plr.VelY ** 2) / 9) * DT * 60;
      Plr.VelY += (Math.sin(Plr.Rot) * Math.sqrt(Plr.VelX ** 2 + Plr.VelY ** 2) / 9) * DT * 60;
    }

    if (Plr.X < 0) Plr.X = 0;
    if (Plr.Y < 0) Plr.Y = 0;
    if (Plr.X > MAX_X) Plr.X = MAX_X;
    if (Plr.Y > MAX_Y) Plr.Y = MAX_Y;
  }
}

function CalcBullets(DT) {
  for (let Bullet of Bullets) {
    Bullet.X += Math.cos(Bullet.Direction) * 25 * DT * 60;
    Bullet.Y += Math.sin(Bullet.Direction) * 25 * DT * 60;
  }
}

function CalcEMPs(DT) {
  for (let EMP of EMPs) {
    if (EMP.LifeTime == undefined) EMP.LifeTime = 1;
    EMP.LifeTime -= DT * 2;
    if (!EMP.Size) EMP.Size = 0;
    EMP.Size += DT * 400;
    if (EMP.LifeTime <= 0) {
      EMPs.splice(EMPs.indexOf(EMP), 1);
    }
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
    if (Plr.MoveStunned > 0)
      Ctx.arc(Plr.X - Camera.X, Plr.Y - Camera.Y, 25, Plr.Rot, Plr.Rot + Math.PI * Math.random());
    else
      Ctx.arc(Plr.X - Camera.X, Plr.Y - Camera.Y, 25, Plr.Rot, Plr.Rot + Math.PI * (1 - (Plr.Move2CD / Plr.Move2MaxCD)));
    Ctx.strokeStyle = `rgba(255, ${Plr.Health * (255 / 100)}, ${Plr.Health * (255 / 100)}, .25)`;
    Ctx.lineWidth = 10;
    Ctx.stroke();
    Ctx.beginPath();
    if (Plr.MoveStunned > 0)
      Ctx.arc(Plr.X - Camera.X, Plr.Y - Camera.Y, 25, Plr.Rot - Math.PI * Math.random(), Plr.Rot);
    else
      Ctx.arc(Plr.X - Camera.X, Plr.Y - Camera.Y, 25, Plr.Rot - Math.PI * (1 - (Plr.Move1CD / Plr.Move1MaxCD)), Plr.Rot);
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

function DrawDots() {
  Ctx.fillStyle = "white";
  for (let i = -2; i < 32; i++) {
    for (let j = -2; j < 32; j++) {
      let XStep = innerWidth / 30;
      let YStep = innerHeight / 30;
      let Step = Math.max(XStep, YStep);
      XStep = YStep = Step;
      let XPos = i * XStep + (XStep / 2) - Camera.X / 10;
      let YPos = j * YStep + (YStep / 2) - Camera.Y / 10;

      if (XPos + Camera.X > 0 && XPos + Camera.X < MAX_X && YPos + Camera.Y > 0 && YPos + Camera.Y < MAX_Y) {
        continue;
      }

      Ctx.beginPath();
      Ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      Ctx.arc(XPos, YPos, 5, 0, 2*Math.PI);
      Ctx.fill();
    }
  }

  for (let i = 0; i < 25; i++) {
    for (let j = 0; j < 25; j++) {
      let XStep = MAX_X / 25;
      let YStep = MAX_Y / 25;
      let Step = Math.max(XStep, YStep);
      XStep = YStep = Step;
      let XPos = i * XStep + (XStep / 2);
      let YPos = j * YStep + (YStep / 2);

      if (XPos < 0 && XPos > MAX_X && YPos < 0 && YPos > MAX_Y) {
        continue;
      }

      Ctx.beginPath();
      Ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      Ctx.arc(XPos - Camera.X, YPos - Camera.Y, 2, 0, 2*Math.PI);
      Ctx.fill();
    }
  }
}

function DrawLeaderboard() {
  Ctx.beginPath();
  Ctx.roundRect(innerWidth - 220, 20, 200, 300, 10);
  Ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  Ctx.fill();
  Ctx.strokeStyle = "white";
  Ctx.lineWidth = 4;
  Ctx.stroke();

  // Sort players by kills (descending)
  const PlayersByKills = SessionsInGame.slice().sort((A, B) => {
    const KA = A.Kills || 0;
    const KB = B.Kills || 0;
    return KB - KA;
  });

  // Header
  Ctx.fillStyle = "white";
  Ctx.font = "16px monospace";
  Ctx.textAlign = "left";
  Ctx.fillText("Leaderboard", innerWidth - 208, 44);

  // Column labels
  Ctx.font = "12px monospace";
  Ctx.fillStyle = "rgba(255,255,255,0.8)";
  Ctx.fillText("Player", innerWidth - 208, 64);
  Ctx.textAlign = "right";
  Ctx.fillText("Kills", innerWidth - 28, 64);

  // List top players
  const StartY = 84;
  const LineHeight = 22;
  const MaxLines = Math.floor((300 - (StartY - 20)) / LineHeight);

  for (let I = 0; I < Math.min(PlayersByKills.length, MaxLines); I++) {
    const Player = PlayersByKills[I];
    const Name = Player?.Name ? String(Player.Name) : "Unnamed";
    const Kills = typeof Player?.Kills === "number" ? Player.Kills : 0;
    const Y = StartY + I * LineHeight;

    // Highlight local player
    Ctx.fillStyle = Player?.Id == ThisSession.Id ? "lime" : "white";
    Ctx.textAlign = "left";

    // Build name string
    let DisplayName = `${I + 1}. ${Name}`;
    let FontSize = 14;
    const MaxWidth = 180;

    // Shrink text until it fits
    do {
      Ctx.font = `${FontSize}px monospace`;
      if (Ctx.measureText(DisplayName).width <= MaxWidth) break;
      FontSize -= 1;
    } while (FontSize > 8);

    // If still too long, truncate
    while (Ctx.measureText(DisplayName).width > MaxWidth && DisplayName.length > 5) {
      DisplayName = DisplayName.slice(0, -4) + "...";
    }

    Ctx.fillText(DisplayName, innerWidth - 208, Y);

    // Draw kills aligned to the right
    Ctx.textAlign = "right";
    Ctx.font = `${FontSize}px monospace`;
    Ctx.fillText(String(Kills), innerWidth - 28, Y);
  }
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
    ThisSession.Move1CD = 2;
  }

  if (ThisSession.Move1 == "Phase Dash") {
    ThisSession.Move1CD = 7.5;
    ThisSession.VelX = 0;
    ThisSession.VelY = 0;
    ThisSession.X += Math.cos(ThisSession.Rot) * 400;
    ThisSession.Y += Math.sin(ThisSession.Rot) * 400;
    ThisSession.VelX = 0;
    ThisSession.VelY = 0;
  }

  if (ThisSession.Move1 == "Quick Spin") {
    ThisSession.Rot += Math.PI;
    ThisSession.VelX *= -1;
    ThisSession.VelY *= -1;
  }

  if (ThisSession.Move1 == "Caltrop") {
    ThisSession.Move1CD = 3.5;
    CallServer(ThisSession, "CreateCaltrop", (Response) => {
      ThisSession.Move1CD = 3.5;
    });
  }

  if (ThisSession.Move1 == "Shoot") {
    ThisSession.Move1CD = 2.5;
    CallServer(ThisSession, "CreateBullet", (Response) => {
      ThisSession.Move1CD = 2.5;
    });
  }

  if (ThisSession.Move1 == "EMP") {
    ThisSession.Move1CD = 10;
    CallServer(ThisSession, "CreateEMP", (Response) => {
      ThisSession.Move1CD = 10;
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
    ThisSession.Move2CD = 2;
  }

  if (ThisSession.Move2 == "Phase Dash") {
    ThisSession.Move2CD = 7.5;
    ThisSession.VelX = 0;
    ThisSession.VelY = 0;
    ThisSession.X += Math.cos(ThisSession.Rot) * 400;
    ThisSession.Y += Math.sin(ThisSession.Rot) * 400;
    ThisSession.VelX = 0;
    ThisSession.VelY = 0;
  }

  if (ThisSession.Move2 == "Quick Spin") {
    ThisSession.Rot += Math.PI;
    ThisSession.VelX *= -1;
    ThisSession.VelY *= -1;
  }

  if (ThisSession.Move2 == "Caltrop") {
    ThisSession.Move2CD = 3.5;
    CallServer(ThisSession, "CreateCaltrop", (Response) => {
      ThisSession.Move2CD = 3.5;
    });
  }

  if (ThisSession.Move2 == "Shoot") {
    ThisSession.Move2CD = 2.5;
    CallServer(ThisSession, "CreateBullet", (Response) => {
      ThisSession.Move2CD = 2.5;
    });
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

  if (IsKeyDown(Get("#ForwardControl").value.toLowerCase())) {
    ThisSession.VelX += Math.cos(ThisSession.Rot) * DT * 60 / 2;
    ThisSession.VelY += Math.sin(ThisSession.Rot) * DT * 60 / 2;
  }

  ThisSession.VelX *= Math.pow(1 / 1.06, DT * 60);
  ThisSession.VelY *= Math.pow(1 / 1.06, DT * 60);
  ThisSession.VelRot = 0;
  if (IsKeyDown(Get("#LeftControl").value.toLowerCase()))
    ThisSession.VelRot -= 0.1;
  if (IsKeyDown(Get("#RightControl").value.toLowerCase()))
    ThisSession.VelRot += 0.1;

  if (SessionsInGame.findIndex(Plr => Plr.Id == ThisSession.Id) == -1) {
    SessionsInGame.push(ThisSession);
  } else {
    SessionsInGame[SessionsInGame.findIndex(Plr => Plr.Id == ThisSession.Id)] = ThisSession;
  }

  ThisSession.Move1CD = Math.max(0, ThisSession.Move1CD - DT);
  ThisSession.Move2CD = Math.max(0, ThisSession.Move2CD - DT);

  if (IsKeyDown(Get("#Move1Control").value.toLowerCase()) && ThisSession.MoveStunned == false) {
    let ShouldSetMaxCD = ThisSession.Move1CD <= 0;
    if (ThisSession.Move1 != "Quick Spin")
      Move1();
    else if (LastKDown == false)
      Move1();
    if (ShouldSetMaxCD)
      ThisSession.Move1MaxCD = Math.max(ThisSession.Move1CD, 0.01);
  } 
  if (IsKeyDown(Get("#Move2Control").value.toLowerCase()) && ThisSession.MoveStunned == false) {
    let ShouldSetMaxCD = ThisSession.Move2CD <= 0;
    if (ThisSession.Move2 != "Quick Spin")
      Move2();
    else if (LastLDown == false)
      Move2();
    if (ShouldSetMaxCD)
      ThisSession.Move2MaxCD = Math.max(ThisSession.Move2CD, 0.01);
  }
  LastKDown = IsKeyDown(Get("#Move1Control").value.toLowerCase());
  LastLDown = IsKeyDown(Get("#Move2Control").value.toLowerCase());

  ThisSession.X += ThisSession.VelX * DT * 60;
  ThisSession.Y += ThisSession.VelY * DT * 60;
  ThisSession.Rot += ThisSession.VelRot * DT * 60;

  if (ThisSession.Health > 0) {
    if (ThisSession.X < 0) ThisSession.VelX *= -1.5;
    if (ThisSession.X < 0) ThisSession.X = 0;
    if (ThisSession.Y < 0) ThisSession.VelY *= -1.5;
    if (ThisSession.Y < 0) ThisSession.Y = 0;
    if (ThisSession.X > MAX_X) ThisSession.VelX *= -1.5;
    if (ThisSession.X > MAX_X) ThisSession.X = MAX_X;
    if (ThisSession.Y > MAX_Y) ThisSession.VelY *= -1.5;
    if (ThisSession.Y > MAX_Y) ThisSession.Y = MAX_Y;
    if (ThisSession.X < 100) ThisSession.VelX += (100 - ThisSession.X) / 250 * DT * 60;
    if (ThisSession.Y < 100) ThisSession.VelY += (100 - ThisSession.Y) / 250 * DT * 60;
    if (ThisSession.X > MAX_X - 100) ThisSession.VelX -= (ThisSession.X - (MAX_X - 100)) / 250 * DT * 60;
    if (ThisSession.Y > MAX_Y - 100) ThisSession.VelY -= (ThisSession.Y - (MAX_Y - 100)) / 250 * DT * 60;
  }

  if (ThisSession.ResetPos == true && ThisSession.Health <= 0) {
    ThisSession.X = Math.round(Math.random() * MAX_X);
    ThisSession.Y = Math.round(Math.random() * MAX_Y);
    ThisSession.ResetPos = false;
    ThisSession.Health = 100;
    CallServer(ThisSession, "HasResetPos", (Response) => {});
  }

  WaitForNewData -= 1 * DT;

  if (WaitForNewData <= 0) {
    ThisSession.Name = Get("#SessionName").value;

    let StartTime = Date.now();
    CallServer(ThisSession, "Update", (Response) => {
      if (!Response || SomethingWentWrong) {
        return;
      }

      Get("#TotalSessions").innerHTML = "Total players: " + Response.TotalSessions;
      SessionsInGame = Response.AllSessionsInYourGame;
      Caltrops = Response.Caltrops || [];
      Bullets = Response.Bullets || [];

      for (let EMP of Response.EMPs || []) {
        EMPs.push(EMP);
      }

      ChatMessages = Response.ChatMessages || [];

      // For loop through all the server set properties
      if (Response.ServerSetProps == undefined)
        return;
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
      TotalPing = Math.round(TotalPing);
      Get("#Ping").innerHTML = "Ping: " + TotalPing + "ms (round trip)";
      if (TotalPing <= 50) {
        Get("#Ping").style.color = "lime";
      } else if (TotalPing <= 100) {
        Get("#Ping").style.color = "yellow";
      } else {
        Get("#Ping").style.color = "red";
      }
    });
    WaitForNewData += (2 / 60);
  }

  ShowChatMessages();

  if (ThisSession.Health > 0) {
    Camera.X += (ThisSession.X - innerWidth / 2 - Camera.X) / 10 * DT * 60;
    Camera.Y += (ThisSession.Y - innerHeight / 2 - Camera.Y) / 10 * DT * 60;
  }

  Get("#Log").innerHTML = EMPs.map((EMP, Index) => {
    return `EMP ${Index}: X=${EMP.X}, Y=${EMP.Y}, LifeTime=${EMP.LifeTime}, Size=${EMP.Size}`;
  }).join("<br>");

  Canvas.width = innerWidth;
  Canvas.height = innerHeight;

  Ctx.clearRect(0, 0, Canvas.width, Canvas.height);
  Ctx.fillStyle = "black";
  Ctx.fillRect(0, 0, Canvas.width, Canvas.height);
  Ctx.strokeStyle = "white";
  Ctx.lineWidth = 4;
  Ctx.strokeRect(0 - Camera.X, 0 - Camera.Y, MAX_X, MAX_Y);

  DrawDots();
  CalcBullets(DT);
  CalcEMPs(DT);
  DrawGameObjs();
  CalcPlayers(DT);
  DrawPlayers();
  DrawLeaderboard();

  if (ThisSession.Health <= 0) {
    Ctx.beginPath();
    Ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    Ctx.font = "48px monospace";
    Ctx.textAlign = "center";
    Ctx.fillText("You have been eliminated!", innerWidth / 2, innerHeight / 2);
    Ctx.font = "24px monospace";
    let RespawnTime = Math.floor(ThisSession.RespawnTime);
    Ctx.fillText(`Respawning in ${RespawnTime} seconds...`, innerWidth / 2, innerHeight / 2 + 40);
  }

  if (!SomethingWentWrong)
    requestAnimationFrame(Frame);
}
