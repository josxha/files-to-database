// list of resources files that should stored in database on install
let urls = [
    './resources/1.png',
    './resources/2.png',
    './resources/3.png'
];

// database connection
let database;


window.onload = function() {
    initDatabase();
};

function initDatabase() {
    let dbName = 'myDB';
    let dbVersion = 1;
    let databaseInstance = indexedDB.open(dbName, dbVersion);

    databaseInstance.onupgradeneeded = function(event) {
        let tmpDatabase = event.target["result"];
        tmpDatabase.createObjectStore('resources');
    };

    databaseInstance.onerror = function(event) {
        console.log('Error, database connection could not been established. ' + event.target["errorCode"]);
    };

    databaseInstance.onsuccess = function(event) {
        console.log('Database connection successfully established. ' + event.target["result"]);
        database = databaseInstance.result;
    };

    databaseInstance.onblocked = function(event) {
        console.log('Error, database connection has been blocked');
    };
}

function storeFilesToDatabase() {
    let totalFiles = urls.length;
    let progressTextElement = document.getElementById('progressText');
    let counterSuccess = 0;
    let counterFailed = 0;
    urls.forEach(function (url) {
        getBLOB(url, function (blob) {
            if (blob !== null) {
                saveResource(url, blob);
                counterSuccess++;
            } else counterFailed++;
            let tmpText = "Datei " + counterSuccess + " von " + totalFiles + " wurde heruntergeladen.";
            if (counterFailed > 0)
                tmpText += " " + counterFailed + " Dateien konnten nicht heruntergeladen werden.";
            progressTextElement.innerText = tmpText
        });
    });
}

function getBLOB(url, runOnFinished) {
    // get the image as BLOB via XMLHttpRequest
    let xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "blob";
    xhr.addEventListener("load", function () {
        if (xhr.status === 200) {
            runOnFinished(xhr.response);
        } else runOnFinished(null);
    }, false);
    xhr.send();
}

function saveResource(key, blob){
    let transaction = database.transaction('resources', 'readwrite');  // Creating Transaction
    let objectStore = transaction.objectStore('resources');      // Handling Object Store
    let request = objectStore.put(blob, (relativeToAbsoluteUrl(key))); // Fetching Object from Object Stores
    request.onsuccess = function(event) {
        console.log('The object has been saved in the database. ' + event.target["result"]);
    };
    request.onerror = function(event) {
        console.log('Error, the object could not be saved to the database. ' + event.target["errorCode"]);
    };
}

// TODO integrate this code into the fetch-eventListener in the service worker file
addEventListener('fetch', function (event) {
    const requestedUrl = new URL(event.request.url);

    // try to answer request from cache
    event.respondWith(async function() {
        let response = await caches.match(event.request);
        if (response !== undefined) {
            console.log(requestedUrl + " was loaded from the cache.");
            return response;
        }

        // try to get resource from IndexedDB
        getResource(
            requestedUrl,
            function (resource) {
                console.log(requestedUrl + " was loaded from the IndexedDB resource table.");
                event.respondWith(resource);
            },
            function () {
                console.log(requestedUrl + " was loaded from the web.");
                return fetch(event.request)
            }
        );
    });
});



function getResource(key, onSuccess, onError){
    let transaction = database.transaction('resources', 'readwrite');  // Creating Transaction
    let store = transaction.objectStore('resources');            // Handling Object Store
    let request = store.get(relativeToAbsoluteUrl(key));               // Fetching Object from Object Store

    request.onsuccess = function(event) {
        console.log('Error, the requested file could not been fetched. ' + event.target["errorCode"]);
        onSuccess(event.target["result"]);
    };

    request.onerror = function(event) {
        console.log('Requested files is not stored in the database table. ' + event.target["errorCode"]);
        onError();
    };
}

function relativeToAbsoluteUrl(url) {
    let link = document.createElement("a");
    link.href = url;
    return link.href;
}