var baseSearchURL = 'http://api.nal.usda.gov/ndb/search/?format=json&q=[[searchterm]]&sort=n&ds=Standard+Reference&offset=0&api_key=UrTamvAsmCB5Xjsiz1fsLYKpcCWX2VZizjXqX4Tk';
var baseDetailURL = 'http://api.nal.usda.gov/ndb/reports/?ndbno=[[ndbID]]&type=b&format=json&api_key=UrTamvAsmCB5Xjsiz1fsLYKpcCWX2VZizjXqX4Tk';
var calValues;
var clickedFoodName;
var db;
var request;
function searchFood(){
    var query = '';
    query = $('#foodSearch').val();
     $('#resultList').empty();
    var url = baseSearchURL.replace('[[searchterm]]', query);
    $.get(url).done(function(data){
        if (typeof data.list !== 'undefined'){
            $.each(data.list.item, function(index, value){
                $('#resultList').append('<li><a onclick="getFoodItem(\'' + value.ndbno + '\',\'' + value.name.replaceAll("'", "") + '\')">' + value.name + '</a></li>');         
            });
        }else{
             $('#resultList').append('Nothing found for ' + $('#foodSearch').val());
        }

    });
    
}

function getFoodItem(id, name){
    $('#foodDetails').empty();
    $('#foodVariants').empty();
    clickedFoodName = name;
    var url = baseDetailURL.replace('[[ndbID]]', id);
    calValues = [];
    $.get(url).done(function(data){
        console.log(data);
        var nutrients = data.report.food.nutrients;
        calValues = nutrients;
        $.each(nutrients, function(index, value){
            var qty;
            if(value.name.toLowerCase() === 'energy'){
                qty = value.measures;
                $.each(qty, function(i, val){
                    $('#foodVariants').append('<option value="' + i + '">' + val.value + " Cal Per " + val.qty + " " + val.label + '</option>');
                })
            } else{
             // $('#foodDetails').append(value.name + ":" + value.value + '<br>');
            }
        });
    });
}

function findMeasure(index){
    var returnValue;    
    $.each(calValues, function(id, value){
        var qty;
        if(value.name.toLowerCase() === 'energy'){
            qty = value.measures;
            $.each(qty, function(i, val){
                if(i === parseInt(index)){
                    returnValue = val;
                }
            });
        }
    });
    return returnValue;
}

function addFoodToDB(){
    //the index of the selected measure;
    request = window.indexedDB.open("foodDatabase", 1);

    request.onerror = function(event) {
        console.log("error: ");
    };

    request.onsuccess = function(event) {
        //get the stuff being added
        var index = $('#foodVariants').val();
        var value = findMeasure(index);
        var timeStamp = new Date();
        var timeString = getFormattedTimeStamp(timeStamp);
        //store it
        var idb = event.target.result;
        var trans = idb.transaction("skippedFood", "readwrite")
       .objectStore("skippedFood")
       .add({name: value.value, quantity: value.qty, name: clickedFoodName, dateTime: timeString, Calories: value.value });
   
       trans.onsuccess = function(event) {
           getTodaySavings();
       };
   
       trans.onerror = function(event) {
          alert("Unable to add data\r\nPrasad is already exist in your database! ");
       }
    };    
}
$(document).ready(function(){
    fixReplace();
    window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange
    if (!window.indexedDB) {
       window.alert("Your browser doesn't support a stable version of IndexedDB.")
    }
     request = window.indexedDB.open("foodDatabase", 1);

     request.onerror = function(event) {
        console.log("error: ");
     };

     request.onsuccess = function(event) {
        db = request.result;
     };
    
     request.onupgradeneeded = function(event) {
        var db = event.target.result;
        var objectStore = db.createObjectStore("skippedFood", { autoIncrement : true });
     }       
});

function getFormattedTimeStamp(timeStamp){
    return timeStamp.getDate().toString() + timeStamp.getMonth().toString() + timeStamp.getFullYear().toString();
}

var todayTimeStamp;
var todayTotal;
var grandTotal;

function getTodaySavings(){
    //load up the database
    //search only for today
    //do the math
    request = window.indexedDB.open("foodDatabase", 1);
    $('#itemAddedScreen').empty();
    request.onerror = function(event) {
        console.log("error: ");
    };
    var timeStamp = new Date();
    todayTimeStamp = getFormattedTimeStamp(timeStamp);
    todayTotal = 0;
    grandTotal = 0;
    request.onsuccess = function(event) {

        //retrieve it
        var idb = event.target.result;
        var trans = idb.transaction("skippedFood");
        var oStore = trans.objectStore("skippedFood");
        
        oStore.openCursor().onsuccess = function(e){
            var cursor = e.target.result;
            var foodData;
            var qty;
            var Calories;
            if (cursor) {
                foodData = cursor.value;
                qty = parseInt(foodData.quantity);
                Calories = parseInt(foodData.Calories);
                if (todayTimeStamp === foodData.dateTime){
                    todayTotal += qty * Calories;
                }
                grandTotal += qty * Calories;
                cursor.continue();
            } else{
                $('#itemAddedScreen').append('You have skipped ' + todayTotal + ' Calories today!<br>'); 
                $('#itemAddedScreen').append('You have skipped ' + grandTotal + ' Calories in all!<br>'); 
            }
        }
    }
}

function fixReplace(){
    String.prototype.replaceAll = function(search, replacement) {
        var target = this;
        return target.split(search).join(replacement);
    };
}