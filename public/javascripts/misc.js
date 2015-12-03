var menu_data = null;
var order_data = null;
var active_order_data = null;
var tags = null;
var ingradients = null;

var count = 0;


function clearAlert() {
    console.log("clear alert");
    var alert = document.getElementById("alert-pane");
    setTimeout(function () {
        $("#alert-pane").fadeOut(3000, function () {
            alert.parentNode.removeChild(alert);
        });
    }, 2000);
}

function loadRestaurantMenu() {
    $.get("/restaurants/home/menu",function(data){
        menu_data = data;
       console.log(data);
       var dish = null;
       for ( var i = 0; i < data.length; i++) {
            $("#menu_list").append('<tr><td>'+(i+1)+'</td><td>'+data[i].name+'</td><td><a href="#">edit</a></td><td>'+data[i].price+'</td></tr>');
       }
    });
}

function loadRestaurantHistoryOrders() {
    $.get("/restaurants/home/orders",function(data){
        menu_data = data;
       console.log(data);
       var dish = null;
       for ( var i = 0; i < data.length; i++) {
            $("#order_list").append('<tr><td>'+data[i].name+'</td><td>'+data[i].user+'</td><td><a href="#">'+data[i].delivered ? "delivered" : "active" +'</a></td><td>'+data[i].price+'</td></tr>');
       }
    });
}

function loadTags() {
    $.get("/restaurants/tags", function(data){
        tags = [];
        for (var i = 0; i < data.length; i++) {
            tags.push(data[i].value);
        }
        $('#tags').trigger("tagsLoaded");
    });
}

function loadIngradients() {
    $.get("/restaurants/ingradients", function(data){
        ingradients = [];
        for (var i = 0; i < data.length; i++) {
            ingradients.push(data[i].value);
        }
        $('#ingradients').trigger("ingradientsLoaded");
            
    });
}

function bodyOnload() {
    var counts = 0;
    console.log("body onload");
    if ($("#alert-pane"))
        clearAlert();
        
    loadIngradients();
    loadTags();
    
    $('#tags').on("tagsLoaded", function() {
        $('#tags').inputTags({
            minLength:1,
            autocomplete: {
                values: tags
            },
            errors: {
                empty: "Attention, a tag should contain at least one character"
            }
        });
    });
    
    
    $('#ingradients').on("ingradientsLoaded", function() {
        $('#ingradients').inputTags({
            minLength:1,
            autocomplete: {
                values: ingradients
            },
            errors: {
                empty: "Attention, a tag should contain at least one character"
            }
        });
    });
    
    loadRestaurantMenu();
    
    // var link = document.createElement("link");
    // link.href = "/stylesheets/style.css";
    // link.rel = "stylesheet";
    // document.body.appendChild(link);
}