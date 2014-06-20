(function(init){  // deps
    if ( typeof module === 'object' && module && typeof module.exports === 'object' ) {
        // node
        module.exports = init(require('./log').log);
    } else if ( typeof define === 'function' && define.amd ) {
        // amd (require.js)
        define(['./log'], function (log) {return init(log.log);});
    }
})(function(log){ // init

    function isArray(node)
    {
        return (node.attr('class') === 'array');
    }
    function isObject(node)
    {
        return (node.attr('class') === 'object');
    }
    function isLeaf(node)
    {
        return(!(isArray(node) || isObject(node)));
    }
    function selectors(node)
    {
        var kids = node.data('$$children');
        if(isArray(node))
        {
            var indices = [];
            for(var i = 0; i < kids.length; i++)
            {
                indices.push(i);
            }
            return indices;
        }
        if(isObject(node))
        {
            var keys = [];
            for(var k in kids)
            {
                keys.push(k);
            }
            return keys;
        }
    }
    function parent(tree, node)
    {
        return node.data('$parent');
    }
    function child(node, selector)
    {
        var kids = node.data('$$children');
        var c = kids[selector]; // member or element
        if( c === undefined )
        {
            throw "could not find element: " + c + " in structure: " + node;
        }
        return {'success':true, 'child':c};
    }
    function value(node)
    {
        return node.text();
    }

    return {
        'isArray'   : isArray,
        'isObject'  : isObject,
        'isLeaf'    : isLeaf,
        'parent'    : parent,
        'child'     : child,
        'selectors' : selectors,
        'value'     : value,
    };
});

