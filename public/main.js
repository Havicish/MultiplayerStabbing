'use scrict';

/** @type { HTMLCanvasElement } */
let Canvas;
/** @type { CanvasRenderingContext2D } */
let Ctx;

let SomethingWentWrong = false;
let NetworkErrorsUntilStop = 0;

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
    this.Move1 = "Dash";
    this.Move2 = "Dash";
    this.ResetPos = false;
    this.MoveStunned = 0;
    this.TryingToSendMessage = null;
    this.IsDev = false; // This doesn't do anything execpt for the icon. (only cosmetic)
    this.DevPassword = ""; // Nuh uh bit-
    this.Color = "#FF0000";
    this.ParryingTime = -1;
    this.Speed = 0.5;
    this.Invincibility = false;
    this.Alpha = 1;

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
let Shockwaves = [];
let ChatMessages = [];
let GhostChars = [];
let DamageIndicators = [];
let CookieJSON = {};

let ThisSession = new Session(Math.round(Math.random() * 100000000000));
console.log(`Your session id is: ${ThisSession.Id}\nDon't share it with anyone!`)

document.addEventListener("DOMContentLoaded", () => {
  Canvas = Get("#Canvas");
  Ctx = Canvas.getContext("2d");

  CallServer(ThisSession, "Update", (Response) => {
    Get("#TotalSessions").innerHTML = "Total players: " + Response.TotalSessions;
    SessionsInGame = Response.AllSessionsInYourGame;
  });

  Get("#ChatSend").addEventListener("click", () => {
    SendChatMessage();
  });

  let CookieJSON = LoadCookieToJSON();

  Get("#SessionName").value = CookieJSON["Name"] || ThisSession.Name;
  ThisSession.Name = Get("#SessionName").value;
  Get("#Move1").value = CookieJSON["Move1"] || "Dash";
  ThisSession.Move1 = Get("#Move1").value;
  Get("#Move2").value = CookieJSON["Move2"] || "Dash";
  ThisSession.Move2 = Get("#Move2").value;
  Get("#ForwardControl").value = CookieJSON["ForwardControl"] || "W";
  Get("#LeftControl").value = CookieJSON["LeftControl"] || "A";
  Get("#RightControl").value = CookieJSON["RightControl"] || "D";
  Get("#Move1Control").value = CookieJSON["Move1Control"] || "K";
  Get("#Move2Control").value = CookieJSON["Move2Control"] || "L";

  Get("#CharColor").value = CookieJSON["CharColor"] || "#ff0000";

  Get("#JoinPublicServer1").addEventListener("click", () => {
    Get("#GameName").value = "Jou-sting! server 1";
    MakeGame();
  });

  Get("#JoinPublicServer2").addEventListener("click", () => {
    Get("#GameName").value = "Jou-sting! server 2";
    MakeGame();
  });

  Get("#JoinPublicServer3").addEventListener("click", () => {
    Get("#GameName").value = "Jou-sting! server 3";
    MakeGame();
  });

  let DamageButton = Get("#DevTakeDamage");
  DamageButton.addEventListener("click", () => {
    if (DamageButton.style.backgroundColor == "rgb(255, 0, 0)")
      DamageButton.style.backgroundColor = "rgb(0, 255, 0)";
    else
      DamageButton.style.backgroundColor = "rgb(255, 0, 0)";
  });

  Frame();
});

let Mouse = {X: 0, Y: 0}
document.addEventListener("mousemove", (Event) => {
  Mouse.X = Event.clientX;
  Mouse.Y = Event.clientY;
});

