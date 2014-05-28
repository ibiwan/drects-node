var out = {
    'log_type'    : true,
    'padding'     : true,
    'formula'     : true,
    // 'parse'       : true,
    'parse_error' : true,
    // 'lex'         : true,
    'lex_error'   : true,
    // 'debug'       : true,
    // 'path'        : true,
    'path_error'  : true,
    'type_error'  : true,
    'testing'     : true,
    // 'apply'       : true,
};

function log(type)
{
    var values = Array.prototype.slice.call(arguments, 1);
    if( out[type] )
    {
        if(out.log_type && type !== 'padding')
        {
            values.unshift(type.toUpperCase() + ':');
        }
        console.log.apply(this, values);
    }
}

myexports = {
    'log' : log,
};
if ( typeof module === 'object' && module && typeof module.exports === 'object' ) {
    //Running inside node
    module.exports = myexports;
} else if ( typeof define === 'function' && define.amd ) {
    //Running inside AMD (require.js)
    define([], function () {return myexports;});
} else {
    //Dunno where we are, add it to the global context with a noConflict
    var previous = context.myexports;
    myexports.noConflict = function () {
        context.myexports = previous;
        return myexports;
    };
    context.myexports = myexports;
}
