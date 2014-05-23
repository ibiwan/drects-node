var lex = require('./lexer');
var functions = require('./functions').functions;
var log = require('./log').log;
var o = require('./myobject');

function helpervaluegetter(root_node, curr_node, path_elements, params)
{
    log('path', params.label, path_elements, curr_node);
    try {
        if( path_elements.length === 0 )
        {
            if( o.isArray(curr_node)|| o.isObject(curr_node) )
            {
                log('type_error', "attempted to fetch non-leaf node");
                return {'success':false};
            }
            return {'success':true, 'value':curr_node};
        }
        var t = path_elements[0].type;
        var sel = path_elements[0].selector;
        var subpath = path_elements.slice(1);
        var ret = [];
        var s;
        switch(t)
        {
            case 'THIS':
                return params.recurse(root_node, curr_node, subpath);
            case 'ROOT':
                return params.recurse(root_node, root_node, subpath);
            case 'MEMBER':
            case 'ELEMENT':
                if( params.allow_star && sel === '(STAR)' )
                {
                    if(t === 'MEMBER' && !o.isObject(curr_node) )
                    {
                        log('type_error', "attempted to get members of a non-object");
                        return {'success':false};
                    }
                    if(t === 'ELEMENT' && !o.isArray(curr_node) )
                    {
                        log('type_error', "attempted to get elements of a non-array");
                        return {'success':false};
                    }
                    for(s in o.selectors(curr_node))
                    {
                        var e = o.child(curr_node,s);
                        var elements = tensorvaluesgetter(root_node, e, subpath);
                        if( !elements.success )
                        {
                            return false;
                        }
                        ret = ret.concat(elements.value);
                    }
                    return {'success':true, 'value':ret};
                } else {
                    var mel = curr_node[sel];
                    if( mel === undefined )
                    {
                        log('path_error', "could not find element:", sel);
                        return {'success':false};
                    }
                    return params.recurse(root_node, mel, subpath);
                }
                break; // should have already hit a "return" in all cases
            case 'PARENT':
                return params.recurse(root_node, o.parent(root_node, curr_node), subpath);
            default:
                log('path_error', "unknown path element type:", t);
                return {'success':false};
        }
    } catch (err) {
        log('path_error', "could not traverse path:", path_elements);
        log('path_error', "from node:", curr_node);
        log('path_error', "exception:", err);
        console.trace();
        return {'success':false};
    }

    log('path_error', "not sure what happened, here");
    return {'success':false};
}

function scalarvaluegetter(root_node, curr_node, path_elements)
{
    var params = {
        'label'   : "getting scalar from path:\n",
        'recurse' : scalarvaluegetter,
        'allow_star' : false,
    };
    return helpervaluegetter(root_node, curr_node, path_elements, params);
}

function tensorvaluesgetter(root_node, curr_node, path_elements)
{
    var params = {
        'label'   : "getting tensor from path:\n",
        'recurse' : tensorvaluesgetter,
        'allow_star' : true,
    };
    return helpervaluegetter(root_node, curr_node, path_elements, params);
}

function asserttoken(v, i, tok, err)
{
    if( !v[i] || v[i].token !== tok )
    {
        if( err )
        {
            log('parse_error', err);
        }
        return false;
    }
    return true;
}

function asserttokens(v, i, toks, err)
{
    for(var idx = 0; idx < toks.length; idx++)
    {
        if( asserttoken(v, i, toks[idx], null) )
        {
            return true;
        }
    }
    log('parse_error', err);
    return false;
}

function p_params_helper(v, io, params)
{
    var comma = ',';
    var success;
    log('parse', params.label, v[0]);

    var param1_io = {'context':io.context};
    success = params.first_prod.parse(v, param1_io);
    if( !success )
    {
        return false;
    }

    if( params.second_prod )
    {
        v = param1_io.remainder;
        if(!asserttoken(v, 0, lex.punct.COMMA, "comma required between binary function parameters")) return false;

        var param2_io = {'context':io.context};
        success = params.second_prod.parse(v.slice(1), param2_io);
        if( !success )
        {
            return false;
        }

        io.value = { 'param1' : param1_io.value, 'param2' : param2_io.value};
        io.remainder = param2_io.remainder;
        log('debug', io);
        return true;
    } else {
        io.value = { 'param1' : param1_io.value };
        io.remainder = param1_io.remainder;
        log('debug', io);
        return true;
    }
}

