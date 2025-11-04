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

        this.ServerSetProps = {};
    }
}

class Game {
    constructor(Id) {
        this.Id = Id;
        this.Name = "Game" + String(Math.round(Math.random() * 1000));
        this.Class = "Game";
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
            Body = Chunk;
            Body = JSON.parse(Body);
            Body = Body.Message;
        });

        Req.on('end', () => {
            if (Body.Class != undefined && Body.Class == "Session") {
                let ThisSession = FindSession(Body.Id);
                if (ThisSession == null) {
                    let NewSession = new Session(Body.Id);
                    NewSession.Name = Body.Name;
                    Sessions.push(NewSession);
                    console.log(`\nAdded new session:\n${Body.Id}, ${Body.Name}`);
                } else {
                    Object.keys(Body).forEach((Key) => {
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
                    Body.AllSessionsInYourGame.push(Session);
                }
            }
            Body.GameVersion = GameVersion;

            Res.writeHead(200, { 'Content-Type': 'application/json' });
            Res.end(JSON.stringify({ Response: Body }));
        });
    } else if (Req.method === 'POST' && Req.url == "/MakeGame") {
        let Body = '';
        Req.on('data', Chunk => {
            Body = Chunk;
            Body = JSON.parse(Body);
            Body = Body.Message;
        });

        Req.on('end', () => {
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
            Body = Chunk;
            Body = JSON.parse(Body);
            Body = Body.Message;
        });

        Req.on('end', () => {
            let Response = FindGame(Body.Name);

            Res.writeHead(200, { 'Content-Type': 'application/json' });
            Res.end(JSON.stringify({ Response: Response }));
        });
    } else if (Req.method === 'POST' && Req.url == "/ShootBullet") {
        let Body = '';
        Req.on('data', Chunk => {
            Body = Chunk;
            Body = JSON.parse(Body);
            Body = Body.Message;
        });

        Req.on('end', () => {
            let ThisGame = FindGame(Body.Game.Id);
            let Response = null;

            if (ThisGame != null) {
                ThisGame.Bullets.push(new Bullet(Body.X, Body.Y, Body.Direction, Body.Id));
                Response = ThisGame;
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
            if (Plr == Plr2 || Plr.Stabbing > 0 || Plr2.Health <= 0)
                continue;
            if (Distance(Plr.X + Math.cos(Plr.Rot) * 60, Plr.Y + Math.sin(Plr.Rot) * 60, Plr2.X + Math.cos(Plr2.Rot), Plr2.Y + Math.sin(Plr2.Rot)) < 50) {
                Plr2.ServerSetProps.Health = Plr2.Health - 10;
                Plr2.Health -= 10;
                Plr2.ServerSetProps.VelX = Math.cos(Plr.Rot) * 5;
                Plr2.ServerSetProps.VelY = Math.sin(Plr.Rot) * 5;
                Plr.ServerSetProps.VelX = -Math.cos(Plr.Rot) * 10;
                Plr.ServerSetProps.VelY = -Math.sin(Plr.Rot) * 10;
                Plr.ServerSetProps.X = Plr.X - Math.cos(Plr.Rot) * 60;
                Plr.ServerSetProps.Y = Plr.Y - Math.sin(Plr.Rot) * 60;
                Plr.Stabbing = .25;
                console.log(`\n${Plr.Name} stabbed ${Plr2.Name}`);
            }
        }
        Plr.Stabbing -= DT;

        if (Plr.Health <= 0) {
            Plr.ServerSetProps.X = -512;
            Plr.ServerSetProps.Y = -512;
            Plr.ServerSetProps.Rot = 0;
            if (Plr.RespawnTime <= 0)
                Plr.RespawnTime = 10;
            Plr.RespawnTime -= DT;
            if (Plr.RespawnTime <= 0) {
                Plr.ServerSetProps.Health = 100;
                Plr.ServerSetProps.ResetPos = true;
            }
            Plr.ServerSetProps.RespawnTime = Plr.RespawnTime;
        } else {
            //Plr.ServerSetProps.Health = Plr.Health + (1 * DT);
        }

        if (Plr.Name == "Plr") {
            console.log(Plr.Stabbing);
        }
    }
}, 25);