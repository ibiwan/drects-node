(function(init){  // deps
    if ( typeof module === 'object' && module && typeof module.exports === 'object' ) {
        // node
        module.exports = init();
    } else if ( typeof define === 'function' && define.amd ) {
        // amd (require.js)
        define([], function () {return init();});
    }
})(function(){ // init
    var out = {
        'padding'     : true,
        'log_type'    : true,

        'formula'     : true,
        'testing'     : true,

        'parse_error' : true,
        'lex_error'   : true,
        'path_error'  : true,
        'type_error'  : true,

        // 'parse'       : true,
        // 'lex'         : true,
        // 'debug'       : true,
        // 'path'        : true,
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
            console.log(values);
            // console.log.apply(this, values); // why did this stop working?
        }
    }

    return {
        'log' : log,
    };
});
