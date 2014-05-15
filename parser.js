formula_candidates = [
    '=sum(3)',
    '=this.parent',
    '=count(7,this.parent.children[*])',
    'sum(3)',
    '=57',
    '=-23',
    '=1.57',
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
    'number' : {
        'prefixes' : ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-'],
        'parse'   : function(v) {return true;},
    },
    'string' : {
        'prefixes' : ["'"],
        'parse'   : function(v) {return true;},
    },
    'bool' : {
        'prefixes' : ['true', 'false'],
        'parse'   : function(v) {return true;},
    },
    'null' : {
        'prefixes' : ['null'],
        'parse'   : function(v) {return true;},
    },
    'scalar_path' : {
        'prefixes' : ['root', 'this'],
        'parse'   : function(v) {return true;},
    },
    'function_call' : {
        'prefixes' : ['neg', 'abs', 'add', 'sub', 'mul', 'div', 'mod', 'count', 'find', 'sum', 'prod', 'min', 'max', 'mean'],
        'parse'   : function(v) {return true;},
    },
    'scalar' : {
        'prefixes' : [''],
        'parse'   : function(v) {
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
