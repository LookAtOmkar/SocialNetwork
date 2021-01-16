"use strict";

const http=require('http');
const express = require("express");
const app = express();
const fs= require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");

let mongo = require("mongodb");
const { allowedNodeEnvironmentFlags } = require('process');
let mongoClient = mongo.MongoClient;
const ObjectID = mongo.ObjectID;
const CONNECTIONSTRING = "mongodb://127.0.0.1:27017";
const CONNECTIONOPTIONS = {useNewUrlParser: true, useUnifiedTopology: true};
const TTL_Token = 120; //espresso in sec 

const PORT = 1337;
const DB_NAME="Ecoin";


const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

let paginaErrore;
let privateKey;


const server=http.createServer(app);

server.listen(PORT,function(){
    console.log("Server in ascolto sulla porta "+PORT);
    init();
})

app.use(cors());
app.use(express.json({"limit":"50mb"}));
app.set("json spaces",4);

function init()
{
    fs.readFile("./static/error.html", function (err, data)
    {
        if (!err)
            paginaErrore = data.toString();
        else
            paginaErrore = "<h1>Risorsa non trovata</h1>";
    });
    fs.readFile("./keys/private.key",function(err,data){
        if(!err)
        {
            privateKey = data.toString();
        }
        else
        {
            //Richiamo la route di gestione degli errori
            console.log("File mancante: private.key");
            server.close();
        }
    })

    app.response.log = function(message){
        console.log("Errore: "+message);
    } 
}

//Log della richiesta
app.use('/', function (req, res, next)
{
    //originalUrl contiene la risorsa richiesta
    console.log(">>>>>>>>>> " + req.method + ":" + req.originalUrl);
    next();
});


app.get("/",function(req,res,next){
    controllaToken(req,res,next);
})


app.get("/index.html",function(req,res,next){
    controllaToken(req,res,next);
})

//Route relativa alle risorse statiche; Questa route deve essere eseguita DOPO controllaToken()
app.use('/', express.static("./static"));
app.use('/', express.static("./static/Login"));
app.use('/', express.static("./static/WebChat"));


//Route di lettura dei parametri post
app.use(bodyParser.urlencoded({"extended": false}));
app.use(bodyParser.json());

//Log dei parametri
app.use("/", function (req, res, next)
{
    if (Object.keys(req.query).length > 0)
    {
        console.log("Parametri GET: " + JSON.stringify(req.query));
    }
    if (Object.keys(req.body).length > 0)
    {
        console.log("Parametri BODY: " + JSON.stringify(req.body));
    }
    next();
});




//Route per fare in modo che il server risponda a qualunque richiesta anche extra-domain.
app.use("/", function (req, res, next)
{
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
})


/********** Middleware specifico relativo a JWT **********/
//Per tutte le pagine su cui si vuole fare il controllo del token, si aggiunge un listener di questo tipo
//-------------------------------------------------Route Specifiche------------------------------------------------------------


//LOGIN
app.post("/api/Login/login",function(req,res){

    let mail = req.body.mail;
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client)
    {
        if (err)
        {
	        res.status(503).send("Errore di connessione al DB").log(err.message);
        }
        else
        {
            let db = client.db(DB_NAME);
            let collection = db.collection("utente"); 
            //Verificare che email e password corrispondono a quelli presenti sul database

            collection.findOne({"MAIL":mail},function(err,dbUser){
                if(err)
                {
                    res.status(500).send("Login Fallito").log(err.message);
                }
                else
                {
                    if(dbUser==null)
                    {
                        res.status(401).send("Username e/o password invalidi");
                    }
                    else
                    {
                        //req.body.password --> password in chiaro inserita dall'utente
                        //dbUser.password --> password cifrata contenuta nel DB
                        //il metodo compare() cifra req.body.password e la va a confrontare con dbUser-password
                        let password = req.body.password;
                        bcrypt.compare(password,dbUser.PASSWORD,function(err,ok){
                            if(err)
                            {
                                res.status(500).send("Internal Error in bcrypt compare").log(err.message);
                            }
                            else
                            {
                                if(ok) //ok==null
                                {
                                    res.status(401).send("Username e/o Password non validi");
                                }
                                else
                                {
                                    let token = createToken(dbUser);
                                    writeCookie(res,token);
                                    res.status(200).send({"Ris":"ok"});
                                }
                            }
                        })
                    }
                }
                client.close();
            })
        }
    });
})

app.post("/api/logout", function (req, res, next) {
    res.set("Set-Cookie", `token="";max-age=-1;path=/;httponly=true`);
    res.send({ "ris": "ok" });
});

//SIGNUP  
app.post("/api/Login/Register",function(req,res){
    //insert();
    mongoClient.connect(CONNECTIONSTRING,CONNECTIONOPTIONS,function(err,client){
        if(err)
        {
            res.status(503).send("Errore di connessione al DB");
        }
        else
        {
            let db = client.db("Ecoin");
            let collection = db.collection("utente");
            
            collection.insertOne(req.body,function(err,data){
                if(err)
                {
                    res.status(500).send("Errore di esecuzione query");
                }
                else
                {
                    res.status(200).send({"Res":"Done"});
                    console.log(data);
                }
                client.close();
            })
        }
    })
})


