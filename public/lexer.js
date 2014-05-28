var functions = require('./functions');
var log = require('./log').log;

var puncts_dict = {
    '('  : 'LPAREN',
    ')'  : 'RPAREN',
    '['  : 'LBRACK',
    ']'  : 'RBRACK',
    '<'  : 'LCHEV',
    '>'  : 'RCHEV',
    '='  : 'EQUALS',
    ','  : 'COMMA',
    '*'  : 'STAR',
    '.'  : 'DOT',
    '-'  : 'NEG',
    '/'  : 'SLASH',
    '\\' : 'BSLASH',
    '\'' : 'QUOTE',
};
var puncts_str = {};
for(var key in puncts_dict)
{
    var str = puncts_dict[key];
    puncts_str[str] = str;
}

var reserveds = {
    'NULL'      : ['null'],
    'PARENT'    : ['parent'],
    'BOOL'      : ['true', 'false'],
};

var flist = functions.get_list();
for(i = 0; i < flist.length; i++)
{
    var f = flist[i];
    var type = f.type.toUpperCase();
    if( !reserveds[type] ) { reserveds[type] = []; }
    reserveds[type].push(f.name);
}

function lexlabel(haystack)
{
    var chars = haystack.split('');
    var label = [];
    for(var i = 0; i < chars.length; i++)
    {
        var c = chars[i];
        if( (c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (['-','_'].indexOf(c) > -1) )
        {
            label.push(c);
            continue;
        }
        break;
    }
    return {'label':label.join(''), 'end_index':i};
}
function lexdigits(haystack)
{
    var chars = haystack.split('');
    var digits = [];
    for(var i = 0; i < chars.length; i++)
    {
        var c = chars[i];
        if( c >= '0' && c <= '9' )
        {
            digits.push(c);
            continue;
        }
        break;
    }
    return {'digits':digits.join(''), 'end_index':i};
}
function lexstring(haystack)
{
    var chars = haystack.split('');
    var substr = [];
    for(var i = 0; i < chars.length; i++)
    {
        var c = chars[i];
        if( i === 0 )
        {
            if( c !== "'" ) throw "lex error: string must start with single quote";
        }
        if( c === '\\' ) // escape!
        {
            i++;
            c = chars[i];
            if( [puncts_str.BSLASH, puncts_str.QUOTE].indexOf(c) === -1 )
            {
                throw "lex error: backslash in a string must precede backslash or single quote";
            }
            substr.push(c);
            continue;
        }
        if( c === "'" ) // end of string
        {
            var ret = substr.join('');
            return {'string':substr.join(''), 'end_index':i};
        }
        substr.push(c);
    }

    throw "lex error: unterminated string";
}

function lex(str)
{
    var tokenstream = [];

    for(var i = 0; i < str.length; i++)
    {
        var c = str.substr(i, 1);
        if( c === "'" )
        {
            var ls = lexstring(str.substr(i));
            i += ls.end_index;
            tokenstream.push({'token':'STRING', 'tag':ls.string});
            continue;
        }

        var p = puncts_dict[c];
        if( p )
        {
            tokenstream.push({'token':p, 'tag':'(' + p + ')'});
            continue;
        }

        if( c >= '0' && c <= '9' )
        {
            var ld = lexdigits(str.substr(i));
            i += ld.end_index - 1;
            tokenstream.push({'token':'DIGITS', 'tag':ld.digits});
            continue;
        }

        if( ( c >= 'a' && c <= 'z' ) || ( c >= 'A' && c <= 'Z' ) )
        {
            var ll = lexlabel(str.substr(i));
            i += ll.end_index - 1;
            var found = false;
            for( var key in reserveds )
            {
                var candidates = reserveds[key];
                if( candidates.indexOf(ll.label) > -1 )
                {
                    tokenstream.push({'token':key, 'tag':ll.label});
                    found = true;
                    continue;
                }
            }
            if( found )
            {
                continue;
            }
            tokenstream.push({'token':'LABEL', 'tag':ll.label});
            continue;
        }
    }
    return tokenstream;
}

myexports = {
    'punct' : puncts_str,
    'lex'   : lex,
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
