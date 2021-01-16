"Use strict";

let currentProfile;
let SaveButton =false; //uso nel myprofile, una volta sola, quando clicco su modifica dati

$(document).ready(function(){

    //..........................................MY ACCOUNT.........................................

    $(".dropdown-toggle").dropdown();
    
    
    let request = inviaRichiesta("GET","/api/getUserName");
    request.fail(errore);
    request.done(function(data){
        if(data==null)
            alert("ERRORE DATI");
        else
        {
            console.log(data);
            let Username = data["Name"]+" "+data["Surname"];
            if(data["Name"]=="admin") //PERCHE' COME COGNOME E' SEMPRE admin , QUINDI BASTA CHE VERRA' SCRITTO UNA VOLTA SOLA
            {
                Username = data["Name"];
            }
            $("#MyAccount").find("a").eq(0).html(Username);
        }
        
    });


    let MYProfile_modal_body = $("#myProfile").find(".modal-body .card");

    //VISUALIZZA PROFILO
    $("#MyAccount").children().eq(1).children().eq(0).on("click",function(){  
        let request= inviaRichiesta("GET","/api/Profile");
        request.fail(errore);
        request.done(function(data){
            console.log(data);
            let content;
            currentProfile = data;
            for(let item in data)
            {
                content = $("<div>").addClass("d-flex flex-row");
                let divHead = $("<div>").addClass("col-sm-3 border-bottom border-right  d-inline-block");
                let divBody = $("<div>").addClass("col-sm-9 border-bottom border-left h-25 d-inline-block d-flex");
                if((item != "_id")&&(item != "FOTO"))
                {
                    $("<h6>").appendTo(divHead).html(item); //Title 
                    let detail = $("<div>").addClass("mr-auto p-2");
                    detail.appendTo(divBody);
                    let item_value = data[item];
                    if(item =="SESSO")
                    {
                        if(data[item]=="m")
                            item_value ="Maschio";
                        else if(data[item]=="f")
                            item_value = "Femmina";
                    }
                    $("<input>").prop("type","text").prop("disabled",true).prop({
                        "title":item,
                    }).addClass("ml-4 mr-4").appendTo(detail).val(item_value); //Detail
                    $("<div>").appendTo(divBody).addClass(" p-2 fas fa-pencil-alt").prop("method","patch").on("click",UpdateProfile);
                }
                divHead.appendTo(content);
                divBody.appendTo(content);
                content.appendTo(MYProfile_modal_body);
            }
        });
    })

    //EXIT
    $("#MyAccount").children().eq(1).children().eq(2).on("click",function(){
        let request = inviaRichiesta("POST","/api/logout");
        request.fail(errore);
        request.done(function(data){
            window.location.reload();
        })
    })


    //----------------------------------FUNCTIONS--------------------------------
    function UpdateProfile()
    {
        let input = $(this).parent().find("input");
        let method = $(this).prop("method");
        input.prop("disabled",false);
        input.prop("focus");

        //Dal mio profilo, prendo tutti gli input che ci sono ,modificati o no, e di conseguenza prendo il testo in ogni input,
        // e li carico in un json da mandare al server, per poter modificare i dati dell'utente che si è loggato
 
        if(!SaveButton)
        {
            $("<button>").addClass("btn btn-success ").html("SAVE").appendTo($("#myProfile").find(".modal-footer")).on("click",function(){
                let jsonData = []; //Tutti i dati  inseriti negli inputs 
                let _json={};
                let data ="{";
                for(let item of MYProfile_modal_body.children().find("input"))
                {
                    jsonData.push(item); //carico tutti gli inputs che sono presenti
                    data += item.title+":"+ item.value+",";
                }
                data+="FOTO:'',"
                data += "}";
                let request = inviaRichiesta(method,"/api/UpdateProfile",data);
                request.fail(errore);
                request.done(function(data){
                    console.log(data);
                    alert("UPDATED CORRECTLY");
                })
            });
            SaveButton = !SaveButton;
        }
    }

})