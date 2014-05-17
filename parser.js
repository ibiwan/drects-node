var quote = "'";
var bslash = "\\";
formula_candidates = [
    // '=sum(root)',
    // '=sum(root.members[*])',
    // '=sum(3)',
    // '=add(3)',
    // '=add(3, 4)',
    // '=neg(3)',
    // '=count(3)',
    '=sum(3',
    // '=sum',
    // '=sum(3)q',
    // '=add(37, this.parent.elements[5])',
    // '=this.parent',
    // '=this.pa-rent',
    // '=count(7,this.parent.members[*])',
    // '=this.parent.elements[*]',
    // 'sum(3)',
    // '=57',
    // '=57q',
    // '=-23',
    // '=1.57',
    // '=null',
    // "='hello world'",
    // "='hello world',",
    // "='hello world'q",
    // "='hello w"+bslash+quote+"orld!"+bslash+bslash+"!!'",
    // "='hello world!!!"+bslash+"'",
    // '=true',
    // '=false',
    // '=trueq',
];


for(var i = 0; i < 20; i++)
    console.log();

var puncts_dict = {
    '(' : 'LPAREN',
    ')' : 'RPAREN',
    '[' : 'LBRACK',
    ']' : 'RBRACK',
    '=' : 'EQUALS',
    ',' : 'COMMA',
    '*' : 'STAR',
    '.' : 'DOT',
    '-' : 'NEG',
};
var puncts = {};
var puncts_str = {};
for(var key in puncts_dict)
{
    var str = puncts_dict[key];
    puncts[str] = key;
    puncts_str[str] = str;
}

var reserveds = {
    'NULL'      : ['null'],
    'ROOT'      : ['root'],
    'THIS'      : ['this'],
    'MIXED'     : ['count'],
    'BOOL'      : ['true', 'false'],
    'UNARY'     : ['neg', 'abs', 'not'],
    'SUBPATH'   : ['elements', 'members', 'parent'],
    'AGGREGATE' : ['sum', 'prod', 'min', 'max', 'mean'],
    'BINARY'    : ['add', 'sub', 'mul', 'div', 'mod', 'and', 'or'],
};
var taggeds = [
    'STRING',
    'DIGITS',
    'LABEL',
];
function lexstring(haystack)
{
    var chars = haystack.split('');
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
        if( c === "'" ) // end of string
        {
            var ret = substr.join('');
            return {'string':substr.join(''), 'end_index':i};
        }
        substr.push(c);
    }
    console.log("unterminated string");
    return false;
}
function lexdigits(haystack)
{
    console.log("haystack:", haystack);
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
        return {'digits':digits.join(''), 'end_index':i};
    }
    console.log("lexdigits failed. ??");
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
function lex(str)
{
    var tokenstream = [];

    for(var i = 0; i < str.length; i++)
    {
        var c = str.substr(i, 1);
        // console.log("c:", c);

        if( c === "'" )
        {
            var ls = lexstring(str.substr(i));
            i += ls.end_index;
            tokenstream.push({'token':'STRING', 'tag':ls.string});
            continue;
        }
        if( puncts_dict[c] )
        {
            tokenstream.push(puncts_dict[c]);
            continue;
        }
        if( c >= '0' && c <= '9' )
        {
            var ld = lexdigits(str.substr(i));
            i += ld.end_index - 1;
            tokenstream.push({'token':'DIGITS', 'tag':ld.digits});
            continue;
        }

        var found = false;
        for( var key in reserveds )
        {
            var candidates = reserveds[key];
            var word = startswithany(str.substr(i), candidates);
            if( word )
            {
                i += word.length - 1;
                tokenstream.push({'token':key, 'tag':word});
                found = true;
                continue;
            }
        }
        if(found)
        {
            continue;
        }

        if( ( c >= 'a' && c <= 'z' ) || ( c >= 'A' && c <= 'Z' ) )
        {
            var ll = lexlabel(str.substr(i));
            i += ll.end_index - 1;
            tokenstream.push({'label':'LABEL', 'tag':ll.label});
            continue;
        }
    }
    return tokenstream;
}

