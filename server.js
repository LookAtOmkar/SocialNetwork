var express = require("express");
var app = express();

var formidable = require("express-formidable");
app.use(formidable());
const bodyParser = require("body-parser");

var mongodb = require("mongodb");
var mongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectId;
const CONNECTIONOPTIONS = {useNewUrlParser: true, useUnifiedTopology: true};
const CONNECTIONSTRING_Cloud = "mongodb+srv://LookAtOmkar:OmkarSingh19@ecoin.n7u9b.mongodb.net/test";
const CONNECTIONSTRING_Local = "mongodb://localhost:27017";

var http = require("http").createServer(app);
var bcrypt = require("bcrypt");
var fileSystem = require("fs");
var localstorage = require("node-localstorage");

var jwt = require("jsonwebtoken");
var accessTokenSecret = "myAccessTokenSecret1234567890";

const TTL_Token = 120; //espresso in sec 

app.use("/public", express.static(__dirname + "/public"));
app.set("view engine", "ejs");

var socketIO = require("socket.io")(http);
var socketID = "";
var users = [];
var rooms = [];
var mainURL = "http://localhost:4000";

var colors= require("colors");

let privatKey;

http.listen(4000, function () {
	console.log("Server started at " + mainURL);

	fileSystem.readFile("./keys/private.key",function(err,data){
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
	

	//Route di lettura dei parametri post
	app.use(bodyParser.urlencoded({"extended": false}));
	app.use(bodyParser.json());


	//Route per fare in modo che il server risponda a qualunque richiesta anche extra-domain.
	app.use("/", function (req, res, next)
	{
   		 res.setHeader("Access-Control-Allow-Origin", "*");
   	 	next();
	})	

	mongoClient.connect(CONNECTIONSTRING_Cloud,CONNECTIONOPTIONS ,function (error, client) {
		var database = client.db("Ecoin");
		console.log("Database connected.");

		

		app.get("/signup", function (request, result) {
			result.render("signup");
		});

		app.post("/signup", function (request, result) {
			var name = request.fields.name;
			var username = request.fields.username;
			var email = request.fields.email;
			var password = request.fields.password;
			var gender = request.fields.gender;

			database.collection("users").findOne({
				$or: [{
					"email": email
				}, {
					"username": username
				}]
			}, function (error, user) {
				if (user == null) {
					bcrypt.hash(password, 10, function (error, hash) {
						database.collection("users").insertOne({
							"name": name,
							"username": username,
							"email": email,
							"password": hash,
							"gender": gender,
							"profileImage": "",
							"coverPhoto": "",
							"dob": "",
							"city": "",
							"country": "",
							"friends": [],
							"pages": [],
							"notifications": [],
							"groups": [],
							"posts": []
						}, function (error, data) {
							result.json({
								"status": "success",
								"message": "Sei stato registrato con successo, puoi fare il login."
							});
						});
					});
				} else {
					result.json({
						"status": "error",
						"message": "Email o username esistono, cercane uno nuobo."
					});
				}
			});
		});

		app.get("/login", function (request, result) {
			result.render("login");
		});

		app.post("/login", function (request, result) {
			var email = request.fields.email;
			var password = request.fields.password;
			database.collection("users").findOne({
				"email": email
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "La mail non esiste"
					});
				} else {
					bcrypt.compare(password, user.password, function (error, isVerify) {
						if (isVerify) {
							var accessToken = jwt.sign({ email: email }, accessTokenSecret);
							database.collection("users").findOneAndUpdate({
								"email": email
							}, {
								$set: {
									"accessToken": accessToken
								}
							}, function (error, data) {
								result.json({
									"status": "success",
									"message": "Utente loggato",
									"accessToken": accessToken,
									"profileImage": user.profileImage
								});
							});
						} else {
							result.json({
								"status": "error",
								"message": "La password non è corretta"
							});
						}
					});
				}
			});
		});

		app.get("/user/:username", function (request, result) {
			database.collection("users").findOne({
				"username": request.params.username
			}, function (error, user) {
				if (user == null) {
					result.send({
						"status": "error",
						"message": "L'utente non esiste"
					});
				} else {
					result.render("userProfile", {
						"user": user
					});
				}
			});
		});

		app.get("/updateProfile", function (request, result) {
			result.render("updateProfile");
		});

		app.post("/getUser", function (request, result) {
			var accessToken = request.fields.accessToken;
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login again."
					});
				} else {
					result.json({
						"status": "success",
						"message": "Il record è stato recuperato.",
						"data": user
					});
				}
			});
		});

		app.get("/getUsers_Chat",function(request,result){
			database.collection("users").aggregate([
				 {
					"$project":{
						"username":1,
						"profileImage":1
					}
				 }
			]).toArray(function(err,data){
				if(err)
				{
					result.status(500).send({
						"status":"error",
						"message":err.message
					});
				}
				else
				{
					console.log(data);
					result.json({
						"status":"success",
						data
					})
				}
			})
		});

		app.get("/logout", function (request, result) {
			result.redirect("/login");
		});

		app.post("/uploadCoverPhoto", function (request, result) {
			var accessToken = request.fields.accessToken;
			var coverPhoto = "";

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "Sei stato disconesso. Effettua di nuovo il login."
					});
				} else {

					if (request.files.coverPhoto.size > 0 && request.files.coverPhoto.type.includes("image")) {

						if (user.coverPhoto != "") {
							fileSystem.unlink(user.coverPhoto, function (error) {
								//
							});
						}

						coverPhoto = "public/images/" + new Date().getTime() + "-" + request.files.coverPhoto.name;
						fileSystem.rename(request.files.coverPhoto.path, coverPhoto, function (error) {
							//
						});

						database.collection("users").updateOne({
							"accessToken": accessToken
						}, {
							$set: {
								"coverPhoto": coverPhoto
							}
						}, function (error, data) {
							result.json({
								"status": "status",
								"message": "L'immagine di copertina è stata aggiornata.",
								data: mainURL + "/" + coverPhoto
							});
						});
					} else {
						result.json({
							"status": "error",
							"message": "Seleziona un immagine valida."
						});
					}
				}
			});
		});

		app.post("/uploadProfileImage", function (request, result) {
			var accessToken = request.fields.accessToken;
			var profileImage = "";

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "Sei stato disconesso. Effettua di nuovo il login."
					});
				} else {

					if (request.files.profileImage.size > 0 && request.files.profileImage.type.includes("image")) {

						if (user.profileImage != "") {
							fileSystem.unlink(user.profileImage, function (error) {
								//
							});
						}

						profileImage = "public/images/" + new Date().getTime() + "-" + request.files.profileImage.name;
						fileSystem.rename(request.files.profileImage.path, profileImage, function (error) {
							//
						});

						database.collection("users").updateOne({
							"accessToken": accessToken
						}, {
							$set: {
								"profileImage": profileImage
							}
						}, function (error, data) {
							result.json({
								"status": "status",
								"message": "L'immagine profilo è stata aggiornata.",
								data: mainURL + "/" + profileImage
							});
						});
					} else {
						result.json({
							"status": "error",
							"message": "Seleziona un immagine valida."
						});
					}
				}
			});
		});

		app.post("/updateProfile", function (request, result) {
			var accessToken = request.fields.accessToken;
			var name = request.fields.name;
			var dob = request.fields.dob;
			var city = request.fields.city;
			var country = request.fields.country;

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "Sei stato disconesso. Effettua di nuovo il login."
					});
				} else {
					database.collection("users").updateOne({
						"accessToken": accessToken
					}, {
						$set: {
							"name": name,
							"dob": dob,
							"city": city,
							"country": country
						}
					}, function (error, data) {
						result.json({
							"status": "status",
							"message": "Il profilo è stato aggiornato."
						});
					});
				}
			});
		});

		app.get("/post/:id", function (request, result) {
			database.collection("posts").find().toArray(function (error, post) {
				if (post == null) {
					result.send({
						"status": "error",
						"message": "Il post non esiste."
					});
				} else {
					result.render("postDetail", {
						"post": post
					});
				}
			});
		});

		app.get("/", function (request, result,next) {
			result.render("index");
		});

		app.post("/addPost", function (request, result) {

			var accessToken = request.fields.accessToken;
			var caption = request.fields.caption;
			var image = "";
			var video = "";
			var type = request.fields.type;
			var createdAt = new Date().getTime();
			var _id = request.fields._id;

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "Sei stato disconesso. Effettua di nuovo il login."
					});
				} else {

					if (request.files.image.size > 0 && request.files.image.type.includes("image")) {
						image = "public/images/" + new Date().getTime() + "-" + request.files.image.name;
						fileSystem.rename(request.files.image.path, image, function (error) {
							//
						});
					}

					if (request.files.video.size > 0 && request.files.video.type.includes("video")) {
						video = "public/videos/" + new Date().getTime() + "-" + request.files.video.name;
						fileSystem.rename(request.files.video.path, video, function (error) {
							//
						});
					}

					database.collection("posts").insertOne({
						"caption": caption,
						"image": image,
						"video": video,
						"type": type,
						"createdAt": createdAt,
						"likers": [],
						"comments": [],
						"shares": [],
						"user": {
							"_id": user._id,
							"name": user.name,
							"username": user.username,
							"profileImage": user.profileImage
						}
					}, function (error, data) {

						database.collection("users").updateOne({
							"accessToken": accessToken
						}, {
							$push: {
								"posts": {
									"_id": data.insertedId,
									"caption": caption,
									"image": image,
									"video": video,
									"type": type,
									"createdAt": createdAt,
									"likers": [],
									"comments": [],
									"shares": []
								}
							}
						}, function (error, data) {

							result.json({
								"status": "success",
								"message": "Hai caricato il post."
							});
						});
					});
				}
			});
		});

		app.post("/getNewsfeed", function (request, result) {
			var accessToken = request.fields.accessToken;
			database.collection("users").find().toArray(function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "Sei stato disconesso. Effettua di nuovo il login."
					});
				} else {

					var ids = [];
					ids.push(user._id);

					database.collection("posts")
					.find()
					.sort({
						"createdAt": -1
					})
					.limit(5)
					.toArray(function (error, data) {

						result.json({
							"status": "success",
							"message": "Il record è stato trovato",
							"data": data
						});
					});
				}
			});
		});

		app.post("/toggleLikePost", function (request, result) {

			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "Sei stato disconesso. Effettua di nuovo il login."
					});
				} else {

					database.collection("posts").findOne({
						"_id": ObjectId(_id)
					}, function (error, post) {
						if (post == null) {
							result.json({
								"status": "error",
								"message": "Il post non esiste"
							});
						} else {

							var isLiked = false;
							for (var a = 0; a < post.likers.length; a++) {
								var liker = post.likers[a];

								if (liker._id.toString() == user._id.toString()) {
									isLiked = true;
									break;
								}
							}

							if (isLiked) {
								database.collection("posts").updateOne({
									"_id": ObjectId(_id)
								}, {
									$pull: {
										"likers": {
											"_id": user._id,
										}
									}
								}, function (error, data) {

									database.collection("users").updateOne({
										$and: [{
											"_id": post.user._id
										}, {
											"posts._id": post._id
										}]
									}, {
										$pull: {
											"posts.$[].likers": {
												"_id": user._id,
											}
										}
									});

									result.json({
										"status": "unliked",
										"message": "Hai tolto il mi piace."
									});
								});
							} else {

								database.collection("users").updateOne({
									"_id": post.user._id
								}, {
									$push: {
										"notifications": {
											"_id": ObjectId(),
											"type": "photo_liked",
											"content": user.name + " ha messo mi piace al tuo post.",
											"profileImage": user.profileImage,
											"isRead": false,
											"post": {
												"_id": post._id
											},
											"createdAt": new Date().getTime()
										}
									}
								});

								database.collection("posts").updateOne({
									"_id": ObjectId(_id)
								}, {
									$push: {
										"likers": {
											"_id": user._id,
											"name": user.name,
											"profileImage": user.profileImage
										}
									}
								}, function (error, data) {

									database.collection("users").updateOne({
										$and: [{
											"_id": post.user._id
										}, {
											"posts._id": post._id
										}]
									}, {
										$push: {
											"posts.$[].likers": {
												"_id": user._id,
												"name": user.name,
												"profileImage": user.profileImage
											}
										}
									});

									result.json({
										"status": "success",
										"message": "Hai messo mi piace."
									});
								});
							}

						}
					});

				}
			});
		});

		app.post("/postComment", function (request, result) {

			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			var comment = request.fields.comment;
			var createdAt = new Date().getTime();

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "Sei stato disconesso. Effettua di nuovo il login"
					});
				} else {

					database.collection("posts").findOne({
						"_id": ObjectId(_id)
					}, function (error, post) {
						if (post == null) {
							result.json({
								"status": "error",
								"message": "Il post non esiste."
							});
						} else {

							var commentId = ObjectId();

							database.collection("posts").updateOne({
								"_id": ObjectId(_id)
							}, {
								$push: {
									"comments": {
										"_id": commentId,
										"user": {
											"_id": user._id,
											"name": user.name,
											"profileImage": user.profileImage,
										},
										"comment": comment,
										"createdAt": createdAt,
										"replies": []
									}
								}
							}, function (error, data) {

								if (user._id.toString() != post.user._id.toString()) {
									database.collection("users").updateOne({
										"_id": post.user._id
									}, {
										$push: {
											"notifications": {
												"_id": ObjectId(),
												"type": "new_comment",
												"content": user.name + " ha commentato sul tuo post.",
												"profileImage": user.profileImage,
												"post": {
													"_id": post._id
												},
												"isRead": false,
												"createdAt": new Date().getTime()
											}
										}
									});
								}

								database.collection("users").updateOne({
									$and: [{
										"_id": post.user._id
									}, {
										"posts._id": post._id
									}]
								}, {
									$push: {
										"posts.$[].comments": {
											"_id": commentId,
											"user": {
												"_id": user._id,
												"name": user.name,
												"profileImage": user.profileImage,
											},
											"comment": comment,
											"createdAt": createdAt,
											"replies": []
										}
									}
								});

								database.collection("posts").findOne({
									"_id": ObjectId(_id)
								}, function (error, updatePost) {
									result.json({
										"status": "success",
										"message": "Il tuo commmento è stato postato.",
										"updatePost": updatePost
									});
								});
							});

						}
					});
				}
			});
		});

		app.post("/postReply", function (request, result) {

			var accessToken = request.fields.accessToken;
			var postId = request.fields.postId;
			var commentId = request.fields.commentId;
			var reply = request.fields.reply;
			var createdAt = new Date().getTime();

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "Sei stato disconesso. Effettua di nuovo il login."
					});
				} else {

					database.collection("posts").findOne({
						"_id": ObjectId(postId)
					}, function (error, post) {
						if (post == null) {
							result.json({
								"status": "error",
								"message": "Il post non esiste."
							});
						} else {

							var replyId = ObjectId();

							database.collection("posts").updateOne({
								$and: [{
									"_id": ObjectId(postId)
								}, {
									"comments._id": ObjectId(commentId)
								}]
							}, {
								$push: {
									"comments.$.replies": {
										"_id": replyId,
										"user": {
											"_id": user._id,
											"name": user.name,
											"profileImage": user.profileImage,
										},
										"reply": reply,
										"createdAt": createdAt
									}
								}
							}, function (error, data) {

								database.collection("users").updateOne({
									$and: [{
										"_id": post.user._id
									}, {
										"posts._id": post._id
									}, {
										"posts.comments._id": ObjectId(commentId)
									}]
								}, {
									$push: {
										"posts.$[].comments.$[].replies": {
											"_id": replyId,
											"user": {
												"_id": user._id,
												"name": user.name,
												"profileImage": user.profileImage,
											},
											"reply": reply,
											"createdAt": createdAt
										}
									}
								});

								database.collection("posts").findOne({
									"_id": ObjectId(postId)
								}, function (error, updatePost) {
									result.json({
										"status": "success",
										"message": "La tua risposta è stata pubblicata.",
										"updatePost": updatePost
									});
								});
							});

						}
					});
				}
			});
		});

		app.post("/sharePost", function (request, result) {

			var accessToken = request.fields.accessToken;
			var _id = request.fields._id;
			var type = "shared";
			var createdAt = new Date().getTime();

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "Sei stato disconesso. Effettua di nuovo il login."
					});
				} else {

					database.collection("posts").findOne({
						"_id": ObjectId(_id)
					}, function (error, post) {
						if (post == null) {
							result.json({
								"status": "error",
								"message": "Il post non esiste."
							});
						} else {

							database.collection("posts").updateOne({
								"_id": ObjectId(_id)
							}, {
								$push: {
									"shares": {
										"_id": user._id,
										"name": user.name,
										"profileImage": user.profileImage
									}
								}
							}, function (error, data) {

								database.collection("posts").insertOne({
									"caption": post.caption,
									"image": post.image,
									"video": post.video,
									"type": type,
									"createdAt": createdAt,
									"likers": [],
									"comments": [],
									"shares": [],
									"user": {
										"_id": user._id,
										"name": user.name,
										"gender": user.gender,
										"profileImage": user.profileImage
									}
								}, function (error, data) {

									database.collection("users").updateOne({
										$and: [{
											"_id": post.user._id
										}, {
											"posts._id": post._id
										}]
									}, {
										$push: {
											"posts.$[].shares": {
												"_id": user._id,
												"name": user.name,
												"profileImage": user.profileImage
											}
										}
									});

									result.json({
										"status": "success",
										"message": "Il post è stato condiviso."
									});
								});
							});
						}
					});
				}
			});
		});

		app.get("/search/:query", function (request, result) {
			var query = request.params.query;
			result.render("search", {
				"query": query
			});
		});

		app.post("/search", function (request, result) {
			var query = request.fields.query;
			database.collection("users").find({
				"name": {
					$regex: ".*" + query + ".*",
					$options: "i"
				}
			}).toArray(function (error, data) {

				result.json({
					"status": "success",
					"message": "Sto cercando...",
					"data": data
				});
			});
		});


		app.get("/inbox", function (request, result) {
			result.render("inbox");
		});

		app.get("/notifications", function (request, result) {
			result.render("notifications");
		});

		app.post("/markNotificationsAsRead", function (request, result) {
			var accessToken = request.fields.accessToken;

			database.collection("users").findOne({
				"accessToken": accessToken
			}, function (error, user) {
				if (user == null) {
					result.json({
						"status": "error",
						"message": "Sei stato disconesso. Effettua di nuovo il login."
					});
				} else {
					database.collection("users").updateMany({
						$and: [{
							"accessToken": accessToken
						}, {
							"notifications.isRead": false
						}]
					}, {
						$set: {
							"notifications.$.isRead": true
						}
					}, function (error, data) {
						result.json({
							"status": "success",
							"message": "La notifica è stata letta."
						});
					});
				}
			});
		});

		//CHAT
		app.get("/chat", function (request, result) {
			result.render("chat");
		});	
		
	});



		/* connessione di un client
		viene inettato 'socket' contenente IP e PORT del client
		Ogni utente ha un suo evento 'connection' con le sue variabili private, fra cui
		la variabile user che contiene tutte le informazioni dell'utente corrente.
		*/
		socketIO.on("connection", function (socket) {
			console.log("Utente connesso", socket.id);
			socketID = socket.id;
			let user = {};
			user.username = "";
			user.socket = socket;
			user.socketId = socket.id;
			users.push(user);
			console.log(' User ' + colors.yellow(socket.id) + ' connected!');


			// 1) ricezione username
			socket.on('username', function (username) {
				/*
				let trovato = false;
				for (let item of users) {
					if (username == item.username) {
						trovato = true;
					}
				}
				*/
				let vet = users.find(function (item) {
					return (username == item.username);
				});
				if (vet) {
					socket.emit("userNOK","userNOK");
					return;
				}


				user.username = username;
				console.log(' User ' + colors.yellow(this.id) + ' name is ' + colors.yellow(username));
				console.log();

				//Scorro il vettore degli users per salvare username ANCHE all'interno del vettore users 
				for (let item of users) {
					if (this.id == item.socketId) {
						item.username = username;
					}
				}
			});


			// 2) ricezione di un messaggio	 
			socket.on('message', function (data) {
				/* for(let user of users){
					if(this.id == user.socketId){
						log('User ' + colors.yellow(user.username) + "-" + colors.white(user.socket.id) + ' sent ' + colors.green(data));			 
						// notifico a tutti i socket (compreso il mittente) il messaggio appena ricevuto 
						io.sockets.emit('notify_message', JSON.stringify({
							'from': user.username,	 
							'message': data,			 
							'date': new Date()	 
						}));	
					}
				} */
				console.log('User ' + colors.yellow(user.username) + "-" + colors.white(user.socket.id) + ' sent ' + colors.green(data.msg));
				socketIO.emit('notify_message', JSON.stringify({
					'from': user.username,
					'message': data.msg,
					'date': new Date()
				}));
			});



			// 3) user disconnected
			socket.on('disconnect', function () {
				console.log(' User ' + user.username + ' disconnected!');
			});
		});
});