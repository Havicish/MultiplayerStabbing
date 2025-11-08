const Http = require('http');
const Fs = require('fs');
const Path = require('path');
const GameVersion = "1.0.0";

class Session {
  constructor(Id) {
    this.Id = Id;
    this.InactiveTime = 0;
    this.Class = "Session";
    this.Health = 100;
    this.Stabbing = 0;
    this.RespawnTime = 10;
    this.LastHitBy = null;
    this.Kills = 0;
    this.HasBeenKilled = false;
    this.MoveStunned = false;
    this.IsDev = false;
    this.DevPassword = "";
    this.ParryingTime = 0;
    this.Speed = 0.5;

    this.ServerSetProps = {};
  }
}

class Game {
  constructor(Id) {
    this.Id = Id;
    this.Name = "Game" + String(Math.round(Math.random() * 1000));
    this.Class = "Game";
    this.Bullets = [];
    this.Caltrops = [];
    this.EMPs = [];
    this.Shockwaves = [];
    this.ChatMessages = [];
  }
}

class Bullet {
  constructor(X, Y, Direction, OwnerId) {
    this.X = X;
    this.Y = Y;
    this.Direction = Direction;
    this.OwnerId = OwnerId;
  }
}

class Caltrop {
  constructor(X, Y, OwnerId) {
    this.X = X;
    this.Y = Y;
    this.OwnerId = OwnerId;
    this.LifeTime = 10;
    this.Size = 0;
  }
}

class EMP {
  constructor(X, Y, OwnerId) {
    this.X = X;
    this.Y = Y;
    this.OwnerId = OwnerId;
    this.SessionsWhoSawIt = [];
    this.LifeTime = 0.5;
    this.Size = 5;
  }
}

class Shockwave {
  constructor(X, Y, OwnerId) {
    this.X = X;
    this.Y = Y;
    this.OwnerId = OwnerId;
    this.SessionsWhoSawIt = [];
    this.LifeTime = 0.5;
    this.Size = 5;
  }
}

class ChatMessage {
  constructor(SenderId, SenderName, MessageText) {
    this.SenderId = SenderId;
    this.SenderName = SenderName;
    this.MessageText = MessageText;
    this.Timestamp = Date.now();
  }
}

function Distance(X1, Y1, X2, Y2) {
  return Math.sqrt(Math.pow(X1 - X2, 2) + Math.pow(Y1 - Y2, 2));
}

function FindSession(SessionId) {
  for (let [i, Session] of Sessions.entries()) {
    if (Session.Id == SessionId) {
      return Session;
    }
  }
  return null;
}

function FindGame(GameIdOrName) {
  for (let [i, Game] of Games.entries()) {
    if (Game.Id == GameIdOrName || Game.Name == GameIdOrName) {
      return Game;
    }
  }
  return null;
}

let Sessions = [];
let Games = [];

