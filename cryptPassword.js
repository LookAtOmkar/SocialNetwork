const mongo = require("mongodb");
const mongoClient = mongo.MongoClient;
const DBNAME = "Ecoin"
const CONNECTIONSTRING =  "mongodb://127.0.0.1:27017";
const CONNECTIONOPTIONS = { useNewUrlParser: true, useUnifiedTopology: true };
const async = require("async");

const bcrypt = require("bcryptjs");

/* NOTA : SOLUZIONI POSSIBILI
   1) Utilizzare updateMany: NON E' FATTIBILE in quanto dovrebbe utilizzare la
      funzione bcrypt all'interno del comando update: 
      {"$set":{"password":bcrypt.hashSync("password", 10)}}         
   2) Scorrere uno per uno i record restituiti da find e per ognuno eseguire
      il metodo hashSync. Facile da scrivere ma onerosa perchè per ogni singolo
	  record bisogna stare fermi in attesa che hashSync abbia finito il lavoro.
   3) Scorrere uno per uno i record restituiti da find e per ognuno eseguire 
      il metodo hash (asincrono). Soliti problemi: dove e quando faccio la close?
	  dove scrivo le istruzioni di invio risposta al client (che in questo caso
	  non si pone, ma di solito invece sì).
   4) SOLUZIONE MIGLIORE: uso aync.ForEach che lancia in PARALLELO tutte le 
      elaborazioni sui vari record, e per ogni elaborazione utilizzo hashSync.
*/


mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function(err, client) {
    if (err)
        console.log("Errore di connessione al database");
    else {
        const DB = client.db(DBNAME);
        const COLLECTION = DB.collection('utente');

        COLLECTION.find({},{"PASSWORD":1}).toArray(function(err, data) {
			if(err)
				console.log("Errore esecuzione query" + err.message)
			else{
 			/* 1°PARAM = recordSet su cui iterare */
			/* 2°PARAM = funzione da eseguire per ogni item */ 
			/* 3°PARAM = callback finale */
            async.forEach(data,
                function(item, callback) {
                    // le stringhe bcrypt inizano con $2[ayb]$ e sono lunghe 60
                    let regex = new RegExp("^\\$2[ayb]\\$.{56}$");
                    // se la password corrente non è in formato bcrypt
					if (!regex.test(item["PASSWORD"])) {     
                        let pwd = bcrypt.hashSync(item["PASSWORD"], 10)
                        COLLECTION.updateOne({"_id":item["_id"]},
						         {"$set":{"PASSWORD":pwd}}, function(err, data){
                            callback(err);
                        });
                    } 
					else
                        callback(false);
                },
                function(err) {
                    if (err)
                        console.log("Errore: " + err.message);
                    else
                        console.log("operazione eseguita correttamente");
                    client.close();
                })
			}
        });
    }
});
