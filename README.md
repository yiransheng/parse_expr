parse_expr
==========

A simple javaScript expression parser.

Supports javaScript binary and unary operators expect for '++' and '--'.

Supports dot and bracket memeber operation. 


## Example:

`parse_expr('a+b["x*x+y*y"]') ->`

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
      "type": "constant",
      "value": "x*x+y*y"
    }
  }
}
```