let KeysDown = [];
let KeysDownDuringChat = [];
document.addEventListener("keydown", (Event) => {
  if (Event.key == null)
    return;

  if (KeysDown.indexOf(Event.key.toLowerCase()) == -1 && Get("#ChatInput") != document.activeElement)
    KeysDown.push(Event.key.toLowerCase());

  if (KeysDownDuringChat.indexOf(Event.key.toLowerCase()) == -1 && Get("#ChatInput") == document.activeElement)
    KeysDownDuringChat.push(Event.key.toLowerCase());

  if ((Event.key == "t" || Event.key == "T" || Event.key == "Enter") && Get("#ChatInput") != document.activeElement) {
    setTimeout(() => {
      Get("#ChatInput").focus();
      for (let Key of KeysDown)
        KeysDownDuringChat.push(Key);
    }, 10);
  }

  if (Event.key == "Enter" && document.activeElement.id == "ChatInput" && Get("#ChatInput") == document.activeElement) {
    let ToggleChat = Get("#ToggleChat");
    let Msgs = Get("#ChatMessages");
    if (ToggleChat.innerText == "Show") {
      setTimeout(() => {
        ToggleChat.innerText = "Show";
    Msgs.style.display = "none";
      }, 5000);
    }
    ToggleChat.innerText = "Hide";
    Msgs.style.display = "inline";
    SendChatMessage();
    KeysDown = KeysDownDuringChat;
    KeysDownDuringChat = [];
  }
});
document.addEventListener("keyup", (Event) => {
  if (Event.key == null)
    return;

  if (Get("#ChatInput") != document.activeElement)
    KeysDown.splice(KeysDown.indexOf(Event.key.toLowerCase()), 1);
  else
    KeysDownDuringChat.splice(KeysDownDuringChat.indexOf(Event.key.toLowerCase()), 1);
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
    NetworkErrorsUntilStop += 1;
    if (NetworkErrorsUntilStop >= 5) {
      SetScreen("SomethingWentWrong");
      SomethingWentWrong = true;
    }
    //throw new Error('Network error occurred.');
  };

  // Send the data as a JSON string
  Xhr.send(JSON.stringify({ Message: Data }));
}

function MakeGame() {
  ThisSession.Move1 = Get("#Move1").value;
  ThisSession.Move2 = Get("#Move2").value;

  ThisSession.Move1MaxCD = 0.01;
  ThisSession.Move2MaxCD = 0.01;

  ThisSession.Color = Get("#CharColor").value;

  SaveItemToCookiesToJSON("Move1", ThisSession.Move1);
  SaveItemToCookiesToJSON("Move2", ThisSession.Move2);
  SaveItemToCookiesToJSON("Name", ThisSession.Name);
  SaveItemToCookiesToJSON("ForwardControl", Get("#ForwardControl").value);
  SaveItemToCookiesToJSON("LeftControl", Get("#LeftControl").value);
  SaveItemToCookiesToJSON("RightControl", Get("#RightControl").value);
  SaveItemToCookiesToJSON("Move1Control", Get("#Move1Control").value);
  SaveItemToCookiesToJSON("Move2Control", Get("#Move2Control").value);
  SaveItemToCookiesToJSON("CharColor", Get("#CharColor").value);

  CallServer({ Name: Get("#GameName").value }, "MakeGame", (Response) => {
    ThisSession.Game = Response;
    SetScreen("Game");
    console.log(`Made and joined game:\n${Response.Id}, ${Response.Name}`);

    ThisSession.DevPassword = Get("#DeveloperPassword").value;
    CallServer(ThisSession, "CheckForDev", () => {});
  });
}

function JoinGame() {
  ThisSession.Move1 = Get("#Move1").value;
  ThisSession.Move2 = Get("#Move2").value;

  ThisSession.Move1MaxCD = 0.01;
  ThisSession.Move2MaxCD = 0.01;

  ThisSession.Color = Get("#CharColor").value;

  SaveItemToCookiesToJSON("Move1", ThisSession.Move1);
  SaveItemToCookiesToJSON("Move2", ThisSession.Move2);
  SaveItemToCookiesToJSON("Name", ThisSession.Name);
  SaveItemToCookiesToJSON("ForwardControl", Get("#ForwardControl").value);
  SaveItemToCookiesToJSON("LeftControl", Get("#LeftControl").value);
  SaveItemToCookiesToJSON("RightControl", Get("#RightControl").value);
  SaveItemToCookiesToJSON("Move1Control", Get("#Move1Control").value);
  SaveItemToCookiesToJSON("Move2Control", Get("#Move2Control").value);
  SaveItemToCookiesToJSON("CharColor", Get("#CharColor").value);

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

    ThisSession.DevPassword = Get("#DeveloperPassword").value;
    CallServer(ThisSession, "CheckForDev", () => {});
  });
}

function LoadCookieToJSON() {
  let CookieJSON = {};
  if (document.cookie && document.cookie.trim() != "") {
    document.cookie.split("; ").forEach(cookieStr => {
      const [Key, Value] = cookieStr.split("=");
      if (Key && Value != undefined) {
        CookieJSON[decodeURIComponent(Key)] = decodeURIComponent(Value);
      }
    });
  }
  return CookieJSON;
}

