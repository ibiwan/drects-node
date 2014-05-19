var quote = "'";
var bslash = "\\";
formula_candidates = [
    // '=sum(root)',
    '=add(this.parent.member[mikey].element[27].parent, 22)',
    // '=sum(root.members[*])',
    // '=add(root.members[*], 4)',
    // '=sum(3)',
    // '=add(3)',
    // '=add(3, 4)',
    // '=add(3, add(2, 2))',
    // '=neg(3)',
    // '=count(3)',
    // '=sum(3',
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
    'SUBPATH'   : ['elements', 'members', 'parent', 'element', 'member'],
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

        if( c === "'" )
        {
            var ls = lexstring(str.substr(i));
            if( ls === false )
            {
                return false;
            }
            i += ls.end_index;
            tokenstream.push({'token':'STRING', 'tag':ls.string});
            continue;
        }
        if( puncts_dict[c] )
        {
            tokenstream.push({'token':puncts_dict[c], 'tag':null});
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

function scalarvaluegetter(home_node, root_node, path_elements)
{
    console.log("getting scalar from path:\n", path_elements);
    return 87;
}
function tensorvaluesgetter(home_node, root_node, path_elements)
{
    console.log("getting tensor from path:\n", path_elements);
    return [87, 23, -5];
}

function asserttoken(v, i, tok, err)
{
    if( !v[i] || v[i].token !== tok )
    {
        console.log(err);
        return false;
    }
    return true;
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
    'p_subpath_helper' : p_subpath_helper = function p_subpath_helper(v, io, params){
        console.log(params.label);

        var path = [];
        var remainder = v;

        var succes = true;

        if(!asserttoken(v, 0, puncts_str.DOT, 'subpath should start with dot')) return false;
        if(!asserttoken(v, 1, 'SUBPATH', params.subpath_error)) return false;

        var subpath_type = v[1].tag.toLowerCase();

        if( subpath_type === 'parent' )
        {
            path.push({'type':'PARENT', 'selector':null});
            remainder = v.slice(2);
        }

        if( subpath_type === params.subpath_type.m || subpath_type === params.subpath_type.e )
        {
            if(!asserttoken(v, 2, puncts_str.LBRACK, "left bracket expected to start selector")) return false;
            if( subpath_type === params.subpath_type.m )
            {
                if(!asserttoken(v, 3, 'LABEL', params.label_error)) return false;
            }
            if( subpath_type === params.subpath_type.e )
            {
                if(!asserttoken(v, 3, 'DIGITS', params.index_error)) return false;
            }
            if(!asserttoken(v, 4, puncts_str.RBRACK, "right bracket expected to finish selector")) return false;

            path.push({'type':subpath_type.toUpperCase(), 'selector':v[3].tag});
            remainder = v.slice(5);
        }

        success = true;
        var prod = params.prod; // p_scalar_subpath or p_tensor_subpath both yield puncts_str.DOT
        var i = prod.prefixes().indexOf(remainder[0].token); // if "DOT" is next...
        if( i > -1 )
        {
            var path_io = {};
            success = prod.parse(remainder, path_io);

            path = path.concat(path_io.path);
            remainder = path_io.remainder;
        }

        io.path = path;
        io.remainder = remainder;
        // console.log(io);
        return success;
    },
    'p_scalar_subpath' : {
        'prefixes' : function get_p_scalar_subpath_prefixes(){return [puncts_str.DOT];},
        'parse'    : function p_scalar_subpath_parse(v, io) {
            params = {
                'label'         : 'scalar_subpath:',
                'subpath_types' : {'m':'member', 'e':'element'},
                'allow_star'    : false,
                'subpath_error' : 'subpath should start with subpath type (.member, .element, .parent)',
                'label_error'   : 'label expected as key',
                'index_error'   : 'digits expected as index',
                'subprod'       : productions.p_scalar_subpath,
            };
            return p_subpath_helper(v, io, params);
        },
    },
    'p_tensor_subpath' : {
        'prefixes' : function get_p_tensor_subpath_prefixes(){return [puncts_str.DOT];},
        'parse'    : function p_tensor_subpath_parse(v, io) {
            params = {
                'label'         : 'tensor_subpath:',
                'subpath_types' : {'m':'members', 'e':'elements'},
                'allow_star'    : true,
                'subpath_error' : 'subpath should start with subpath type (.members, .elements, .parent)',
                'label_error'   : 'label or * expected as key',
                'index_error'   : 'digits or * expected as index',
                'subprod'       : productions.p_tensor_subpath,
            };
            return p_subpath_helper(v, io, params);
        },
    },
    'p_params_helper' : p_params_helper = function p_params_helper(v, io, params){
        var comma = ',';
        var success;
        console.log(params.label);//, v);

        var param1_io = {};
        success = params.first_prod.parse(v, param1_io);
        if( !success )
        {
            return false;
        }

        if( params.second_prod )
        {
            v = param1_io.remainder;
            if(!asserttoken(v, 0, puncts_str.COMMA, "comma required between binary function parameters")) return false;

            var param2_io = {};
            success = params.second_prod.parse(v.slice(1), param2_io);
            if( !success )
            {
                return false;
            }

            io.value = { 'param1' : param1_io.value, 'param2' : param2_io.value};
            io.remainder = param2_io.remainder;
            // console.log(io);
            return true;
        } else {
            io.value = { 'param1' : param1_io.value };
            io.remainder = param1_io.remainder;
            // console.log(io);
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
            return aggregate_fns[fname](p);
        }
    },
    'p_number' : {
        'cases'    : p_number_cases = ['DIGITS', 'NEG'],
        'prefixes' : function get_p_number_prefixes(){return p_number_cases;},
        'parse'    : function p_number_parse(v, io) {
            console.log("number:");//, v);
            var i = 0, value;
            var negate = false;
            if( v[i].token === 'NEG' )
            {
                i++;
                negate = true;
            }
            if( (v.length >= 3+i) && (v[i+1].token === 'DOT') && (v[i+1].token === 'DIGITS') )
            {
                io.value = parseFloat(v[i].tag + '.' + v[i+2].tag);
                io.remainder = v.slice(i+3);
            } else {
                io.value = parseFloat(v[i].tag);
                io.remainder = v.slice(i+1);
            }
            if( isNaN(io.value) )
            {
                console.log("number could not be parsed");
                return false;
            }
            io.value = negate ? -io.value : io.value;
            // console.log(io);
            return true;
        },
    },
    'p_string' : {
        'prefixes' : function get_p_string_prefixes(){return ['STRING'];},
        'parse'    : function p_string_parse(v, io) {
            console.log("string:");//, v);
            if(v[0] && v[0].token !== 'STRING')
            {
                console.log("string must be string.");
                return false;
            }
            io.value = v[0].tag;
            io.remainder = v.slice(1);
            // console.log(io);
            return true;
        },
    },
    'p_bool' : {
        'cases'    : p_bool_cases = ['BOOL'],
        'prefixes' : function get_p_bool_prefixes(){return p_bool_cases;},
        'parse'    : function p_bool_parse(v, io) {
            console.log("bool:");//, v);
            if(!asserttoken(v, 0, 'BOOL', "bool must be bool.")) return false;

            var tag = v[0].tag.toLowerCase();
            io.remainder = v.slice(1);
            if( tag === 'true' )
            {
                io.value = true;
                return true;
            }
            if( tag === 'false' )
            {
                io.value = false;
                return true;
            }
            console.log("bool must be true or false");
            return false;
        },
    },
    'p_null' : {
        'prefixes' : function get_p_null_prefixes(){return ['NULL'];},
        'parse'    : function p_null_parse(v, io) {
            console.log("null:");//, v);
            if( !v[0] || v[0].token !== 'NULL' )
            {
                console.log("null must be null");
                return false;
            }
            io.value = null;
            io.remainder = v.splice(1);
            // console.log(io);
            return true;
        },
    },
    'p_path_helper' : p_path_helper = function p_path_helper(v, io, parseparams){
        console.log(parseparams.label);//, v);

        var i = parseparams.prefixes.indexOf(v[0].token);
        if( i === -1 )
        {
            console.log(parseparams.error1);
            return false;
        }

        var prefix = parseparams.prefixes[i];

        var path = [ {'type':prefix, 'selector':null} ];
        var success = true;

        // check for subpath and parse if present
        var remainder = v.slice(1);

        var prod = parseparams.prod; // p_scalar_subpath or p_tensor_path_prefixes both yield puncts_str.DOT
        var j = prod.prefixes().indexOf(v[1].token);
        if( j > -1 )
        {
            var path_io = {};
            success = prod.parse(remainder, path_io);

            path = path.concat(path_io.path);
            io.remainder = path_io.remainder;
        } else {
            io.remainder = remainder;
        }

        io.value = parseparams.getter(null, null, path);
        io.remainder = io.remainder;

        // console.log(io);
        return success;
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
                'getter'   : scalarvaluegetter,
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
                'getter'   : tensorvaluesgetter,
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
            console.log("function_call:");//, v);
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

                if( !v[1] || v[1].token !== puncts_str.LPAREN )
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

                if( !v[0] || v[0].token !== puncts_str.RPAREN )
                {
                    console.log("right paren expected to finish function call params");
                    return false;
                }
                console.log("APPLYING");

                var collection_or_value = params_io.value;
                if( fns[fname] )
                {
                    console.log("FUNCTION:", fname);
                    io.value = prod.apply(fname, params_io);
                }
                io.remainder = v.slice(1);
                if( io.value === undefined )
                {
                    return false;
                }

                // console.log(io);
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
            console.log("scalar:");//, v);
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
                    // console.log(io);
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
            console.log("formula:");//, v);

            if( !v[0] || v[0].token !== puncts_str.EQUALS )
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
            // console.log(io);
            return success;
        }
    }
};

function parse_formula(formula, io)
{
    var tokenstream = lex(formula);
    console.log(tokenstream);
    if( tokenstream === false )
    {
        return false;
    }
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
