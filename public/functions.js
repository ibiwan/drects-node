var log = require('./log').log;

functions = {
    'unary' : {
        'abs' : function u_abs(p) { return abs(p); },
        'neg' : function u_neg(p) { return -p; },
        'not' : function u_not(p) { return !p; },
    },
    'binary' : {
        'add' : function b_add(p1, p2) { return p1 + p2; },
    },
    'aggregate' : {
        'sum' : function a_sum(a){
            var sum = 0;
            for(var i = 0; i < a.length; i++)
            {
                sum += a[i];
            }
            return sum;
        },
        'max' : function a_max(a){
            log('apply', "taking max of", a);
            var max = -Infinity;
            for( var i = 0; i < a.length; i++)
            {
                log('apply', 'a[i]', a[i]);
                if( a[i] > max )
                {
                    max = a[i];
                }
                return max;
            }
        }
    },
    'mixed' : {
        'count' : function m_count(target, a){
            var count = 0;
            for(var i = 0; i < a.length; i++)
            {
                if(a[i] === target ) count += 1;
            }
            return count;
        },
    },
    // need "find" but that's tensor-return, not scalar
};

function get_list(){
    var list = [];
    for(var type in functions)
    {
        for(var name in functions[type])
        {
            list.push({'type':type, 'name':name});
        }
    }
    return list;
}

module.exports = {
    'functions' : functions,
    'get_list':  get_list,
};