const PublicDir = Path.join(__dirname, '../public');
const Server = Http.createServer((Req, Res) => {
  if (Req.method === 'GET') {
    const FilePath = Path.join(PublicDir, Req.url === '/' ? 'index.html' : Req.url);
    const Extname = Path.extname(FilePath);
    const ContentType = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpg',
      '.ico': 'image/x-icon'
    }[Extname] || 'text/plain';

    Fs.readFile(FilePath, (Err, Data) => {
      if (Err) {
        Res.writeHead(Err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain' });
        Res.end(Err.code === 'ENOENT' ? '404 Not Found' : 'Internal Server Error');
      } else {
        Res.writeHead(200, { 'Content-Type': ContentType });
        Res.end(Data);
      }
    });
  } else if (Req.method === 'POST' && Req.url == "/Update") {
    let Body = '';
    Req.on('data', Chunk => {
      Body += Chunk;
    });

    Req.on('end', () => {
      try {
        Body = JSON.parse(Body);
        Body = Body.Message;
      } catch (error) {
        console.error("Error parsing JSON:", error);
        console.log("Received data:", Body);
      }

      if (Body.Class != undefined && Body.Class == "Session") {
        let ThisSession = FindSession(Body.Id);
        if (ThisSession == null) {
          let NewSession = new Session(Body.Id);
          NewSession.Name = Body.Name;
          Sessions.push(NewSession);
          console.log(`\nAdded new session:\n${Body.Id}, ${Body.Name}`);
        } else {
          Object.keys(Body).forEach((Key) => {
            if (Key == "RespawnTime") return;
            if (Key == "LastHitBy") return;
            if (Key == "Kills") return;
            if (Key == "HasBeenKilled") return;
            if (Key == "IsDev") return;
            if (Key == "ParryingTime") return;
            ThisSession[Key] = Body[Key];
          });
          ThisSession.InactiveTime = 0;
          Body.ServerSetProps = ThisSession.ServerSetProps;
          ThisSession.ServerSetProps = {};
        }
      }
      Body.TotalSessions = Sessions.length;
      Body.AllSessionsInYourGame = [];
      for (let Session of Sessions) {
        if (Session.Game != undefined && Body.Game != undefined && Session.Game.Id == Body.Game.Id) {
          Session.DevPassword = null;
          Body.AllSessionsInYourGame.push(Session);
        }
      }
      Body.GameVersion = GameVersion;
      let Game = FindGame(Body.Game != undefined ? Body.Game.Id : null);
      if (Game) {
        Body.Caltrops = Game.Caltrops;
        Body.Bullets = Game.Bullets;
        for (let EMP of Game.EMPs) {
          if (EMP.SessionsWhoSawIt && !EMP.SessionsWhoSawIt.includes(Body.Id)) {
            Body.EMPs = Body.EMPs || [];
            Body.EMPs.push(EMP);
            EMP.SessionsWhoSawIt.push(Body.Id);
          }
        }
        for (let Wave of Game.Shockwaves) {
          if (Wave.SessionsWhoSawIt && !Wave.SessionsWhoSawIt.includes(Body.Id)) {
            Body.Shockwaves = Body.Shockwaves || [];
            Body.Shockwaves.push(Wave);
            Wave.SessionsWhoSawIt.push(Body.Id);
          }
        }
        Body.ChatMessages = Game.ChatMessages;
      }

      Res.writeHead(200, { 'Content-Type': 'application/json' });
      Res.end(JSON.stringify({ Response: Body }));
    });
  } else if (Req.method === 'POST' && Req.url == "/MakeGame") {
    let Body = '';
    Req.on('data', Chunk => {
      Body += Chunk;
    });

    Req.on('end', () => {
      try {
        Body = JSON.parse(Body);
        Body = Body.Message;
      } catch (error) {
        console.error("Error parsing JSON:", error);
        console.log("Received data:", Body);
      }
      
      let Response;
      if (FindGame(Body.Name) == null) {
        Response = new Game(Math.round(Math.random() * 100000000000));
        Response.Name = Body.Name;

        Games.push(Response);

        console.log(`\nMade game:\n${Response.Id}, ${Response.Name}`);
      } else {
        Response = FindGame(Body.Name);
      }

      Res.writeHead(200, { 'Content-Type': 'application/json' });
      Res.end(JSON.stringify({ Response: Response }));
    });
  } else if (Req.method === 'POST' && Req.url == "/JoinGame") {
    let Body = '';
    Req.on('data', Chunk => {
      Body += Chunk;
    });

    Req.on('end', () => {
      try {
        Body = JSON.parse(Body);
        Body = Body.Message;
      } catch (error) {
        console.error("Error parsing JSON:", error);
        console.log("Received data:", Body);
      }
      
      let Response = FindGame(Body.Name);

      Res.writeHead(200, { 'Content-Type': 'application/json' });
      Res.end(JSON.stringify({ Response: Response }));
    });
  } else if (Req.method === 'POST' && Req.url == "/CreateCaltrop") {
    let Body = '';
    Req.on('data', Chunk => {
      Body += Chunk;
    });

    Req.on('end', () => {
      try {
        Body = JSON.parse(Body);
        Body = Body.Message;
      } catch (error) {
        console.error("Error parsing JSON:", error);
        console.log("Received data:", Body);
      }
      
      let ThisSession = FindSession(Body.Id);
      let Response = null;
      let Game = FindGame(Body.Game.Id);

      if (ThisSession != null) {
        Game.Caltrops.push(new Caltrop(Body.X, Body.Y, Body.Id));
      }

      Res.writeHead(200, { 'Content-Type': 'application/json' });
      Res.end(JSON.stringify({ Response: Response }));
    });
  } else if (Req.method === 'POST' && Req.url == "/CreateBullet") {
    let Body = '';
    Req.on('data', Chunk => {
      Body += Chunk;
    });

    Req.on('end', () => {
      try {
        Body = JSON.parse(Body);
        Body = Body.Message;
      } catch (error) {
        console.error("Error parsing JSON:", error);
        console.log("Received data:", Body);
      }
      
      let ThisSession = FindSession(Body.Id);
      let Response = null;
      let Game = FindGame(Body.Game.Id);

      if (ThisSession != null) {
        Game.Bullets.push(new Bullet(Body.X, Body.Y, Body.Rot, Body.Id));
      }

      Res.writeHead(200, { 'Content-Type': 'application/json' });
      Res.end(JSON.stringify({ Response: Response }));
    });
  } else if (Req.method === 'POST' && Req.url == "/CreateEMP") {
    let Body = '';
    Req.on('data', Chunk => {
      Body += Chunk;
    });

    Req.on('end', () => {
      try {
        Body = JSON.parse(Body);
        Body = Body.Message;
      } catch (error) {
        console.error("Error parsing JSON:", error);
        console.log("Received data:", Body);
      }
      
      let ThisSession = FindSession(Body.Id);
      let Response = null;
      let Game = FindGame(Body.Game.Id);

      let NewEMP = new EMP(Body.X, Body.Y, Body.Id);
      Game.EMPs.push(NewEMP);

      if (ThisSession != null) {
        for (let Plr of Sessions) {
          if (Plr.Id == ThisSession.Id || Plr.Game == undefined || Plr.Game.Id != Game.Id)
            continue;
          if (Distance(ThisSession.X, ThisSession.Y, Plr.X, Plr.Y) <= 350) {
            Plr.ServerSetProps.MoveStunned = 3.5;
          }
        }
      }

      Res.writeHead(200, { 'Content-Type': 'application/json' });
      Res.end(JSON.stringify({ Response: Response }));
    });
  } else if (Req.method === 'POST' && Req.url == "/CreateShockwave") {
    let Body = '';
    Req.on('data', Chunk => {
      Body += Chunk;
    });

    Req.on('end', () => {
      try {
        Body = JSON.parse(Body);
        Body = Body.Message;
      } catch (error) {
        console.error("Error parsing JSON:", error);
        console.log("Received data:", Body);
      }
      
      let ThisSession = FindSession(Body.Id);
      let Response = null;
      let Game = FindGame(Body.Game.Id);

      let NewShockwave = new EMP(Body.X, Body.Y, Body.Id);
      Game.Shockwaves.push(NewShockwave);

      if (ThisSession != null) {
        for (let Plr of Sessions) {
          if (Plr.Id == ThisSession.Id || Plr.Game == undefined || Plr.Game.Id != Game.Id)
            continue;
          if (Distance(ThisSession.X, ThisSession.Y, Plr.X, Plr.Y) <= 350) {
            let Direction = Math.atan2(ThisSession.Y - Plr.Y, ThisSession.X - Plr.X);
            Plr.ServerSetProps.VelX = -Math.cos(Direction) * 25;
            Plr.ServerSetProps.VelY = -Math.sin(Direction) * 25;
          }
        }
      }

      Res.writeHead(200, { 'Content-Type': 'application/json' });
      Res.end(JSON.stringify({ Response: Response }));
    });
  } else if (Req.method === 'POST' && Req.url == "/KillSelf") {
    let Body = '';
    Req.on('data', Chunk => {
      Body += Chunk;
    });

    Req.on('end', () => {
      try {
        Body = JSON.parse(Body);
        Body = Body.Message;
      } catch (error) {
        console.error("Error parsing JSON:", error);
        console.log("Received data:", Body);
      }
      
      let ThisSession = FindSession(Body.Id);
      let Response = null;

      if (ThisSession != null) {
        ThisSession.ServerSetProps.Health = 0;
        ThisSession.Health = 0;
      }

      Res.writeHead(200, { 'Content-Type': 'application/json' });
      Res.end(JSON.stringify({ Response: Response }));
    });
  } else if (Req.method === 'POST' && Req.url == "/SendChatMessage") {
    let Body = '';
    Req.on('data', Chunk => {
      Body += Chunk;
    });

    Req.on('end', () => {
      try {
        Body = JSON.parse(Body);
        Body = Body.Message;
      } catch (error) {
        console.error("Error parsing JSON:", error);
        console.log("Received data:", Body);
      }
      
      let ThisSession = FindSession(Body.Id);
      let Response = null;
      let Game = FindGame(Body.Game.Id);

      if (ThisSession != null && Game != null) {
        if (ThisSession.Name == "")
          ThisSession.Name = "Unnamed";
        let NewMessage = new ChatMessage(Body.Id, ThisSession.Name, Body.TryingToSendMessage);
        Game.ChatMessages.push(NewMessage);
        console.log(`\n${ThisSession.Name} sent a chat message: ${Body.TryingToSendMessage}`);
      }

      Res.writeHead(200, { 'Content-Type': 'application/json' });
      Res.end(JSON.stringify({ Response: Response }));
    });
  } else if (Req.method === 'POST' && Req.url == "/CheckForDev") {
    let Body = '';
    Req.on('data', Chunk => {
      Body += Chunk;
    });

    Req.on('end', () => {
      try {
        Body = JSON.parse(Body);
        Body = Body.Message;
      } catch (error) {
        console.error("Error parsing JSON:", error);
        console.log("Received data:", Body);
      }
      
      let ThisSession = FindSession(Body.Id);
      let Response = null;

      if (ThisSession != null) {
        if (Body.DevPassword == "ForeverCryingGhostfox") {
          ThisSession.ServerSetProps.IsDev = true;
          ThisSession.IsDev = true;
        }
      }

      Res.writeHead(200, { 'Content-Type': 'application/json' });
      Res.end(JSON.stringify({ Response: Response }));
    });
  } else if (Req.method === 'POST' && Req.url == "/StartParry") {
    let Body = '';
    Req.on('data', Chunk => {
      Body += Chunk;
    });

    Req.on('end', () => {
      try {
        Body = JSON.parse(Body);
        Body = Body.Message;
      } catch (error) {
        console.error("Error parsing JSON:", error);
        console.log("Received data:", Body);
      }
      
      let ThisSession = FindSession(Body.Id);
      let Response = null;

      if (ThisSession != null) {
        ThisSession.ParryingTime = 0.5;
      }

      Res.writeHead(200, { 'Content-Type': 'application/json' });
      Res.end(JSON.stringify({ Response: Response }));
    });
  }
});

