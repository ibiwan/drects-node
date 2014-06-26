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
        var $$fields = node.data('$$fields');
        var sels = [];
        for( var i = 0; i < $$fields.length; i++ )
        {
            sels.push($$fields[i].data('selector'));
        }
        return sels;
    }
    function parent(tree, node)
    {
        return node.data('$field').data('$composition');
    }
    function child(node, selector)
    {
        var $$fields = node.data('$$fields');
        for( var i = 0; i < $$fields.length; i++ ) {
            var $field = $$fields[i];
            var s = $field.data('selector');
            if( s === selector ) {
                return $field.data('$data_node');
            }
        }
        console.log("could not find element: ", selector, " in structure: ", node);
        throw "could not find element: " + selector + " in structure: " + node;
    }
    function value(node)
    {
        return node.data('display_value');
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

