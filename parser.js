var quote = "'";
var bslash = "\\";
formula_candidates = [
    // '=sum(3)',
    // '=sum(3)q',
    // '=add(3, this.parent.children[5])',
    // '=this.parent',
    // '=count(7,this.parent.children[*])',
    // '=this.parent.children[*]',
    // 'sum(3)',
    // 'sum(3)',
    '=57',
    '=57q',
    '=-23',
    '=1.57',
    // '=null',
    // "='hello world'",
    // "='hello world'q",
    // "='hello w"+bslash+quote+"orld!"+bslash+bslash+"!!'",
    // "='hello world!!!"+bslash+"'",
    // '=true',
    // '=false',
    // '=trueq',
];

function startswith(bigstring, prefix)
{
    return ( bigstring.substring(0, prefix.length) === prefix );
}
function stringafter(bigstring, prefix)
{
    return bigstring.substring(prefix.length);
}
function startswithany(bigstring, prefixes)
{
    for(var i = 0; i < prefixes.length; i++)
    {
        var prefix = prefixes[i];
        if( startswith(bigstring, prefix) )
            return prefix;
    }
    return false;
}

productions = {
    'p_scalar_subpath' : {
        'prefixes' : function(){return ['.'];},
        'parse'    : function(v, io) {
            console.log("scalar_subpath:", v);
            return true;
        },
    },
    'p_unary_call' : {
        'prefixes' : function(){return ['neg', 'abs'];},
        'parse'    : function(v, io) {
            console.log("unary_call:", v);
            return true;
        },
    },
    'p_binary_call' : {
        'prefixes' : function(){return ['add', 'sub', 'mul', 'div', 'mod'];},
        'parse'    : function(v, io) {
            console.log("binary_call:", v);
            return true;
        },
    },
    'p_mixed_call' : {
        'prefixes' : function(){return ['count'];}, // <<FIXME>> need 'find' but that's an aggregate-RETURN call
        'parse'    : function(v, io) {
            console.log("mixed_call:", v);
            return true;
        },
    },
    'p_aggregate_call' : {
        'prefixes' : function(){return ['sum', 'prod', 'min', 'max', 'mean'];},
        'parse'    : function(v, io) {
            console.log("aggregate_call:", v);
            return true;
        },
    },
    'p_number' : {
        'cases'    : p_number_cases = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-'],
        'prefixes' : function(){return p_number_cases;},
        'parse'    : function(v, io) {
            console.log("number:", v);
            io.value = parseFloat(v);
            if(isNaN(io.value))
            {
                console.log("number could not be parsed");
                return false;
            }
            io.remainder = stringafter(v, '' + io.value);
            return true;
        },
    },
    'p_string' : {
        'prefixes' : function(){return ["'"];},
        'parse'    : function(v, io) {
            console.log("string:", v);

            var chars = v.split('');
            var substr = [];
            for(var i = 0; i < chars.length; i++)
            {
                var c = chars[i];
                if( i === 0 )
                {
                    if( c === "'" ) // as it should be
                    {
                        continue;
                    }
                    console.log("string must start with single quote");
                    return false;
                }
                if( c === "'" ) // end of string
                {
                    io.value = substr.join('');
                    var rem = [];
                    for(var j = i+1; j < chars.length; j++)
                    {
                        rem.push(chars[j]);
                    }
                    io.remainder = rem.join('');
                    console.log(io);
                    return true;
                }
                if( c === bslash ) // escape!
                {
                    i++;
                    c = chars[i];
                    if( [bslash, quote].indexOf(c) === -1 )
                    {
                        console.log("backslash in a string must precede backslash or single quote");
                        return false;
                    }
                    substr.push(c);
                    continue;
                }
                substr.push(c);
            }
            console.log("unterminated string");
            return false;
        },
    },
    'p_bool' : {
        'cases'    : p_bool_cases = {true:['true', 'True'], false:['false', 'False']},
        'prefixes' : function(){return p_bool_cases[true].concat(p_bool_cases[false]);},
        'parse'    : function(v, io) {
            var truth;
            console.log("bool:", v);
            truth = startswithany(v, p_bool_cases[true]);
            if( truth )
            {
                io.value = true;
                io.remainder = stringafter(v, truth);
                console.log(io);
                return true;
            }
            truth = startswithany(v, p_bool_cases[false]);
            if( truth )
            {
                io.value = false;
                io.remainder = stringafter(v, truth);
                console.log(io);
                return true;
            }
            console.log("bool must be true or false");
            return false;
        },
    },
    'p_null' : {
        'prefixes' : function(){return ['null'];},
        'parse'    : function(v, io) {
            console.log("null:", v);
            var n = startswithany(v, ['null']);
            if( n )
            {
                io.value = null;
                io.remainder = stringafter(v, n);
                console.log(io);
                return true;
            }
            console.log("null must be null");
            return false;
        },
    },
    'p_scalar_path' : {
        'cases'    : p_scalar_path_prefixes = ['root', 'this'],
        'prefixes' : function(){return p_scalar_path_prefixes;},
        'parse'    : function(v, io) {
            console.log("scalar_path:", v);
            var prefix = startswithany(v, p_scalar_path_prefixes);
            var remainder = stringafter(v, prefix);
            if( prefix === false )
            {
                console.log("scalar path must start with root or this");
                return false;
            }
            console.log("starting element:", prefix);

            // check for subpath and parse if present
            var prod = productions.p_scalar_subpath;
            if( startswithany(remainder, prod.prefixes()) )
            {
                var path_io = {'initial':prefix};
                var success = prod.parse(remainder, path_io);
                io.value     = path_io.value;
                io.remainder = path_io.remainder;
                console.log(io);
                return success;
            } else {
                console.log("no subpath");
            }
            return true;
        },
    },
    'p_function_call' : {
        'cases'    : p_function_call_cases = ['p_unary_call','p_binary_call','p_mixed_call','p_aggregate_call'],
        'prefixes' : function(){
            var ret = [];
            for(var i = 0; i < p_function_call_cases.length; i++)
            {
                ret = ret.concat(productions[p_function_call_cases[i]].prefixes());
            }
            return ret;
        },
        'parse'    : function(v, io) {
            console.log("function_call:", v);
            for(var i = 0; i < p_function_call_cases.length; i++)
            {
                var production = productions[p_function_call_cases[i]];
                if( startswithany( v, production.prefixes() ) )
                {
                    var func_io = {};
                    var success = production.parse(v, func_io);
                    io.value     = func_io.value;
                    io.remainder = func_io.remainder;
                    console.log(io);
                    return success;
                }
            }
            console.log("function call must start with a function keyword");
            return false;
        },
    },
    'p_scalar' : {
        'cases'    : p_scalar_cases = ['p_number', 'p_string', 'p_bool', 'p_null', 'p_scalar_path', 'p_function_call'],
        'prefixes' : function(){
            var ret = [];
            for(var i = 0; i < p_scalar_cases.length; i++)
            {
                ret = ret.concat(productions[p_scalar_cases[i]].prefixes());
            }
            return ret;
        },
        'parse'    : function(v, io) {
            console.log("scalar:", v);
            for(var i = 0; i < p_scalar_cases.length; i++)
            {
                var production = productions[p_scalar_cases[i]];
                if( startswithany( v, production.prefixes() ) )
                {
                    var scalar_io = {};
                    var success = production.parse(v, scalar_io);
                    io.value     = scalar_io.value;
                    io.remainder = scalar_io.remainder;
                    console.log(io);
                    return success;
                }
            }
            console.log("scalar must be number, string, bool, null, scalar path, or function call");
            return false;
        },
    },
    'p_formula' : {
        'cases'    : ['p_scalar'],
        'prefixes' : function(){return ['='];},
        'parse'    : function(v, io) {
            console.log("formula:", v);
            var init = '=';
            if( startswith(v, init) )
            {
                var scalar_io = {};
                var success = productions.p_scalar.parse(stringafter(v, init), scalar_io);
                io.value     = scalar_io.value;
                io.remainder = scalar_io.remainder;
                if( success && scalar_io.remainder )
                {
                    console.log("didn't expect anything after formula, got:", scalar_io.remainder);
                    return false;
                }
                console.log(io);
                return success;
            }
            console.log("formula must start with " + init);
            return false;

        }
    }
};

function parse_formula(formula, io)
{
    var formula_io = {};
    var success = productions.p_formula.parse(formula, formula_io);
    io.value = formula_io.value;
    console.log(io);
    return success;
}

for(var i = 0; i < formula_candidates.length; i++)
{
    var f = formula_candidates[i];
    console.log("\ncandidate:", f);
    var io = {};
    if( parse_formula(f, io) )
    {
        console.log("good");
    } else {
        console.log("errors");
    }
}