// Start the server on port 80
Server.listen(8080, () => {
  console.log('Server running on port 8080');
});

setInterval(() => {
  for (let [i, Session] of Sessions.entries()) {
    Session.InactiveTime += 1;
    if (Session.InactiveTime >= 10) {
      console.log(`\nKicked session:\n${Session.Id}, ${Session.Name}. For being inactive.`);
      Sessions.splice(i, 1)
    }
  }

  for (let Game of Games) {
    for (let Session in Sessions) {
      if (Session.Game == null) {
        continue
      }
      Games.splice(Games.indexOf(Game), 1);
    }
  }
}, 1000);

let DT = 0;
let LastRecTime = Date.now();
setInterval(() => {
  DT = (Date.now() - LastRecTime) / 1000;
  LastRecTime = Date.now();

  // Plr stab
  for (let Plr of Sessions) {
    for (let Plr2 of Sessions) {
      if (Plr == Plr2 || Plr.Stabbing > 0 || Plr2.Health <= 0 || Plr.Game == undefined || Plr2.Game == undefined || Plr.Game.Id != Plr2.Game.Id)
        continue;
      if (Distance(Plr.X + Math.cos(Plr.Rot) * 60, Plr.Y + Math.sin(Plr.Rot) * 60, Plr2.X + Math.cos(Plr2.Rot), Plr2.Y + Math.sin(Plr2.Rot)) < 50) {
        Plr2.ServerSetProps.Health = Plr2.Health - 10;
        Plr2.Health -= 10;
        Plr2.ServerSetProps.VelX = Math.cos(Plr.Rot) * 5;
        Plr2.ServerSetProps.VelY = Math.sin(Plr.Rot) * 5;
        Plr2.LastHitBy = Plr.Id;
        Plr.ServerSetProps.VelX = -Math.cos(Plr.Rot) * 10;
        Plr.ServerSetProps.VelY = -Math.sin(Plr.Rot) * 10;
        Plr.ServerSetProps.X = Plr.X - Math.cos(Plr.Rot) * 60;
        Plr.ServerSetProps.Y = Plr.Y - Math.sin(Plr.Rot) * 60;
        Plr.Stabbing = 0.25;
        if (Plr2.Move2 == "Passive Thorns" && Plr2.ParryingTime <= 0) {
          Plr.ServerSetProps.Health = Plr.Health - 2;
          Plr.Health -= 2;
          Plr2.ServerSetProps.Health = Plr2.Health + 2;
          Plr2.Health += 2;
          Plr.LastHitBy = Plr2.Id;
        }
        if (Plr2.ParryingTime > 0) {
          Plr2.ServerSetProps.Health = Math.min(Plr2.Health + 20, 100);
          Plr2.Health = Math.min(Plr2.Health + 20, 100);
          Plr2.ServerSetProps.Speed = Math.round((Plr2.Speed + 0.2) * 1000) / 1000;
          Plr2.Speed = Math.round((Plr2.Speed + 0.2) * 1000) / 1000
          setTimeout(() => {
            Plr2.ServerSetProps.Speed = Math.round((Plr2.Speed - 0.2) * 1000) / 1000;
            Plr2.Speed = Math.round((Plr2.Speed - 0.2) * 1000) / 1000
          }, 2000);
        }
        console.log(`\n${Plr.Name} stabbed ${Plr2.Name}`);
      }
    }
    Plr.Stabbing -= DT;
    Plr.ParryingTime -= DT;
    Plr.ServerSetProps.ParryingTime = Plr.ParryingTime;

    if (Plr.Health <= 0) {
      if (Plr.RespawnTime <= 0)
        Plr.RespawnTime = 10;
      Plr.RespawnTime -= DT;
      if (Plr.RespawnTime <= 0) {
        Plr.ServerSetProps.Health = 100;
        Plr.LastHitBy = null;
        Plr.HasBeenKilled = false;
      }
      Plr.ServerSetProps.RespawnTime = Plr.RespawnTime;
      if (Plr.LastHitBy != null && Plr.HasBeenKilled == false) {
        let Killer = FindSession(Plr.LastHitBy);
        Killer.Kills += 1;
        Killer.ServerSetProps.Kills = Killer.Kills;
        Killer.Health = Math.min(100, Killer.Health + 75 + Math.round(Math.random()) * 5);
        Killer.ServerSetProps.Health = Killer.Health;
        Plr.HasBeenKilled = true;
      }
    } else {
      //Plr.ServerSetProps.Health = Math.min(100, Plr.Health + (0.75 * DT));
    }
  }

  for (let Game of Games) {
    for (let [i, Bullet] of Game.Bullets.entries()) {
      Bullet.X += Math.cos(Bullet.Direction) * 25 * DT * 60;
      Bullet.Y += Math.sin(Bullet.Direction) * 25 * DT * 60;

      // Check collision with players
      for (let Plr of Sessions) {
        if (Plr.Id == Bullet.OwnerId || Plr.Game == undefined || Plr.Game.Id != Game.Id || Plr.Health <= 0)
          continue;
        if (Distance(Bullet.X, Bullet.Y, Plr.X, Plr.Y) < 40) {
          Plr.ServerSetProps.Health = Plr.Health - 10;
          Plr.Health -= 10;
          Plr.ServerSetProps.VelX = Math.cos(Bullet.Direction) * 10;
          Plr.ServerSetProps.VelY = Math.sin(Bullet.Direction) * 10;
          Plr.LastHitBy = Bullet.OwnerId;
          console.log(`\n${FindSession(Bullet.OwnerId).Name} hit ${Plr.Name} with a bullet`);
          Game.Bullets.splice(i, 1);
          break;
        }
      }

      // Remove bullet if out of bounds
      if (Bullet.X < 0 || Bullet.Y < 0 || Bullet.X > 2000 || Bullet.Y > 2000) {
        Game.Bullets.splice(i, 1);
      }
    }

    for (let [i, Caltrop] of Game.Caltrops.entries()) {
      for (let Plr of Sessions) {
        if (Distance(Caltrop.X, Caltrop.Y, Plr.X, Plr.Y) <= 60 && Plr.Id != Caltrop.OwnerId && Plr.Game != undefined && Plr.Game.Id == Game.Id) {
          Plr.Health -= 10;
          Plr.LastHitBy = Caltrop.OwnerId;
          Plr.ServerSetProps.Health = Plr.Health;
          let Dir = Math.atan2(Plr.Y - Caltrop.Y, Plr.X - Caltrop.X);
          Plr.ServerSetProps.VelX = Math.cos(Dir) * 10;
          Plr.ServerSetProps.VelY = Math.sin(Dir) * 10;
          Game.Caltrops.splice(i, 1);
        }
      }
      Caltrop.LifeTime -= DT;
      if (Caltrop.LifeTime <= 0) {
        Game.Caltrops.splice(i, 1);
      }
    }

    for (let [i, EMP] of Game.EMPs.entries()) {
      TotalSessions = Sessions.length;
      AllSessionsInYourGame = [];
      for (let Session of Sessions) {
        if (Session.Game != undefined && Game != undefined && Session.Game.Id == Game.Id) {
          AllSessionsInYourGame.push(Session);
        }
      }
      if (AllSessionsInYourGame.length == EMP.SessionsWhoSawIt.length) {
        Game.EMPs.splice(i, 1);
      }
    }

    for (let [i, Wave] of Game.Shockwaves.entries()) {
      TotalSessions = Sessions.length;
      AllSessionsInYourGame = [];
      for (let Session of Sessions) {
        if (Session.Game != undefined && Game != undefined && Session.Game.Id == Game.Id) {
          AllSessionsInYourGame.push(Session);
        }
      }
      if (AllSessionsInYourGame.length == Wave.SessionsWhoSawIt.length) {
        Game.Shockwaves.splice(i, 1);
      }
    }
  }
}, 25);