#!/usr/local/bin/node

/*
 *  Testing harness, for use from command line, which goes through a list of nodes and formulas and parses/calculates each.
 */

(function(init){  // deps
    if ( typeof module === 'object' && module && typeof module.exports === 'object' ) {
        // node
        var parser = require('./public/parser');
        module.exports = init(
            parser,
            require('./public/log').log,
            require('fs')
        );
    } else if ( typeof define === 'function' && define.amd ) {
        // amd (require.js)
        define(['./parser', './log', 'fs'], function (parser, log, fs) {return init(parser, log.log, fs);});
    }
})(function(parser, log, fs){ // init

    function runtestitem(tree, test_item)
    {
        var f = test_item.text;
        var n = test_item.node;
        var r = test_item.result;

        log('formula', "candidate:", f);

        var context = {'root':tree, 'curr':n};
        var success = true;
        try{
            value = parser.parse_formula(f, context);
        }catch(e){
            log('parse_error', e);
            log('parse_error', e.stack);
            success = false;
        }

        log('testing', {'success':success, 'value':value});
        if( success !== r.success ) throw "testing: result was " + success + "; should have been " + r.success;
        if( value !== r.value ) throw "testing: value was " + value + "; should have been " + r.value;
        log('testing', "result and value were correct.");
        log('padding', '\n');
    }

    fs.readFile('./documents/dnd.json', function(err, data){
        var i;
        var root = JSON.parse(data);

        var formula_candidates = [
            {
                'node'   : root,
                'text'   : '=sum(/characters/*/levels/*/level)',
                'result' : {'success':true, 'value':147.7}
            },
            {
                'node'   : root,
                'text'   : '=sum(/characters/1/levels/*/level)',
                'result' : {'success':true, 'value':14.7}
            },
            {
                'node'   : root,
                'text'   : '=sum(/characters/0/levels/*/level)',
                'result' : {'success':true, 'value':133}
            },
            {
                'node'   : root.characters[0].abilities,
                'text'   : '=add(max(../levels/*/level), 2)',
                'result' : {'success':true, 'value':134}
            },
            {
                'node'   : root.characters[0].abilities,
                'text'   : '=sum(../levels/*/level)',
                'result' : {'success':true, 'value':133}
            },
            {
                'node'   : root.characters[0].abilities,
                'text'   : '=sum(/characters/*/name=exultation/../../levels/*/level)',
                'result' : {'success':true, 'value':133}
            },
        ];

        for(i = 0; i < 10; i++) { log('padding'); }

        for(i = 0; i < formula_candidates.length; i++)
        {
            try{
                var cand = formula_candidates[i];
                log('debug', cand);
                runtestitem(root, cand);
            }catch(e){
                log('testing', e);
                log('testing', e.stack);
            }
        }
    });
});
