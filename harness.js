var parser = require('./public/parser');
var log = require('./public/log').log;
var lex = require('./public/lexer');
var fs = require('fs');

function parse_formula(formula, io)
{
    var tokenstream = lex.lex(formula);
    log('lex', tokenstream);
    if( tokenstream === false )
    {
        return false;
    }
    var formula_io = {'context':io.context};
    var success = parser.parse(tokenstream, formula_io);
    io.value = formula_io.value;
    return success;
}


function runtestitem(tree, test_item)
{
    var f = test_item.text;
    var n = test_item.node;
    var r = test_item.result;

    log('formula', "candidate:", f);
    var io = {'context':{'root':tree, 'curr':n}};
    result = parse_formula(f, io);
    log('testing', {'success':result, 'io':io});
    if( result !== r.success )
    {
        log('testing', "result was", result, "; should have been", r.success);
    } else if( io.value !== r.value ) {
        log('testing', "value was", io.value, "; should have been", r.value);
    } else {
        log('testing', "result and value were correct.");
    }
    log('padding', '\n');
}

fs.readFile('./dnd.json', function(err, data){
    var i;
    var root = JSON.parse(data);

    var formula_candidates = [
        {
            'node'   : root,
            'text'   : '=sum(/<characters>[*]<levels>[*]<level>)',
            'result' : {'success':true, 'value':147.7}
        },
        {
            'node'   : root,
            'text'   : '=sum(/<characters>[1]<levels>[*]<level>)',
            'result' : {'success':true, 'value':14.7}
        },
        {
            'node'   : root,
            'text'   : '=sum(/<characters>[0]<levels>[*]<level>)',
            'result' : {'success':true, 'value':133}
        },
        {
            'node'   : root.characters[0].abilities,
            'text'   : '=add(max(.parent<levels>[*]<level>), 2)',
            'result' : {'success':true, 'value':134}
        },
        {
            'node'   : root.characters[0].abilities,
            'text'   : '=sum(.parent<levels>[*]<level>)',
            'result' : {'success':true, 'value':133}
        },
    ];

    for(i = 0; i < 10; i++) { log('padding'); }

    for(i = 0; i < formula_candidates.length; i++)
    {
        var cand = formula_candidates[i];
        log('debug', cand);
        runtestitem(root, cand);
    }
});
