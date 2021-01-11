"use strict";

const http=require('http');
const PORT = 1337;
const express = require("express");
const app = express();
const fs= require("fs");
const bodyParser = require("body-parser");

let mongo = require("mongodb");
const { allowedNodeEnvironmentFlags } = require('process');
let mongoClient = mongo.MongoClient;
const ObjectID = mongo.ObjectID;
const CONNECTIONSTRING = "mongodb://127.0.0.1:27017";
const CONNECTIONOPTIONS = {useNewUrlParser: true, useUnifiedTopology: true};

let paginaErrore;

const server=http.createServer(app);

server.listen(PORT,function(){
    console.log("Server in ascolto sulla porta "+PORT);
    init();
})


function init()
{
    fs.readFile("./static/error.html", function (err, data)
    {
        if (!err)
            paginaErrore = data.toString();
        else
            paginaErrore = "<h1>Risorsa non trovata</h1>";
    });
}

//Log della richiesta
app.use('/', function (req, res, next)
{
    //originalUrl contiene la risorsa richiesta
    console.log(">>>>>>>>>> " + req.method + ":" + req.originalUrl);
    next();
});

//Route relativa alle risorse statiche
app.use('/', express.static("./static"));
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

app.post("/",function (req, res, next) {
    let pathName=url.parse(req.originalUrl).pathname;
    fs.readFile("./static/"+pathName, function (err,data) {
    if(err)
        next();
    else
        res.send(data);
    });
});


//-------------------------------------------------Route Specifiche------------------------------------------------------------


//LOGIN
app.post("/api/Login/login",function(req,res){

    let mail = req.body.mail;
    let password = req.body.password;
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client)
    {
        if (err)
        {
			console.log("Errore di connessione al DB");
        }
        else
        {
            let db = client.db("Ecoin");
            let collection = db.collection("utente"); 
            //Verificare che email e password corrispondono a quelli presenti sul database

            collection.findOne({$and:[{"MAIL":mail},{"PASSWORD":password}]},function(err,data){
                if(err)
                {
                    res.status(500).send("Login Fallito");
					console.log("Login fallito");
                }
                else
                {
                    if(data==null)
                    {
                        res.status(401).send("Username o password invalido");
                    }
                    else
                    {
                        res.status(200).send({"Ris":"ok","utente":data["_id"]});
                    }
                }
                client.close();
            })
        }
    });
})

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



app.post("/api/getUserName",function(req,res){
    mongoClient.connect(CONNECTIONSTRING,CONNECTIONOPTIONS,function(err,client){

        if(err)
        {
            res.status(503).send("Errore di connessione al DB");
        }
        else
        {
            let db= client.db("Ecoin");
            let collection = db.collection("utente");
            let currentID=new ObjectID(req.body.ID);
            collection.findOne({"_id":currentID},function(err,data){
                if(err)
                {
                    res.status(500).send("Internal server error / Query Error");
                }
                else
                {
                    res.status(200).send({"Name": data["NOME"],"Surname":data["COGNOME"]});
                }
                client.close();
            }) 
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
