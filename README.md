parse_expr
==========

A simple javaScript expression parser.

Supports javaScript binary and unary operators expect for '++' and '--'.

Supports dot and bracket memeber operation. 

`parse_expr('a+b[x*x+y*y]')  ->`

```
{
  "type": "binary",
  "operator": "+",
  "left": {
    "type": "identifier",
    "name": "a"
  },
  "right": {
    "type": "member",
    "computed": true,
    "parent": {
      "type": "identifier",
      "name": "b"
    },
    "child": {
      "type": "binary",
      "operator": "+",
      "left": {
        "type": "binary",
        "operator": "*",
        "left": {
          "type": "identifier",
          "name": "x"
        },
        "right": {
          "type": "identifier",
          "name": "x"
        }
      },
      "right": {
        "type": "binary",
        "operator": "*",
        "left": {
          "type": "identifier",
          "name": "y"
        },
        "right": {
          "type": "identifier",
          "name": "y"
        }
      }
    }
  }
}

```
