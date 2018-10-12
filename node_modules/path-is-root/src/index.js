const path = require('path')

module.exports = (p)=> {
  const parentPath = path.join(p, '../')

  return p === parentPath || parentPath === './'
}