function p_subpath_helper(v, io, params)
{
    log('parse', params.label, v[0]);

    var path = [];
    var remainder = v;

    var success = true;

    var allow = ( params.allow_star ) ? ['STAR'] : [];
    switch( v[0].token )
    {
        case lex.punct.DOT:
        log('parse', "v1:", v[1]);
            if(!asserttoken(v, 1, 'PARENT', 'DOT must be followed by "parent"')) return false;
            path.push({'type':'PARENT', 'selector':null});
            remainder = v.slice(2);
            break;
        case lex.punct.LBRACK: // brackets for index
            allow.push('DIGITS');
            if(!asserttokens(v, 1, allow, params.index_error))
            {
                return false;
            }
            if(!asserttoken(v, 2, lex.punct.RBRACK, 'right bracket expected to finish index')) return false;
            path.push({'type':'ELEMENT', 'selector':v[1].tag}); // null for star
            remainder = v.slice(3);
            break;
        case lex.punct.LCHEV:  // chevrons for key
            allow.push('LABEL');
            if(!asserttokens(v, 1, allow, params.label_error))
            {
                return false;
            }
            if(!asserttoken(v, 2, lex.punct.RCHEV, 'right chevron expected to finish key')) return false;
            path.push({'type':'MEMBER', 'selector':v[1].tag}); // null for star
            remainder = v.slice(3);
            break;
        default:
            log('parse_error', 'subpath should start with one of: < [ .');
            return false;
    }

    if(remainder.length > 0)
    {
        success = true;
        var prod = params.subprod;
        var i = prod.prefixes().indexOf(remainder[0].token);
        if( i > -1 )
        {
            var path_io = {'context':io.context};
            success = prod.parse(remainder, path_io);

            path = path.concat(path_io.path);
            remainder = path_io.remainder;
        }
    }

    io.path = path;
    io.remainder = remainder;
    return success;
}

function p_path_helper(v, io, parseparams)
{
    log('parse', parseparams.label, v[0]);

    var prefix, remainder;

    if(v[0].token === 'SLASH')
    {
        prefix = 'ROOT';
        remainder = v.slice(1);
    } else {
        prefix = 'THIS';
        remainder = v;
    }
    var path = [ {'type':prefix, 'selector':null} ];

    var success = true;
    var prod = parseparams.prod;

    var j = prod.prefixes().indexOf(remainder[0].token);
    if( j > -1 )
    {
        var path_io = {'context':io.context};
        success = prod.parse(remainder, path_io);

        if( !success ) { return false; }

        path = path.concat(path_io.path);
        io.remainder = path_io.remainder;
    } else {
        io.remainder = remainder;
    }

    if( !success ) { return false; }

    var got = parseparams.getter(io.context.root, io.context.curr, path);
    log('path', got);
    if( got.success )
    {
        io.value = got.value;
        io.remainder = io.remainder;

        log('debug', io);
        return true;
    }
    return false;
}



