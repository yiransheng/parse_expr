(function (root) {

  var Stack = function() {
    this.last = null;
  };
  Stack.prototype = {
    push: function(data) {
      var node = {data:data, 
        last:this.last};
      this.last = node;
    },
    pop: function() {
      var node = this.last;
      (node === null) || 
        (this.last = node.last, 
          node = node.data);
      return node
    },
    top : function() {
      var node = this.last;
      return node === null ? node : node.data;
    }
  };
  var SENTINEL = 'sentinel',
    BINARY = 'binary',
    UNARY = 'unary',
    CONSTANT = 'constant', 
    PROPERTY = 'member',
    escapee = {
      '"':  '"',
      '\\': '\\',
      '/':  '/',
      b:    'b',
      f:    '\f',
      n:    '\n',
      r:    '\r',
      t:    '\t'
    },
    unary_ops = {'-': true,'!': true, '~': true, '+': true},
    binary_ops = {
      '||': 1, '&&': 2, '|': 3,  '^': 4,  '&': 5,
      '==': 6, '!=': 6, '===': 6, '!==': 6,
      '<': 7,  '>': 7,  '<=': 7,  '>=': 7, 
      '<<':8,  '>>': 8, '>>>': 8,
      '+': 9, '-': 9,
      '*': 10, '/': 10, '%': 10
    },
    sentinel_op = { type: SENTINEL },
    max_len_binary = 3,
    max_len_unary = 1;
  // Based on the following non-left-recursive grammar
  // expr -> part { binary part }
  // part -> object | "(" expr ")" | unary part
  // object -> constant | variable
  // constant -> "true" | "false" | "null" | number | quoted string
  // variable -> identifier { property }
  // property -> "." identifier | "[" expr "]" 
  // {} := appears zero or more times 
  var text,
      at,
      ch, 
      operators,
      operands;

  function error(m) {
    // console.log(m, text.substr(at-1));
    throw {
      type: 'SyntaxError',
      messeage: m,
      at : at, 
      text: text
    }; 
  }
  function precedence(op) {
    switch(op.type) {
    case BINARY:
      return binary_ops[op.operator]
    case UNARY:
      return unary_ops[op.operator] + 10
    case SENTINEL: 
      return 0
    case PROPERTY: 
      return 20
    }
  }
  function comparePrecedence(op1, op2) {
    // return op1 > op2    
    if(op2.type == UNARY) return false;
    if(op2.type == SENTINEL) return true;
    if(op1.type == SENTINEL) return false;
    var p1 = precedence(op1),
      p2 = precedence(op2);
    if(op2.type == BINARY) return (p1 >= p2);
    if(op1.type == PROPERTY) return true;
  }
  function mkCnstNode(value) {
    return { type: CONSTANT, value: value }
  }
  function mkBinaryNode(op) {
    return { type: BINARY,
      operator: op, left: null, right: null }
  }
  function mkUnaryNode(op) {
    return { type: UNARY,
      operator: op, argument: null }
  }
  function popOperator() {
    var node = operators.top();
    if (node) {
      if(node.type == BINARY) {
        operators.pop();
        var t1 = operands.pop(),
          t2 = operands.pop();
        node.left = t2, node.right = t1;
        operands.push(node);
      } else if(node.type == UNARY) {
        operators.pop();
        var t1 = operands.pop();
        node.argument = t1;
        operands.push(node);
      } else if(node.type == SENTINEL) {
        operators.pop();
      } else if(node.type = PROPERTY) {
        operators.pop();
        var t1 = operands.pop(),
          t2 = operands.pop();
        node.parent = t2, node.child = t1;
        operands.push(node); 
      }
    }
  }
  function pushOperator(node){
    var node0;
    while ((node0 = operators.top()) && 
      comparePrecedence(node0,node)) {
      popOperator();
    }
    operators.push(node);
  }
  function isIdentifierStart(ch) {
    // this is faster than regEx, ofc...
    ch = ch.charCodeAt (0);
    return (ch === 36) || (ch === 95) || // $, _
        (ch >= 65 && ch <= 90) || // A...Z
        (ch >= 97 && ch <= 122); // a...z
  }
  function isIdentifierRest(ch) {
    ch = ch.charCodeAt(0);
    return (ch === 36) || (ch === 95) || // $, _
        (ch >= 65 && ch <= 90) || // A...Z
        (ch >= 97 && ch <= 122) || // a...z
        (ch >= 48 && ch <= 57); // 0...9
  }
  function next(c) {
    if (c && c !== ch) {
      error("Expected '" + c + "' instead of '" + ch + "'");
    }
    ch = text.charAt(at);
    at += 1;
    return ch;
  }
  function nextn(n) {
    while(n-->0) next();
  }
  function white() {
    while (ch && ch <= ' ') {
       next();
    }
  }
  function bool() {
// true, false, or null.
    if (text.substr(at-1, 4) == 'true') {
      nextn(4);
      return true
    }
    if (text.substr(at-1, 5) == 'false') {
      nextn(5);
      return true
    }
    if (text.substr(at-1, 4) == 'null') {
      nextn(4);
      return null
    }
    return -1
  }
  function number() {
    var number,
       string = '';

    while (ch >= '0' && ch <= '9') {
       string += ch;
       next();
    }
    if (ch === '.') {
      string += '.';
      while (next() && ch >= '0' && ch <= '9') {
        string += ch;
      }
    }
    if (ch === 'e' || ch === 'E') {
      string += 'e';
      next();
      if (ch === '-' || ch === '+') {
        string += ch;
        next();
      }
      while (ch >= '0' && ch <= '9') {
        string += ch;
        next();
      }
    }
    number = +string;
    if (isNaN(number)) {
      error("Bad number");
    } else {
      return number;
    }
  }
  function string() {
    var hex,
       i,
       string = '',
       uffff,
       q = (ch === '"' || ch === '\'') ? 
         ch : error('Bad String'); 
       
    if (ch === q) {
      while (next()) {
        if (ch === q) {
          next();
          return string;
        } else if (ch === '\\') {
          next();
          if (ch === 'u') {
            uffff = 0;
            for (i = 0; i < 4; i += 1) {
              hex = parseInt(next(), 16);
              if (!isFinite(hex)) {
                break;
              }
              uffff = uffff * 16 + hex;
            }
            string += String.fromCharCode(uffff);
          } else if (typeof escapee[ch] === 'string') {
            string += escapee[ch];
          } else {
            break;
          }
        } else {
          string += ch;
        }
      }
    }
    error("Bad string");
  }
  function constant() {
    var cnst, node;
    if (ch >= '0' && ch <= '9') {
      cnst = number();
    } else if (ch === '"' || ch === '\'') {
      cnst = string();
    } else if ((cnst = bool()) !== -1 )  {
      //
    } else {
      return false;
    }
    node = mkCnstNode(cnst);
    operands.push(node);
    return true;
  }
  function identifier() {
    if (isIdentifierStart(ch)) {
      var identifier = ch;
      next();
      while(isIdentifierRest(ch)) {
        identifier += ch;
        next();
      }
      operands.push({
        type: 'identifier',
        name: identifier
      });
      return true
    }
  }
  function property() {
    if (ch === '.') {
      operators.push({
        type: PROPERTY,
        computed: false,
        parent: null,
        child: null
      });
      next();
      if(identifier() === true) {
        return true;  
      } else {
        error('Bad property assignment.')
      }
    } else if (ch === '[') {
      next();
      white();
      operators.push({
        type: PROPERTY,
        computed: true,
        parent: null,
        child: null
      });
      operators.push(sentinel_op);
      expr();
      white();
      next(']')
      operators.pop();
      return true;
    } else {
      return false; 
    }
  }
  function object() {
    if (identifier() !== true) return false;
    while (property() === true) {
      popOperator();
    }
    return true;
  }
  function binaryOp() {
    var op, k = max_len_binary + 1;
    white();
    while(--k) {
      op = text.substr(at-1, k);
      if(binary_ops[op]) {
        break;  
      } else {
        op = null;
      }
    }
    if(!op) return false;
    nextn(op.length)
    var node = mkBinaryNode(op);
    pushOperator(node);
    return true;
  }
  function unaryOp() {
    var op, _op , k = max_len_unary + 1;
    white();
    while(--k) {
      op = text.substr(at-1, k);
      if(unary_ops[op]) {
        break;
      } else {
        op = null;
      }
    }
    if(!op) return false;
    nextn(op.length)
    var node = mkUnaryNode(op);
    pushOperator(node);
    return true;
  }
  function expr() {
    part();
    while(binaryOp() === true) {
      part();
    }
    while(operators.top() && 
      operators.top().type !== SENTINEL) {
      popOperator();
    }
  }
  function part() {
    white();
    if (constant() === true) return true;
    if (object() === true) return true;
    if (ch === '(') {
      next('(');
      white();
      operators.push(sentinel_op);
      expr();
      white();
      next(')')
      operators.pop();
      return true;
    } else if (unaryOp() === true) {
      return part();
    } else {
      error("Invalid expression part.");
    }
  }
  
  __parse = function(source) {
    text = source;
    ch = ' ';
    at = 0;
    operators = new Stack;
    operands = new Stack;
    white();
    operators.push(sentinel_op);
    expr()
    if(at < text.length+1) error('Error parssing expression.');
    var result = operands.pop()
    operators = null;
    operands = null;
    return result;
  }
  
   if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = __parse;
    }
    exports.parse_expr = __parse;
  } else {
    root.parse_expr = __parse;
  }
    
})(this);
