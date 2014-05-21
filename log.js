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

module.exports = {
    'log' : log,
};