/*----------------------------------FUNCTIONS-------------------------------*/
function controllaToken(req,res,next){
    let token = readCookie(req);
    if(token == "")
    {
        inviaErrore(req,res,403,"Token mancante");
    }
    else
    {
        jwt.verify(token,privateKey,function(err,payload){
            if(err)
            {
                inviaErrore(req,res,403,"Token scaduto o corrotto");
            }
            else
            {
                let newToken = createToken(payload);
                writeCookie(res,newToken);
                req.payload = payload; //salvo il payload request in modo che le api successive lo possano leggere e ricavare i dati dell'utente loggato
                next(); 
            }
        })
    }
}

app.use("/api",function(req,res,next){
    controllaToken(req,res,next);
})



function inviaErrore(req,res,cod,errorMessage){
    if(req.originalUrl.startsWith("/api/")){
        res.status(cod).send(errorMessage).log(err.message);
    }
    else
    {
        res.sendFile(__dirname + "/static/Login/login.html");
    }
}

function readCookie(req){
    let valoreCookie = "";
    if(req.headers.cookie){
        let cookies = req.headers.cookie.split(';');
        for(let item of cookies){
            item = item.split('='); //item = chiave=valore --> split -->[chiave,valore];
            if(item[0].includes("token")){
                valoreCookie = item[1];
                break;
            }
        }
    }
    return valoreCookie;
}

//data --> record dell'utente
function createToken(data){
    //sign() --> aspetta come parametro un json con i parametri che si vogliono mettere nel token 
    let json = {
        "_id":data["_id"],
        "username":data["MAIL"],
        "iat": data["iat"] || Math.floor((Date.now() / 1000)),
        "exp": ((Math.floor(Date.now() / 1000))+ TTL_Token)
    }
    
    let token = jwt.sign(json,privateKey);
    console.log(token);
    return token;
}


function writeCookie(res,token){
    //set() --> metodo di express che consente di impostare una o più intestazioni nella risposta HTTP
    res.set("Set-Cookie", `token=${token};max-age=${TTL_Token};path=/;httponly=true`);
}

/*-------------------------------------------------------------------------------------------------------- */

app.get("/api/getUserName",function(req,res){
    mongoClient.connect(CONNECTIONSTRING,CONNECTIONOPTIONS,function(err,client){
        if(err)
        {
            res.status(503).send("Errore di connessione al DB");
        }
        else
        {
            let db= client.db("Ecoin");
            let collection = db.collection("utente");
            let currentID= req.payload["_id"]; //id dell'utente loggato
            collection.findOne({"_id":ObjectID(currentID)},function(err,data){
                if(err)
                {
                    res.status(500).send("Internal server error / Query Error").log(err.message);
                }
                else
                {
                    res.status(200).send({"Name":data["NOME"],"Surname":data["COGNOME"]});
                }
                client.close();
            }); 
        }

    })
});

app.post("/api/InsertFoto",function(req,res){
    //Inserire la foto del profilo nel database
})

app.post("/api/InsertThumbnail",function(req,res){
    //Inserire la foto di copertina nel database
    //PS: Aggiungere un nuovo campo : Copertina 
})

app.get("/api/Profile",function(req,res){

    //Ricevere dei dati, riguardanti all'utente loggato, per la visualizzazione del suo profilo
    mongoClient.connect(CONNECTIONSTRING,CONNECTIONOPTIONS,function(err,client){
        if(err)
        {
            res.status(503).send("Errore di connessione al DB");
        }   
        else
        {
            let db = client.db(DB_NAME);
            let collection =db.collection("utente");
            let currentID = req.payload["_id"]; //id dell'utente loggato
            collection.findOne({"_id":ObjectID(currentID)},function(err,dbUser){
                if(err)
                {
                    res.status(500).send("Internal server error").log(err.message);
                }
                else
                {
                    res.status(200).send(dbUser);
                }
                client.close();
            })
        }
    })
})


app.patch("/api/UpdateProfile",function(req,res,)
{
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err) {
            res.status(503).send("Errore connessione al DB");
        }
        else 
        {
            let db = client.db(DBNAME);
            let collection = db.collection("utente");
            let currentID = req.payload["_id"];  //id dell'utente loggato
            let json = req.body; // mi da il JSON completo, che il client ha mandato
            json["_id"]= ObjectId(currentId); //così manteniamo il vecchio ID
            collection.replaceOne({"_id":ObjectID(currentId)},json, function (err, data) {
                if (err) {
                    res.status(500).send("Errore cancellazione record\n" + err.message);
                }
                else 
                {
                    res.send(data);
                }
                client.close();
            });
        }    
    })
});
/********** Route di gestione degli errori **********/


app.use("/", function (req, res, next)
{
    res.status(404);
    if (req.originalUrl.startsWith("/api/")) 
    {
        //res.send('"Risorsa non trovata"'); //non va così bene, perchè content-type viene messo = "text"
        res.json("Risorsa non trovata"); //La serializzazione viene fatta dal metodo json()
        //res.send({"ris":"Risorsa non trovata"});
    }
    else
    {
        res.send(paginaErrore);
    }
});


app.use(function (err, req, res, next)
{
    if (!err.codice)
    {
        console.log(err.stack);
        err.codice = 500;
        err.message = "Internal Server Error";
    }
    res.status(err.codice);
    res.send(err.message);
});

app.use(function (err, req, res, next) {
    console.log(err.stack);
});
