[![Build Status](https://img.shields.io/travis/rwu823/path-is-root.svg?branch=master)](https://travis-ci.org/rwu823/path-is-root) [![Coverage](https://img.shields.io/coveralls/rwu823/path-is-root.svg)](https://coveralls.io/github/rwu823/path-is-root)

# path-is-root

check if a path is root

## Install
```javascript
npm install --save path-is-root
```

## Usage
```javascript
import isRoot from 'path-is-root'
  
test('should be root path in Unix', assert => {
  assert.is(isRoot('/'), true)
})

test('should be not root path in Unix', assert => {
  assert.is(isRoot('/x'), false)
})

test('should be root path in Win', assert => {
  assert.is(isRoot('C:/'), true)
})

test('should be not root path in Win', assert => {
  assert.is(isRoot('C:/x'), false)
})
```

## API 

### isRoot(path)

Returns a boolean of whether the path is root
