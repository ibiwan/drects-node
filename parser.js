formula_candidates = [
    '=sum(3)',
    '=this.parent',
    '=count(7,this.parent.children[*])',
    '=this.parent.children[*]',
    'sum(3)',
    '=57',
    '=-23',
    '=1.57',
    '=null',
];

function startswith(bigstring, prefix)
{
    return ( bigstring.substring(0, prefix.length) == prefix );
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
    'scalar_subpath' : {
        'prefixes' : ['.'],
        'parse'    : function(v) {
            console.log("scalar_subpath:", v);
            return true;
        },
    },
    'unary_call' : {
        'prefixes' : ['neg', 'abs'],
        'parse'    : function(v) {
            console.log("unary_call:", v);
            return true;
        },
    },
    'binary_call' : {
        'prefixes' : ['add', 'sub', 'mul', 'div', 'mod'],
        'parse'    : function(v) {
            console.log("binary_call:", v);
            return true;
        },
    },
    'mixed_call' : {
        'prefixes' : ['count'], // <<FIXME>> need 'find' but that's an aggregate-RETURN call
        'parse'    : function(v) {
            console.log("mixed_call:", v);
            return true;
        },
    },
    'aggregate_call' : {
        'prefixes' : ['sum', 'prod', 'min', 'max', 'mean'],
        'parse'    : function(v) {
            console.log("aggregate_call:", v);
            return true;
        },
    },
    'number' : {
        'prefixes' : ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-'],
        'parse'    : function(v) {
            console.log("number:", v);
            return true;
        },
    },
    'string' : {
        'prefixes' : ["'"],
        'parse'    : function(v) {
            console.log("string:", v);
            return true;
        },
    },
    'bool' : {
        'prefixes' : ['true', 'false'],
        'parse'    : function(v) {
            console.log("bool:", v);
            return true;
        },
    },
    'null' : {
        'prefixes' : ['null'],
        'parse'    : function(v) {
            console.log("null:", v);
            // <<FIXME>> do something with null
            return true;
        },
    },
    'scalar_path' : {
        'prefixes' : scalar_path_prefixes = ['root', 'this'],
        'parse'    : function(v) {
            console.log("scalar_path:", v);
            var prefix = startswithany(v, scalar_path_prefixes);
            var remainder = stringafter(v, prefix);
            if( prefix === false )
            {
                console.log("scalar path must start with root or this");
                return false;
            }
            console.log("starting element:", prefix);
            // <<FIXME>> do something about chosen prefix

            // check for subpath and parse if present
            var prod = productions['scalar_subpath'];
            if( startswithany(remainder, prod.prefixes) )
            {
                return prod.parse(remainder);
            } else {
                console.log("no subpath");
            }
            return true;
        },
    },
    'function_call' : {
        'prefixes' : ['neg', 'abs', 'add', 'sub', 'mul', 'div', 'mod', 'count', 'find', 'sum', 'prod', 'min', 'max', 'mean'],
        'parse'    : function(v) {
            console.log("function_call:", v);
            var options = ['unary_call','binary_call','mixed_call','aggregate_call'];
            for(var i = 0; i < options.length; i++)
            {
                var option = productions[options[i]];
                if( startswithany( v, option.prefixes ) )
                    return option.parse(v);
            }
            console.log("function call must start with a function keyword");
            return false;
        },
    },
    'scalar' : {
        'prefixes' : [''],
        'parse'    : function(v) {
            console.log("scalar:", v);
            var options = ['number', 'string', 'bool', 'null', 'scalar_path', 'function_call'];
            for(var i = 0; i < options.length; i++)
            {
                var option = productions[options[i]];
                if( startswithany( v, option.prefixes ) )
                    return option.parse(v);
            }
            console.log("scalar must be number, string, bool, null, scalar path, or function call");
            return false;
        },
    },
    'formula' : {
        'prefixes' : ['='],
        'parse'    : function(v) {
            console.log("formula:", v);
            var init = '=';
            if( startswith(v, init) )
            {
                return productions['scalar'].parse(stringafter(v, init));
            }
            console.log("formula must start with " + init);
            return false;

        }
    }
};

function parse_formula(formula)
{
    return productions['formula'].parse(formula);
}

for(var i = 0; i < formula_candidates.length; i++)
{
    var f = formula_candidates[i];
    console.log("\ncandidate:", f);
    if( parse_formula(f) )
    {
        console.log("good");
    } else {
        console.log("errors");
    }
}