productions = {
    'p_number' : {
        'prefixes' : function get_p_number_prefixes(){return ['DIGITS', 'NEG'];},
        'parse'    : function p_number_parse(v, io) {
            log('parse', "number:", v[0]);
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
                log('parse_error', "number could not be parsed");
                return false;
            }
            io.value = negate ? -io.value : io.value;
            log('debug', io);
            return true;
        },
    },
    'p_string' : {
        'prefixes' : function get_p_string_prefixes(){return ['STRING'];},
        'parse'    : function p_string_parse(v, io) {
            log('parse', "string:", v[0]);
            if(v[0] && v[0].token !== 'STRING')
            {
                log('parse_error', "string must be string.");
                return false;
            }
            io.value = v[0].tag;
            io.remainder = v.slice(1);
            log('debug', io);
            return true;
        },
    },
    'p_bool' : {
        'prefixes' : function get_p_bool_prefixes(){return ['BOOL'];},
        'parse'    : function p_bool_parse(v, io) {
            log('parse', "bool:", v[0]);
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
            log('parse_error', "bool must be true or false");
            return false;
        },
    },
    'p_null' : {
        'prefixes' : function get_p_null_prefixes(){return ['NULL'];},
        'parse'    : function p_null_parse(v, io) {
            log('parse', "null:", v[0]);
            if( !v[0] || v[0].token !== 'NULL' )
            {
                log('parse_error', "null must be null");
                return false;
            }
            io.value = null;
            io.remainder = v.splice(1);
            log('debug', io);
            return true;
        },
    },
    'p_unary_params' : {
        'prefixes' : function get_p_unary_params_prefixes(){return [lex.punct.DOT];},
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
        'functions' : functions.unary,
        'prefixes' : function get_p_unary_prefixes(){return ['UNARY'];},
        'params'   : function get_p_unary_params(){return 'p_unary_params';},
        'apply'    : function p_unary_parse(fname, params){
            log('apply', 'p_unary:');
            var p = params.value.param1;
            // log('path', params.context);
            if( p === undefined )
            {
                log('type_error', "can't apply function '" + fname + "' to param: ", p);
                return undefined;
            }
            return functions.unary[fname](p);
        }
    },
    'p_binary' : {
        'functions' : functions.binary,
        'prefixes' : function get_p_binary_prefixes(){return ['BINARY'];},
        'params'   : function get_p_binary_params(){return 'p_binary_params';},
        'apply'    : function p_binary_parse(fname, params){
            log('apply', 'p_binary:');
            var p1 = params.value.param1;
            var p2 = params.value.param2;
            log('path', params.context);
            if( p1 === undefined || p2 === undefined )
            {
                log('type_error', "can't apply function '" + fname + "' to params:", p1, ",", p2);
                return undefined;
            }
            return functions.binary[fname](p1, p2);
        }
    },
    'p_mixed' : {
        'functions' : functions.mixed,
        'prefixes' : function get_p_mixed_prefixes(){return ['MIXED'];},
        'params'   : function get_p_mixed_params(){return 'p_mixed_params';},
        'apply'    : function p_mixed_parse(fname, params){
            log('apply', 'p_mixed:');
            var p1 = params.value.param1;
            var p2 = params.value.param2;
            log('path', params.context);
            if( p1 === undefined || p2 === undefined || !Array.isArray(p2) )
            {
                log('type_error', "can't apply function '" + fname + "' to params:", p1, ",", p2);
                return undefined;
            }
            return functions.mixed[fname](p1, p2);
        }
    },
    'p_aggregate' : {
        'functions' : functions.aggregate,
        'prefixes' : function get_p_aggregate_prefixes(){return ['AGGREGATE'];},
        'params'   : function get_p_aggregate_params(){return 'p_aggregate_params';},
        'apply'    : function p_aggregate_parse(fname, params){
            log('apply', 'p_aggregate:');
            var p = params.value.param1;
            if( p === undefined || !Array.isArray(p) )
            {
                log('type_error', "can't apply function '" + fname + "' to param:", p);
                return undefined;
            }
            return functions.aggregate[fname](p);
        }
    },
    'p_scalar_subpath' : {
        'cases'    : p_scalar_subpath_prefixes = [lex.punct.DOT, lex.punct.LBRACK, lex.punct.LCHEV],
        'prefixes' : function get_p_scalar_subpath_prefixes(){return p_scalar_subpath_prefixes;},
        'parse'    : function p_scalar_subpath_parse(v, io) {
            params = {
                'label'         : 'scalar_subpath:',
                'allow_star'    : false,
                'label_error'   : 'label expected as key',
                'index_error'   : 'digits expected as index',
                'subprod'       : productions.p_scalar_subpath,
            };
            return p_subpath_helper(v, io, params);
        }, // aonsfokasnofnasd
    },
    'p_tensor_subpath' : {
        'cases'    : p_tensor_subpath_prefixes = [lex.punct.DOT, lex.punct.LBRACK, lex.punct.LCHEV],
        'prefixes' : function get_p_tensor_subpath_prefixes(){return p_tensor_subpath_prefixes;},
        'parse'    : function p_tensor_subpath_parse(v, io) {
            params = {
                'label'         : 'tensor_subpath:',
                'allow_star'    : true,
                'label_error'   : 'label or * expected as key',
                'index_error'   : 'digits or * expected as index',
                'subprod'       : productions.p_tensor_subpath,
            };
            return p_subpath_helper(v, io, params);
        }, // aonsfokasnofnasd
    },
    'p_scalar_path' : {
        'cases'    : p_scalar_path_prefixes = [lex.punct.SLASH, lex.punct.DOT, lex.punct.LBRACK, lex.punct.LCHEV],
        'prefixes' : function get_p_scalar_path_prefixes(){return p_scalar_path_prefixes;},
        'parse'    : function p_scalar_path_parse(v, io) {
            return p_path_helper(v, io, {
                'label'    : "scalar path:",
                'prefixes' : p_scalar_path_prefixes,
                'error1'   : 'scalar path must start with one of: [ < . /',
                'prod'     : productions.p_scalar_subpath,
                'getter'   : scalarvaluegetter,
            });
        },
    },
    'p_tensor_path' : {
        'cases'    : p_tensor_path_prefixes = [lex.punct.SLASH, lex.punct.DOT, lex.punct.LBRACK, lex.punct.LCHEV],
        'prefixes' : function get_p_tensor_path_prefixes(){return p_tensor_path_prefixes;},
        'parse'    : function p_tensor_path_parse(v, io) {
            return p_path_helper(v, io, {
                'label'    : "tensor path:",
                'prefixes' : p_tensor_path_prefixes,
                'error1'   : 'tensor path must start with one of: [ < . /',
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
            log('parse', "function_call:", v[0]);
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

                if( !v[1] || v[1].token !== lex.punct.LPAREN )
                {
                    log('parse_error', "left paren expected to start function call params");
                    return false;
                }

                var params_io = {'context':io.context};
                var parm_prod = productions[prod.params()];
                var success = parm_prod.parse(v.slice(2), params_io);
                if( !success )
                {
                    return false;
                }
                log('debug', "params_io:", params_io);
                v = params_io.remainder;

                if( !v[0] || v[0].token !== lex.punct.RPAREN )
                {
                    log('parse_error', "right paren expected to finish function call params");
                    return false;
                }
                log('debug', "APPLYING");

                var collection_or_value = params_io.value;
                if( fns[fname] )
                {
                    log('debug', "FUNCTION:", fname);
                    io.value = prod.apply(fname, params_io);
                }
                io.remainder = v.slice(1);
                if( io.value === undefined )
                {
                    return false;
                }

                log('debug', io);
                return true;
            }
            log('parse_error', "function call must start with a function keyword");
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
            log('parse', "scalar:", v[0]);
            for(var i = 0; i < p_scalar_cases.length; i++)
            {
                var prod_name = p_scalar_cases[i];
                var prod = productions[prod_name];
                if( prod.prefixes().indexOf(v[0].token) > -1 )
                {
                    var scalar_io = {'context':io.context};
                    var success = prod.parse(v, scalar_io);
                    io.value     = scalar_io.value;
                    io.remainder = scalar_io.remainder;
                    log('debug', io);
                    return success;
                }
            }
            log('parse_error', "scalar must be number, string, bool, null, scalar path, or function call");
            return false;
        },
    },
    'p_formula' : {
        'prefixes' : function get_p_formula_prefixes(){return [lex.punct.EQUALS];},
        'parse'    : function p_formula_parse(v, io) {
            log('parse', "formula:", v[0]);

            if( !v[0] || v[0].token !== lex.punct.EQUALS )
            {
                log('parse_error', "formula must start with " + lex.punct.EQUALS);
                return false;
            }

            var scalar_io = {'context':io.context};
            var success = productions.p_scalar.parse(v.slice(1), scalar_io);
            io.value     = scalar_io.value;
            io.remainder = scalar_io.remainder;
            if( success && scalar_io.remainder.length > 0 )
            {
                log('parse_error', "didn't expect anything after formula, got:", scalar_io.remainder);
                return false;
            }
            log('debug', io);
            return success;
        }
    }
};

module.exports = {
    'parse' : productions.p_formula.parse,
};
