requirejs.config({
    "baseUrl" : "files",
    "paths"   : {
        "jquery"    : "include/jquery",
        "jquery-ui" : "include/jquery-ui",
    },
});

// Load the main app module to start the app
requirejs(["./ui"]);