function SaveItemToCookiesToJSON(ItemId, Value) {
  let CookieJSON = LoadCookieToJSON();
  CookieJSON[ItemId] = Value;
  document.cookie = `${encodeURIComponent(ItemId)}=${encodeURIComponent(Value)}; path=/`;
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
  ThisSession.TryingToSendMessage = Message;
  Input.value = "";
  Input.blur();
  if (Message) {
    CallServer(ThisSession, "SendChatMessage", (Response) => {});
  }
}

function ShowChatMessages() {
  const ChatDiv = Get("#ChatMessages");
  // consider we're at bottom if within 10px of the end
  const atBottom = ChatDiv.scrollHeight - (ChatDiv.scrollTop + ChatDiv.clientHeight) <= 10;

  const prevCount = ShowChatMessages._lastCount || 0;
  const newMessageArrived = ChatMessages.length > prevCount;

  ChatDiv.innerHTML = "";
  for (let Msg of ChatMessages) {
    const MsgElement = document.createElement("div");
    MsgElement.className = "ChatMessage";
    MsgElement.innerHTML = `<strong>${Msg.SenderName}:</strong> ${Msg.MessageText}`;
    ChatDiv.appendChild(MsgElement);
  }

  ShowChatMessages._lastCount = ChatMessages.length;

  // only auto-scroll if a new message arrived and the user was already at the bottom
  if (newMessageArrived && atBottom) {
    ChatDiv.scrollTop = ChatDiv.scrollHeight;
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

  for (let Wave of Shockwaves) {
    if (!Wave) continue;

    const x = Wave.X - Camera.X;
    const y = Wave.Y - Camera.Y;

    Ctx.beginPath();
    Ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
    Ctx.arc(x, y, Wave.Size, 0, 2 * Math.PI);
    Ctx.lineWidth = 16;
    Ctx.stroke();
  }
}

function DrawDamageIndicators() {
  for (let Indicator of DamageIndicators) {
    if (Indicator.Amount > 0)
      Ctx.fillStyle = "rgb(0, 255, 0)";
    else if (Indicator.Amount < 0)
      Ctx.fillStyle = "rgb(255, 0, 0)";
    else
      Ctx.fillStyle = "rgb(255, 255, 255)";

    Ctx.save();
    Ctx.textAlign = "center";
    Ctx.textBaseline = "middle";
    Ctx.font = "16px bold monospace";
    Ctx.globalAlpha = Indicator.Alpha;
    Ctx.fillText(Math.abs(Indicator.Amount), Indicator.X - Camera.X, Indicator.Y - Camera.Y);
    Ctx.restore();
  }
}

function CalcPlayers(DT) {
  for (let Plr of SessionsInGame) {
    if (Plr == ThisSession || Plr.Health <= 0)
      continue

    Plr.X += Plr.VelX * DT * 60 * Plr.Speed;
    Plr.Y += Plr.VelY * DT * 60 * Plr.Speed;
    Plr.Rot += Plr.VelRot * DT * 60;
    if (Math.sqrt(Plr.VelX ** 2 + Plr.VelY ** 2) > 1) {
      Plr.VelX += (Math.cos(Plr.Rot) * Math.sqrt(Plr.VelX ** 2 + Plr.VelY ** 2) / 9) * DT * 60;
      Plr.VelY += (Math.sin(Plr.Rot) * Math.sqrt(Plr.VelX ** 2 + Plr.VelY ** 2) / 9) * DT * 60;
    }

    if (Plr.X < 0) Plr.X = 0;
    if (Plr.Y < 0) Plr.Y = 0;
    if (Plr.X > MAX_X) Plr.X = MAX_X;
    if (Plr.Y > MAX_Y) Plr.Y = MAX_Y;

    Plr.ParryingTime -= DT;
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
    EMP.Size += DT * 1200;
    if (EMP.LifeTime <= 0) {
      EMPs.splice(EMPs.indexOf(EMP), 1);
    }
  }
}

function CalcShockwavess(DT) {
  for (let Wave of Shockwaves) {
    if (Wave.LifeTime == undefined) Wave.LifeTime = 1;
    Wave.LifeTime -= DT * 2;
    if (!Wave.Size) Wave.Size = 0;
    Wave.Size += DT * 1200;
    if (Wave.LifeTime <= 0) {
      Shockwaves.splice(Shockwaves.indexOf(Wave), 1);
    }
  }
}

function DrawPlayer(Plr) {
  if (Plr.Health <= 0)
    return;

  let DefaultCharColor = Plr.Color;

  // Extract RGB from DefaultCharColor (assuming it's in hex like "#RRGGBB")
  let R = parseInt(DefaultCharColor.slice(1, 3), 16);
  let G = parseInt(DefaultCharColor.slice(3, 5), 16);
  let B = parseInt(DefaultCharColor.slice(5, 7), 16);

  let HealthRatio = Plr.Health / 100;

  let InterpR = 255 - (255 - R) * (1 - HealthRatio);
  let InterpG = 255 - (255 - G) * (1 - HealthRatio);
  let InterpB = 255 - (255 - B) * (1 - HealthRatio);

  let Color = `rgba(${InterpR}, ${InterpG}, ${InterpB}, ${Plr.Alpha})`;
  let ColorA25 = `rgba(${InterpR}, ${InterpG}, ${InterpB}, ${Plr.Alpha * 0.25})`;
  let NameColor = `rgba(${R}, ${G}, ${B}, ${Plr.Alpha})`

  Ctx.beginPath();
  Ctx.fillStyle = Color;
  Ctx.arc(Plr.X - Camera.X, Plr.Y - Camera.Y, 10, 0, 2 * Math.PI);
  Ctx.fill();
  Ctx.beginPath();
  if (Plr.MoveStunned > 0)
    Ctx.arc(Plr.X - Camera.X, Plr.Y - Camera.Y, 25, Plr.Rot, Plr.Rot + Math.PI * Math.random());
  else
    Ctx.arc(Plr.X - Camera.X, Plr.Y - Camera.Y, 25, Plr.Rot, Plr.Rot + Math.PI * (1 - (Plr.Move2CD / Plr.Move2MaxCD)));
  Ctx.strokeStyle = ColorA25;
  Ctx.lineWidth = 10;
  Ctx.stroke();
  Ctx.beginPath();
  if (Plr.MoveStunned > 0)
    Ctx.arc(Plr.X - Camera.X, Plr.Y - Camera.Y, 25, Plr.Rot - Math.PI * Math.random(), Plr.Rot);
  else
    Ctx.arc(Plr.X - Camera.X, Plr.Y - Camera.Y, 25, Plr.Rot - Math.PI * (1 - (Plr.Move1CD / Plr.Move1MaxCD)), Plr.Rot);
  Ctx.strokeStyle = ColorA25;
  Ctx.lineWidth = 10;
  Ctx.stroke();
  Ctx.beginPath();
  Ctx.arc(Plr.X - Camera.X, Plr.Y - Camera.Y, 25, 0, Math.PI*2);
  Ctx.strokeStyle = `rgba(255, 255, 255, ${Plr.Alpha * 0.15})`;
  Ctx.stroke();
  Ctx.beginPath();
  Ctx.strokeStyle = `rgba(255, 255, 255, ${Plr.Alpha})`;
  Ctx.moveTo(Plr.X + Math.cos(Plr.Rot) * 5 - Camera.X, Plr.Y + Math.sin(Plr.Rot) * 5 - Camera.Y);
  Ctx.lineTo(Plr.X + Math.cos(Plr.Rot) * 60 - Camera.X, Plr.Y + Math.sin(Plr.Rot) * 60 - Camera.Y);
  Ctx.lineWidth = 1;
  Ctx.stroke();
  Ctx.beginPath();
  Ctx.fillStyle = NameColor;
  Ctx.font = "12px monospace"
  Ctx.fillText(Plr.Name, Plr.X - Plr.Name.length * 12 * 3/10 - Camera.X, Plr.Y - 20 - Camera.Y);
  Ctx.beginPath();
  Ctx.lineWidth = 8;
  Ctx.arc(Plr.X - Camera.X, Plr.Y - Camera.Y, 40, 0, Math.PI * 2);
  let SheildAlpha = Plr.ParryingTime * 4 + 1;
  Ctx.strokeStyle = `rgba(255, 255, 255, ${SheildAlpha * Plr.Alpha})`;
  Ctx.stroke();
}

function DrawPlayers() {
  for (let Plr of SessionsInGame) {
    DrawPlayer(Plr);
  }
  for (let Plr of GhostChars) {
    DrawPlayer(Plr);
  }

  Ctx.save();
  let Img = Get("#DevIconImg")
  for (Plr of SessionsInGame) {
    if (Plr.IsDev == true && Plr.Health > 0) {
      Ctx.globalAlpha = 0.5 * Math.max(Plr.Alpha, 0);
      Ctx.drawImage(Img, Plr.X - Camera.X - 16, Plr.Y - Camera.Y - 64, 32, 32);
    }
  }
  for (Plr of GhostChars) {
    if (Plr.IsDev == true && Plr.Health > 0) {
      Ctx.globalAlpha = 0.5 * Math.max(Plr.Alpha, 0);
      Ctx.drawImage(Img, Plr.X - Camera.X - 16, Plr.Y - Camera.Y - 64, 32, 32);
    }
  }
  Ctx.restore();

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
    ThisSession.VelX = Math.cos(ThisSession.Rot + Math.PI) * 50;
    ThisSession.VelY = Math.sin(ThisSession.Rot + Math.PI) * 50;
    ThisSession.Move1CD = 2;
  }

  if (ThisSession.Move1 == "Phase Dash") {
    ThisSession.Move1CD = 6;
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

  if (ThisSession.Move1 == "Shockwave") {
    ThisSession.Move1CD = 5;
    CallServer(ThisSession, "CreateShockwave", (Response) => {
      ThisSession.Move1CD = 5;
    });
  }

  if (ThisSession.Move1 == "Parry++") {
    ThisSession.Move1CD = 8;
    CallServer(ThisSession, "StartParry", (Response) => {
      ThisSession.Move1CD = 8;
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
    ThisSession.VelX = Math.cos(ThisSession.Rot + Math.PI) * 50;
    ThisSession.VelY = Math.sin(ThisSession.Rot + Math.PI) * 50;
    ThisSession.Move2CD = 2;
  }

  if (ThisSession.Move2 == "Phase Dash") {
    ThisSession.Move2CD = 6;
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

  if (ThisSession.Move2 == "EMP") {
    ThisSession.Move2CD = 10;
    CallServer(ThisSession, "CreateEMP", (Response) => {
      ThisSession.Move2CD = 10;
    });
  }

  if (ThisSession.Move2 == "Shockwave") {
    ThisSession.Move2CD = 5;
    CallServer(ThisSession, "CreateShockwave", (Response) => {
      ThisSession.Move2CD = 5;
    });
  }

  if (ThisSession.Move2 == "Parry++") {
    ThisSession.Move2CD = 8;
    CallServer(ThisSession, "StartParry", (Response) => {
      ThisSession.Move2CD = 8;
    });
  }
}

let WaitForNewData = 4;
let LastKDown = false;
let LastLDown = false;
let LastJDown = false;
let Ping = [];
let LastRecTime = Date.now();
let LastHealth = ThisSession.Health;
function Frame() {
  let DT = Math.min((Date.now() - LastRecTime) / 1000, 0.5);
  LastRecTime = Date.now();

  if (IsKeyDown(Get("#ForwardControl").value.toLowerCase())) {
    if (ThisSession.Move2 != "Passive Faster Speed") {
      ThisSession.VelX += Math.cos(ThisSession.Rot) * DT * 60 * ThisSession.Speed;
      ThisSession.VelY += Math.sin(ThisSession.Rot) * DT * 60 * ThisSession.Speed;
    } else {
      ThisSession.VelX += Math.cos(ThisSession.Rot) * DT * 60 * (ThisSession.Speed + 0.5 * 0.2);
      ThisSession.VelY += Math.sin(ThisSession.Rot) * DT * 60 * (ThisSession.Speed + 0.5 * 0.2);
    }
  }

  ThisSession.VelX *= Math.pow(1 / 1.06, DT * 60);
  ThisSession.VelY *= Math.pow(1 / 1.06, DT * 60);
  ThisSession.VelRot = 0;
  if (IsKeyDown(Get("#LeftControl").value.toLowerCase()))
    if (ThisSession.Move2 != "Passive Faster Turning")
      ThisSession.VelRot -= 0.1;
    else
      ThisSession.VelRot -= 0.1 * 1.3;
  if (IsKeyDown(Get("#RightControl").value.toLowerCase()))
    if (ThisSession.Move2 != "Passive Faster Turning")
      ThisSession.VelRot += 0.1;
    else
      ThisSession.VelRot += 0.1 * 1.3;

  if (SessionsInGame.findIndex(Plr => Plr.Id == ThisSession.Id) == -1) {
    SessionsInGame.push(ThisSession);
  } else {
    SessionsInGame[SessionsInGame.findIndex(Plr => Plr.Id == ThisSession.Id)] = ThisSession;
  }

  if (ThisSession.Move2 != "Passive Faster Cooldowns") {
    ThisSession.Move1CD = Math.max(0, ThisSession.Move1CD - DT);
    ThisSession.Move2CD = Math.max(0, ThisSession.Move2CD - DT);
  } else {
    ThisSession.Move1CD = Math.max(0, ThisSession.Move1CD - DT * 2.25);
    ThisSession.Move2CD = Math.max(0, ThisSession.Move2CD - DT * 2.25);
  }

  ThisSession.MoveStunned -= DT;

  if (IsKeyDown(Get("#Move1Control").value.toLowerCase()) && ThisSession.MoveStunned <= 0) {
    let ShouldSetMaxCD = ThisSession.Move1CD <= 0;
    if (ThisSession.Move1 != "Quick Spin")
      Move1();
    else if (LastKDown == false)
      Move1();
    if (ShouldSetMaxCD)
      ThisSession.Move1MaxCD = Math.max(ThisSession.Move1CD, 0.01);
  } 
  if (IsKeyDown(Get("#Move2Control").value.toLowerCase()) && ThisSession.MoveStunned <= 0) {
    let ShouldSetMaxCD = ThisSession.Move2CD <= 0;
    if (ThisSession.Move2 != "Quick Spin")
      Move2();
    else if (LastLDown == false)
      Move2();
    if (ShouldSetMaxCD)
      ThisSession.Move2MaxCD = Math.max(ThisSession.Move2CD, 0.01);
  }

  if (IsKeyDown("j") && !LastJDown) {
    //CallServer(ThisSession, "KillSelf", (Response) => {});
  }

  LastKDown = IsKeyDown(Get("#Move1Control").value.toLowerCase());
  LastLDown = IsKeyDown(Get("#Move2Control").value.toLowerCase());
  LastJDown = IsKeyDown("j");

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
  } else {
    ThisSession.X = -512;
    ThisSession.Y = -512;
    ThisSession.VelX = 0;
    ThisSession.VelY = 0;
    ThisSession.Rot = 0;
  }

  if (ThisSession.Health > 0 && LastHealth <= 0) {
    ThisSession.X = Math.round(Math.random() * MAX_X);
    ThisSession.Y = Math.round(Math.random() * MAX_Y);
  }
  LastHealth = ThisSession.Health;

  ThisSession.Invincibility = Get("#DevTakeDamage").style.backgroundColor == "rgb(0, 255, 0)";
  Get("#DevTakeDamage").style.display = ThisSession.IsDev ? "inline" : "none";

  WaitForNewData -= 1 * DT;
  NetworkErrorsUntilStop -= DT / 4;

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
      ChatMessages = Response.ChatMessages || [];
      GhostChars = Response.GhostChars || [];
      DamageIndicators = Response.DamageIndicators || [];

      for (let EMP of Response.EMPs || []) {
        EMPs.push(EMP);
      }

      for (let Wave of Response.Shockwaves || []) {
        Shockwaves.push(Wave);
      }

      // For loop through all the server set properties
      if (Response.ServerSetProps == undefined)
        return;
      Object.keys(Response.ServerSetProps).forEach((Key) => {
        ThisSession[Key] = Response.ServerSetProps[Key];
        if (Key != "ParryingTime")
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
      Get("#DevTakeDamage").style.left = `${Get("#Ping").innerHTML.length * 8.52}px`;
    });
    WaitForNewData += (2 / 60);
  }

  ShowChatMessages();

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

  DrawDots();
  CalcBullets(DT);
  CalcEMPs(DT);
  CalcShockwavess(DT);
  DrawGameObjs();
  CalcPlayers(DT);
  DrawPlayers();
  DrawDamageIndicators();
  DrawLeaderboard();

  Get("#Log").innerText = GhostChars.length;

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