function startswith(bigstring, prefix)
{
    if( bigstring === undefined )
    {
        return false;
    }
    // bigstring = bigstring.trim();
    return ( bigstring.substring(0, prefix.length) === prefix );
}
function stringafter(bigstring, prefix)
{
    bigstring = bigstring.trim();
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
function eattoken(bigstring, tokens, errstr)
{
    var which = startswithany(bigstring, tokens);
    if( which )
    {
        return {
            'token'     : which,
            'remainder' : stringafter(bigstring, which)
        };
    }
    if(errstr)
    {
        console.log(errstr);
    }
    return false;
}

unary_fns = {
    'abs' : function u_abs(p) { return abs(p); },
    'neg' : function u_neg(p) { return -p; },
    'not' : function u_not(p) { return !p; },
};
binary_fns = {
    'add' : function b_add(p1, p2) { return p1 + p2; },
};
aggregate_fns = {
    'sum' : function a_sum(a){
        var sum = 0;
        for(var i = 0; i < a.length; i++)
        {
            sum += a[i];
        }
        return sum;
    },
};
mixed_fns = {
     // need "find" but that's tensor-return, not scalar
     'count' : function m_count(target, a){
        var count = 0;
        for(var i = 0; i < a.length; i++)
        {
            if(a[i] === target ) count += 1;
        }
        return count;
    },
};

productions = {
    'p_scalar_subpath' : {
        'prefixes' : function get_p_scalar_subpath_prefixes(){return [puncts_str.DOT];},
        'parse'    : function p_scalar_subpath_parse(v, io) {
            console.log("scalar_subpath:", v);
            console.log("<<FIXME>> NOT HANDLED YET");
            io.remainder = v;
            return true;
        },
    },
    'p_tensor_subpath' : {
        'prefixes' : function get_p_tensor_subpath_prefixes(){return [puncts_str.DOT];},
        'parse'    : function p_tensor_subpath_parse(v, io) {
            console.log("tensor_subpath:", v);
            console.log("<<FIXME>> NOT HANDLED YET");
            io.remainder = v;
            return true;
        },
    },
    'p_params_helper' : p_params_helper = function p_params_helper(v, io, params){
        var comma = ',';
        var success;
        console.log(params.label, v);

        var param1_io = {};
        success = params.first_prod.parse(v, param1_io);
        if( !success )
        {
            return false;
        }

        if( params.second_prod )
        {
            v = param1_io.remainder;
            if( v[0] !== puncts_str.COMMA )
            {
                console.log('comma required between binary function parameters');
                return false;
            }

            var param2_io = {};
            success = params.second_prod.parse(v.slice(1), param2_io);
            if( !success )
            {
                return false;
            }

            io.value = { 'param1' : param1_io.value, 'param2' : param2_io.value};
            io.remainder = param2_io.remainder;
            return true;
        } else {
            io.value = { 'param1' : param1_io.value };
            io.remainder = param1_io.remainder;
            return true;
        }
    },
    'p_unary_params' : {
        'prefixes' : function get_p_unary_params_prefixes(){return [puncts_str.DOT];},
        'parse'    : function p_unary_params_parse(v, io) {
            return p_params_helper(v, io, {
                'label':'unary_params:',
                'first_prod' : productions.p_scalar,
            });
        },
    },
    'p_aggregate_params' : {
        'prefixes' : function get_p_aggregate_params_prefixes(){return ['.'];},
        'parse'    : function p_aggregate_params_parse(v, io) {
            return p_params_helper(v, io, {
                'label':'aggregate_params:',
                'first_prod' : productions.p_tensor_path,
            });
        },
    },
    'p_binary_params' : {
        'prefixes' : function get_p_binary_params_prefixes(){return ['.'];},
        'parse'    : function p_binary_params_parse(v, io) {
            return p_params_helper(v, io, {
                'label':'mixed_params:',
                'first_prod' : productions.p_scalar,
                'second_prod': productions.p_scalar,
            });
        },
    },
    'p_mixed_params' : {
        'prefixes' : function get_p_mixed_params_prefixes(){return ['.'];},
        'parse'    : function p_mixed_params_parse(v, io) {
            return p_params_helper(v, io, {
                'label':'mixed_params:',
                'first_prod' : productions.p_scalar,
                'second_prod': productions.p_tensor_path,
            });
        },
    },
    'p_unary' : {
        'functions' : unary_fns,
        'prefixes' : function get_p_unary_prefixes(){return ['UNARY'];},
        'params'   : function get_p_unary_params(){return 'p_unary_params';},
        'apply'    : function p_unary_parse(fname, params){
            var p = params.value.param1;
            if( p === undefined )
            {
                console.log("can't apply function '" + fname + "' to param: ", p);
                return undefined;
            }
            return unary_fns[fname](p);
        }
    },
    'p_binary' : {
        'functions' : binary_fns,
        'prefixes' : function get_p_binary_prefixes(){return ['BINARY'];},
        'params'   : function get_p_binary_params(){return 'p_binary_params';},
        'apply'    : function p_binary_parse(fname, params){
            var p1 = params.value.param1;
            var p2 = params.value.param2;
            if( p1 === undefined || p2 === undefined )
            {
                console.log("can't apply function '" + fname + "' to params:", p1, ",", p2);
                return undefined;
            }
            return binary_fns[fname](p1, p2);
        }
    },
    'p_mixed' : {
        'functions' : mixed_fns,
        'prefixes' : function get_p_mixed_prefixes(){return ['MIXED'];},
        'params'   : function get_p_mixed_params(){return 'p_mixed_params';},
        'apply'    : function p_mixed_parse(fname, params){
            var p1 = params.value.param1;
            var p2 = params.value.param2;
            if( p1 === undefined || p2 === undefined || !Array.isArray(p2) )
            {
                console.log("can't apply function '" + fname + "' to params:", p1, ",", p2);
                return undefined;
            }
            return mixed_fns[fname](p1, p2);
        }
    },
    'p_aggregate' : {
        'functions' : aggregate_fns,
        'prefixes' : function get_p_aggregate_prefixes(){return ['AGGREGATE'];},
        'params'   : function get_p_aggregate_params(){return 'p_aggregate_params';},
        'apply'    : function p_aggregate_parse(fname, params){
            var p = params.value.param1;
            if( p === undefined || !Array.isArray(p) )
            {
                console.log("can't apply function '" + fname + "' to param:", p);
                return undefined;
            }
            return aggregate_fns[fname](params.value.param);
        }
    },
    'p_number' : {
        'cases'    : p_number_cases = ['DIGITS', 'NEG'],
        'prefixes' : function get_p_number_prefixes(){return p_number_cases;},
        'parse'    : function p_number_parse(v, io) {
            console.log("number:", v);
            io.value = parseFloat(v[0].tag);
            if(isNaN(io.value))
            {
                console.log("number could not be parsed");
                return false;
            }
            io.remainder = v.slice(1);
            return true;
        },
    },
    'p_string' : {
        'prefixes' : function get_p_string_prefixes(){return ['STRING'];},
        'parse'    : function p_string_parse(v, io) {
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
        'cases'    : p_bool_cases = ['BOOL'],
        'prefixes' : function get_p_bool_prefixes(){return p_bool_cases;},
        'parse'    : function p_bool_parse(v, io) {
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
        'prefixes' : function get_p_null_prefixes(){return ['NULL'];},
        'parse'    : function p_null_parse(v, io) {
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
    'p_path_helper' : p_path_helper = function p_path_helper(v, io, parseparams){
        console.log(parseparams.label, v);

        var i = parseparams.prefixes.indexOf(v[0].token);
        if( i === -1 )
        {
            console.log(parseparams.error1);
            return false;
        }

        var prefix = parseparams.prefixes[i];
        console.log("starting element:", prefix);

        // check for subpath and parse if present
        var prod = parseparams.prod;
        var j = prod.prefixes().indexOf(v[1]);
        if( j > -1 )
        {
            var path_io = {'initial':prefix};
            var success = prod.parse(v.slice(2), path_io);
            io.value     = path_io.value;
            io.remainder = path_io.remainder;
            console.log("subpath io:", io);
            return success;
        } else {
            io.value = "root";
            io.remainder = v.slice(1);
            console.log("fullpath io:", io);
            return true;
        }
    },
    'p_scalar_path' : {
        'cases'    : p_scalar_path_prefixes = ['ROOT', 'THIS'],
        'prefixes' : function get_p_scalar_path_prefixes(){return p_scalar_path_prefixes;},
        'parse'    : function p_scalar_path_parse(v, io) {
            return p_path_helper(v, io, {
                'label'    : "scalar path:",
                'prefixes' : p_scalar_path_prefixes,
                'error1'   : 'scalar path must start with root or this',
                'prod'     : productions.p_scalar_subpath,
            });
        },
    },
    'p_tensor_path' : {
        'cases'    : p_tensor_path_prefixes = ['ROOT', 'THIS'],
        'prefixes' : function get_p_tensor_path_prefixes(){return p_tensor_path_prefixes;},
        'parse'    : function p_tensor_path_parse(v, io) {
            return p_path_helper(v, io, {
                'label'    : "tensor path:",
                'prefixes' : p_tensor_path_prefixes,
                'error1'   : 'tensor path must start with root or this',
                'prod'     : productions.p_tensor_subpath,
            });
        },
    },
    'p_function_call' : {
        'cases'    : p_function_call_cases = ['p_unary','p_binary','p_mixed','p_aggregate'],
        'prefixes' : function get_p_function_call_prefixes(){
            var ret = [];
            for(var i = 0; i < p_function_call_cases.length; i++)
            {
                var fcase = p_function_call_cases[i];
                var prod = productions[fcase];
                ret = ret.concat(prod.prefixes());
            }
            return ret;
        },
        'parse'    : function p_function_call_parse(v, io) {
            var left = '(', right = ')';
            console.log("function_call:", v);
            for(var i = 0; i < p_function_call_cases.length; i++)
            {
                var f_case = p_function_call_cases[i];
                var prod = productions[f_case];
                var fname = v[0].tag;
                var fns = prod.functions;

                if( !fns[fname] )
                {
                    continue;
                }

                if( v[1] !== puncts_str.LPAREN )
                {
                    console.log("left paren expected to start function call params");
                    return false;
                }

                var params_io = {};
                var parm_prod = productions[prod.params()];
                var success = parm_prod.parse(v.slice(2), params_io);
                if( !success )
                {
                    return false;
                }
                console.log("params_io:", params_io);
                v = params_io.remainder;

                if( v[0] !== puncts_str.RPAREN )
                {
                    console.log("right paren expected to finish function call params");
                    return false;
                }

                var collection_or_value = params_io.value;
                if( fns[fname] )
                {
                    io.value = prod.apply(fname, params_io);
                }
                io.remainder = v.slice(1);
                if( io.value === undefined )
                {
                    return false;
                }

                return true;
            }
            console.log("function call must start with a function keyword");
            return false;
        },
    },
    'p_scalar' : {
        'cases'    : p_scalar_cases = ['p_number', 'p_string', 'p_bool', 'p_null', 'p_scalar_path', 'p_function_call'],
        'prefixes' : function get_p_scalar_prefixes(){
            var ret = [];
            for(var i = 0; i < p_scalar_cases.length; i++)
            {
                ret = ret.concat(productions[p_scalar_cases[i]].prefixes());
            }
            return ret;
        },
        'parse'    : function p_scalar_parse(v, io) {
            console.log("scalar:", v);
            for(var i = 0; i < p_scalar_cases.length; i++)
            {
                var prod_name = p_scalar_cases[i];
                var prod = productions[prod_name];
                if( prod.prefixes().indexOf(v[0].token) > -1 )
                {
                    var scalar_io = {};
                    var success = prod.parse(v, scalar_io);
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
        'prefixes' : function get_p_formula_prefixes(){return [puncts_str.EQUALS];},
        'parse'    : function p_formula_parse(v, io) {
            console.log("formula:", v);

            if( v[0] !== puncts_str.EQUALS )
            {
                console.log("formula must start with " + puncts_str.EQUALS);
                return false;
            }

            var scalar_io = {};
            var success = productions.p_scalar.parse(v.slice(1), scalar_io);
            io.value     = scalar_io.value;
            io.remainder = scalar_io.remainder;
            if( success && scalar_io.remainder.length > 0 )
            {
                console.log("didn't expect anything after formula, got:", scalar_io.remainder);
                return false;
            }
            console.log(io);
            return success;
        }
    }
};

function parse_formula(formula, io)
{
    var tokenstream = lex(formula);
    var formula_io = {};
    var success = productions.p_formula.parse(tokenstream, formula_io);
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
